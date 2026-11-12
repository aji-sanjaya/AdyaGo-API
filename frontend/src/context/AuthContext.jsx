import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { idempiereConfig } from '../config/idempiere';
import { clearSidebarMenuCache } from '../api/dashboard';
import { clearNotificationCache } from '../api/notification';
import { clearMasterOptionsCache } from '../api/requisition';
import { clearMasterOptionsCache as clearOrderMasterOptionsCache } from '../api/order';

const AuthContext = createContext(null);

const SESSION_KEY = idempiereConfig.storage.sessionKey;
const LEGACY_SESSION_KEY = idempiereConfig.storage.legacySessionKey;
const TEMP_AUTH_KEY = idempiereConfig.storage.tempAuthKey;
const LEGACY_TEMP_AUTH_KEY = idempiereConfig.storage.legacyTempAuthKey;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const saved =
        localStorage.getItem(SESSION_KEY) ||
        sessionStorage.getItem(SESSION_KEY) ||
        localStorage.getItem(LEGACY_SESSION_KEY) ||
        sessionStorage.getItem(LEGACY_SESSION_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed) {
        const uId =
          parsed.userId ||
          parsed.user?.userId ||
          parsed.user?.id ||
          parsed.user?.ad_user_id ||
          0;
        if (uId > 0) {
          parsed.userId = uId;
          if (parsed.user) {
            parsed.user.id = uId;
            parsed.user.userId = uId;
          }
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [tempAuth, setTempAuth] = useState(() => {
    try {
      const saved =
        sessionStorage.getItem(TEMP_AUTH_KEY) ||
        sessionStorage.getItem(LEGACY_TEMP_AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authorizedPaths, setAuthorizedPaths] = useState(() => {
    try {
      if (session?.roleId === undefined || session?.roleId === null) return [];
      const cached = sessionStorage.getItem(`authorized_paths_${session.roleId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Sync and fetch authorized menu permissions whenever active roleId changes
  useEffect(() => {
    let isMounted = true;
    const roleId = session?.roleId;

    if (roleId === undefined || roleId === null || roleId === '') {
      setAuthorizedPaths([]);
      return;
    }

    const cacheKey = `authorized_paths_${roleId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAuthorizedPaths(parsed);
        }
      } catch {}
    }

    setPermissionsLoading(true);
    authApi
      .getAuthorizedPaths(roleId)
      .then((res) => {
        if (!isMounted) return;
        const paths = (res?.data || []).map((p) => String(p).toLowerCase().trim());
        setAuthorizedPaths(paths);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(paths));
        } catch {}
      })
      .catch((err) => {
        console.error('Failed to load authorized menu permissions:', err);
      })
      .finally(() => {
        if (isMounted) setPermissionsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.roleId]);

  const hasMenuPermission = (pathname) => {
    if (!pathname) return false;
    const cleanPath = pathname.toLowerCase().split('?')[0].replace(/\/+$/, '') || '/';
    // Always permit public / universal dashboard landing routes
    if (['/home', '/dashboard', '/', '/login', '/select-role'].includes(cleanPath)) {
      return true;
    }

    // Role 0 (System Administrator) has full universal menu access
    if (session?.roleId === 0 || session?.roleId === '0') {
      return true;
    }

    // If permissions not yet loaded or empty
    if (!authorizedPaths || authorizedPaths.length === 0) {
      return false;
    }

    // Direct exact match
    if (authorizedPaths.includes(cleanPath)) {
      return true;
    }

    // Subpath match (e.g. /create-po/new or /create-pr/new matches /create-po or /create-pr)
    return authorizedPaths.some((p) => cleanPath.startsWith(p + '/'));
  };

  // Step 1: Initial Login
  const login = async (username, password, remember = true) => {
    const res = await authApi.login(username, password, remember);
    const resolvedUserId = res.user?.id || res.user?.userId || res.userId || 0;
    const userData = res.user
      ? { ...res.user, id: resolvedUserId, userId: resolvedUserId }
      : res.user;

    const data = {
      user: userData,
      userId: resolvedUserId,
      token: res.token,
      credentials: { username, password },
      remember,
    };
    setTempAuth(data);
    sessionStorage.setItem(TEMP_AUTH_KEY, JSON.stringify(data));
    return data;
  };

  // Step 2: Final Context Selection
  const selectContext = async ({ clientId, roleId, orgId, warehouseId, clientName, roleName, orgName, warehouseName }) => {
    if (!tempAuth?.credentials) {
      throw new Error('Session credentials not found. Please sign in again.');
    }

    const res = await authApi.selectContext({
      username: tempAuth.credentials.username,
      password: tempAuth.credentials.password,
      clientId,
      roleId,
      orgId,
      warehouseId,
    });

    const resolvedUserId =
      res.userId ||
      res.user?.userId ||
      res.user?.id ||
      tempAuth?.user?.userId ||
      tempAuth?.user?.id ||
      tempAuth?.userId ||
      0;

    const fullSession = {
      ...res,
      userId: resolvedUserId,
      user: {
        ...(tempAuth?.user || {}),
        ...(res.user || {}),
        id: resolvedUserId,
        userId: resolvedUserId,
      },
      contextDetails: {
        clientName: clientName || String(clientId),
        roleName: roleName || String(roleId),
        orgName: orgName || (orgId === '0' || orgId === 0 ? '* (All)' : String(orgId)),
        warehouseName: warehouseName || '-',
      },
      // Keep credentials in memory/sessionStorage for switching roles
      credentials: tempAuth.credentials,
    };

    setSession(fullSession);
    const storage = tempAuth.remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(fullSession));
    return fullSession;
  };

  const logout = () => {
    clearSidebarMenuCache();
    clearNotificationCache();
    clearMasterOptionsCache();
    clearOrderMasterOptionsCache();
    if (session?.roleId !== undefined && session?.roleId !== null) {
      sessionStorage.removeItem(`authorized_paths_${session.roleId}`);
    }
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TEMP_AUTH_KEY);
    setSession(null);
    setTempAuth(null);
    setAuthorizedPaths([]);
  };

  const prepareSwitchRole = () => {
    if (session?.credentials && session?.user) {
      const data = {
        user: session.user,
        token: session.token,
        credentials: session.credentials,
        remember: true,
      };
      setTempAuth(data);
      sessionStorage.setItem(TEMP_AUTH_KEY, JSON.stringify(data));
      return true;
    }
    return false;
  };

  const refreshTokenWithPassword = async (password) => {
    const username = session?.user?.username || session?.credentials?.username;
    if (!username) {
      throw new Error('Active session user not found. Please sign in again.');
    }
    const clientId = session.clientId;
    const roleId = session.roleId;
    const orgId = session.orgId;
    const warehouseId = session.warehouseId;

    const res = await authApi.selectContext({
      username,
      password,
      clientId,
      roleId,
      orgId,
      warehouseId,
    });

    if (res?.token) {
      const updated = {
        ...session,
        token: res.token,
        credentials: { username, password },
      };
      setSession(updated);
      const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(updated));
      return res.token;
    }
    throw new Error('Failed to retrieve fresh session token from iDempiere.');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session?.token,
        session,
        tempAuth,
        authorizedPaths,
        permissionsLoading,
        hasMenuPermission,
        login,
        selectContext,
        logout,
        prepareSwitchRole,
        refreshTokenWithPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

