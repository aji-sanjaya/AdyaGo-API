import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardApi, getCachedSidebarMenus } from '../api/dashboard';
import { notificationApi, getCachedNotifications } from '../api/notification';
import {
  ArrowLeft, LayoutDashboard, ShoppingCart, TrendingUp,
  Truck, Warehouse, RefreshCw, LogOut, ChevronRight, ChevronDown, Menu, X,
  Sun, Moon, Bell, User, FileText, Building2, Shield, Network,
  AlertTriangle, CheckCircle2, Info, ExternalLink, Clock, Loader2
} from 'lucide-react';

export default function ModuleLayout({ children, pageTitle = 'Dashboard', rootMenuId = 1000030, rootMenuName = 'Dashboard' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout, prepareSwitchRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const roleId = session?.roleId || session?.role_id;
  const user = session?.user;
  const contextDetails = session?.contextDetails;
  const clientName = contextDetails?.clientName || session?.clientName || 'Tenant';
  const roleName = contextDetails?.roleName || session?.roleName || 'Role';
  const orgName = contextDetails?.orgName || session?.orgName || 'Org';
  const warehouseName = contextDetails?.warehouseName || session?.warehouseName || '-';

  const clientId = session?.clientId || session?.client_id || 0;
  const userId =
    session?.user?.userId ||
    session?.user?.id ||
    session?.userId ||
    session?.user?.user_id ||
    session?.user?.ad_user_id ||
    0;
  const username = session?.user?.username || session?.credentials?.username || '';

  // Saved root menu ID from session storage or fallback prop
  const currentRootId = sessionStorage.getItem('selected_root_id') || rootMenuId;
  const currentRootName = sessionStorage.getItem('selected_root_name') || rootMenuName;

  const [sidebarGroups, setSidebarGroups] = useState(() => {
    if (roleId && currentRootId) {
      const cached = getCachedSidebarMenus(roleId, currentRootId);
      if (cached?.data) return cached.data;
      if (Array.isArray(cached)) return cached;
    }
    return [];
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingSidebar, setLoadingSidebar] = useState(() => {
    if (roleId && currentRootId) {
      const cached = getCachedSidebarMenus(roleId, currentRootId);
      if (cached) return false;
    }
    return false;
  });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);

  // Persistent sidebar collapsed/minimized state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('adyago_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('adyago_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Notification state initialized from cache if available
  const [notifications, setNotifications] = useState(() => {
    const cached = getCachedNotifications({ client_id: clientId, user_id: userId, username });
    return cached?.data?.notifications || [];
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = getCachedNotifications({ client_id: clientId, user_id: userId, username });
    return cached?.data?.total || cached?.data?.notifications?.length || 0;
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay}d ago`;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const fetchNotifications = async (force = false) => {
    if (!clientId || (!userId && !username)) return;

    if (!force) {
      const cached = getCachedNotifications({ client_id: clientId, user_id: userId, username });
      if (cached && cached.data) {
        setNotifications(cached.data.notifications || []);
        setUnreadCount(cached.data.total || (cached.data.notifications || []).length);
        return;
      }
    }

    setNotifLoading(true);
    try {
      const res = await notificationApi.getNotifications(
        {
          client_id: clientId,
          user_id: userId,
          username: username,
          limit: 30,
        },
        force
      );
      if (res && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.total || (res.data.notifications || []).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [clientId, userId, username]);

  // Close User & Notification Dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setNotifDropdownOpen(false);
        setMobileMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth < 1024) {
          setMobileMenuOpen((prev) => !prev);
        } else {
          toggleSidebar();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!roleId || !currentRootId) return;

    const cached = getCachedSidebarMenus(roleId, currentRootId);
    if (cached && cached.data) {
      setSidebarGroups(cached.data);
      setLoadingSidebar(false);
      return;
    }

    let isMounted = true;
    setLoadingSidebar(true);

    dashboardApi.getSidebarMenus(roleId, currentRootId)
      .then((res) => {
        if (!isMounted) return;
        setSidebarGroups(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load sidebar menus:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingSidebar(false);
      });

    return () => { isMounted = false; };
  }, [roleId, currentRootId]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSwitchRole = () => {
    const success = prepareSwitchRole();
    if (success) {
      navigate('/select-role');
    } else {
      logout();
      navigate('/login');
    }
  };

  const getSubmenuIcon = (name, path) => {
    const title = (name || '').toLowerCase();
    const p = (path || '').toLowerCase();

    if (title.includes('procure') || p.includes('procure')) return <ShoppingCart className="w-4 h-4" />;
    if (title.includes('pr') || p.includes('pr') || title.includes('requi')) return <FileText className="w-4 h-4" />;
    if (title.includes('sale') || p.includes('sale')) return <TrendingUp className="w-4 h-4" />;
    if (title.includes('deliv') || p.includes('deliv')) return <Truck className="w-4 h-4" />;
    if (title.includes('ware') || p.includes('ware')) return <Warehouse className="w-4 h-4" />;

    return <LayoutDashboard className="w-4 h-4" />;
  };

  // Fallback items if API returns empty
  const defaultItems = [
    { id: 1000001, name: 'Procurement', path: '/procurement-dashboard' },
    { id: 1000027, name: 'Sales', path: '/sales-dashboard' },
    { id: 1000028, name: 'Delivery', path: '/delivery-dashboard' },
    { id: 1000029, name: 'Warehouse', path: '/warehouse-dashboard' },
  ];

  const groupsToRender = (sidebarGroups.length > 0)
    ? sidebarGroups
    : [
        {
          group_id: 1,
          group_name: currentRootName,
          items: defaultItems,
        },
      ];

  const totalItemsCount = groupsToRender.reduce(
    (sum, g) => sum + (g.items?.length || 0),
    0
  );

  // Submenu collapse/uncollapse state map: { [groupId]: boolean }
  const [openSubmenus, setOpenSubmenus] = useState({});

  const toggleSubmenu = (groupId) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isSubmenuOpen = (groupId) => {
    if (openSubmenus[groupId] !== undefined) {
      return openSubmenus[groupId];
    }
    return true; // Expanded by default so user immediately sees active links
  };

  // Auto-expand any group that contains the active route on mount or location change
  useEffect(() => {
    if (!groupsToRender || groupsToRender.length === 0) return;

    setOpenSubmenus((prev) => {
      const next = { ...prev };
      groupsToRender.forEach((group) => {
        const hasActive = group.items?.some((child) => {
          const cur = '/' + location.pathname.replace(/^\/+/, '');
          const target = '/' + (child.path || '').replace(/^\/+/, '');
          return cur === target || (target !== '/' && cur.startsWith(target + '/'));
        });

        if (hasActive) {
          next[group.group_id] = true;
        } else if (next[group.group_id] === undefined) {
          next[group.group_id] = true;
        }
      });
      return next;
    });
  }, [sidebarGroups, location.pathname]);

  return (
    <div className={`min-h-screen w-full flex transition-colors duration-300 font-['Plus_Jakarta_Sans',sans-serif] ${
      isDark ? 'bg-[#080c14] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileMenuOpen
            ? 'translate-x-0'
            : sidebarCollapsed
            ? '-translate-x-full'
            : '-translate-x-full lg:translate-x-0'
        } ${
          isDark
            ? 'bg-slate-900/95 border-r border-slate-800/80 shadow-[10px_0_30px_rgba(0,0,0,0.5)]'
            : 'bg-white/95 border-r border-slate-200/90 shadow-lg shadow-slate-200/50'
        } backdrop-blur-2xl`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto p-4 space-y-6">
          {/* Logo & Portal Link */}
          <div className={`flex items-center justify-between pb-3.5 border-b ${
            isDark ? 'border-slate-800/60' : 'border-slate-200'
          }`}>
            <div
              onClick={() => navigate('/home')}
              className="flex items-center gap-3 cursor-pointer group"
              title="Return to Portal Home"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 flex-shrink-0 bg-white border border-slate-200/80 p-0.5 group-hover:scale-105 transition-transform">
                <img
                  src="/apple-touch-icon.png"
                  alt="AdyaGo Logo"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div>
                <h1 className={`text-base font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AdyaGo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">ERP</span>
                </h1>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {currentRootName.toUpperCase()} MODULE
                </span>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Back to Portal Button */}
          <button
            onClick={() => navigate('/home')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer group ${
              isDark
                ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-indigo-950/40 hover:border-indigo-500/40 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1 text-cyan-500" />
            <span>Back to Portal Home</span>
          </button>

          {/* Module Navigation Group */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className={`text-[11px] font-mono font-bold tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentRootName} Menus
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                {totalItemsCount} Active
              </span>
            </div>

            <nav className="space-y-2">
              {groupsToRender.map((group) => {
                const hasChildren = Array.isArray(group.items) && group.items.length > 0;
                const isOpen = isSubmenuOpen(group.group_id);

                // Check if any child inside this group matches current URL
                const hasActiveChild = hasChildren && group.items.some((child) => {
                  const cur = '/' + location.pathname.replace(/^\/+/, '');
                  const target = '/' + (child.path || '').replace(/^\/+/, '');
                  return cur === target || (target !== '/' && cur.startsWith(target + '/'));
                });

                if (hasChildren) {
                  return (
                    <div key={group.group_id} className="space-y-1">
                      {/* Submenu Parent Button (Collapsible) */}
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(group.group_id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer select-none group ${
                          hasActiveChild
                            ? isDark
                              ? 'text-cyan-300 bg-slate-800/80 border border-slate-700/80 shadow-sm'
                              : 'text-indigo-700 bg-indigo-50/70 border border-indigo-200/80'
                            : isDark
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                              hasActiveChild
                                ? isDark
                                  ? 'text-cyan-400 bg-cyan-950/60'
                                  : 'text-indigo-600 bg-indigo-100'
                                : 'text-slate-400 group-hover:text-cyan-400'
                            }`}
                          >
                            {getSubmenuIcon(group.group_name)}
                          </div>
                          <span className="truncate font-semibold">{group.group_name}</span>
                        </div>

                        {/* ARROW: Only rendered on submenus that HAVE children */}
                        <ChevronDown
                          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                            isOpen
                              ? 'rotate-180 text-cyan-400'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                      </button>

                      {/* Submenu Children Items (Level Terbawah) */}
                      {isOpen && (
                        <div
                          className={`mt-1 space-y-1 ml-4 pl-3 border-l transition-all duration-200 ${
                            isDark ? 'border-slate-800/80' : 'border-slate-200'
                          }`}
                        >
                          {group.items.map((child) => {
                            const cur = '/' + location.pathname.replace(/^\/+/, '');
                            const target = '/' + (child.path || '').replace(/^\/+/, '');
                            const isChildActive =
                              cur === target || (target !== '/' && cur.startsWith(target + '/'));

                            return (
                              <NavLink
                                key={child.id}
                                to={child.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition group cursor-pointer ${
                                  isChildActive
                                    ? isDark
                                      ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                                    : isDark
                                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                              >
                                {/* Active / Inactive bullet indicator */}
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                                    isChildActive
                                      ? 'bg-cyan-400 ring-2 ring-cyan-500/30'
                                      : 'bg-slate-600 group-hover:bg-slate-400'
                                  }`}
                                />
                                <span className="truncate">{child.name}</span>
                                {/* NOTE: NO right arrow (ChevronRight) for children / level terbawah */}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Simple direct menu item without children (Leaf)
                const cur = '/' + location.pathname.replace(/^\/+/, '');
                const target = '/' + (group.path || '').replace(/^\/+/, '');
                const isLeafActive = cur === target;

                return (
                  <NavLink
                    key={group.group_id}
                    to={group.path || '#'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group cursor-pointer ${
                      isLeafActive
                        ? isDark
                          ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                        isLeafActive
                          ? isDark
                            ? 'text-cyan-400 bg-cyan-950/60'
                            : 'text-indigo-600 bg-indigo-100'
                          : 'text-slate-400 group-hover:text-cyan-400'
                      }`}
                    >
                      {getSubmenuIcon(group.group_name)}
                    </div>
                    <span className="truncate">{group.group_name}</span>
                    {/* NOTE: NO right arrow for leaf menu */}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchRole}
              title="Switch Role"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700 hover:text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 shadow-sm'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Switch Role</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer border ${
                isDark
                  ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border-rose-500/40'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-sm'
              }`}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-clip transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-72'
        }`}
      >
        {/* Top Floating Navbar */}
        <header
          className={`sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-3 border-b backdrop-blur-xl transition-all duration-300 w-full min-w-0 ${
            isDark
              ? 'bg-slate-900/80 border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
              : 'bg-white/85 border-slate-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
            {/* Sidebar Minimize / Expand Button (3 horizontal lines) */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileMenuOpen((prev) => !prev);
                } else {
                  toggleSidebar();
                }
              }}
              title={sidebarCollapsed ? 'Expand Side Menu (Ctrl+B)' : 'Minimize Side Menu (Ctrl+B)'}
              aria-label="Toggle Side Menu"
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center flex-shrink-0 ${
                sidebarCollapsed
                  ? isDark
                    ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40 hover:bg-cyan-900/50'
                    : 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                  : isDark
                  ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-700 border-slate-700 hover:text-white'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:text-slate-900'
              }`}
            >
              <Menu className="w-5 h-5 transition-transform duration-200" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
                <span className="hover:text-cyan-400 cursor-pointer hidden sm:inline" onClick={() => navigate('/home')}>Portal</span>
                <span className="hidden sm:inline">/</span>
                <span className="text-slate-300 truncate">{currentRootName}</span>
                <span>/</span>
                <span className="text-cyan-500 font-semibold truncate">{pageTitle}</span>
              </div>
              <h2 className={`text-sm sm:text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {pageTitle}
              </h2>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              onClick={toggleTheme}
              type="button"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-700 border-slate-700 hover:text-white'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:text-slate-900'
              }`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-90 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12 duration-300" />
              )}
            </button>

            {/* Notification Bell with Dropdown Panel */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifDropdownOpen((prev) => !prev);
                  setUserDropdownOpen(false);
                }}
                title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                aria-expanded={notifDropdownOpen}
                aria-haspopup="true"
                className={`relative p-2 rounded-xl border transition cursor-pointer select-none ${
                  notifDropdownOpen
                    ? isDark
                      ? 'bg-slate-800 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/15 ring-2 ring-cyan-500/20'
                      : 'bg-white border-indigo-400 text-slate-900 shadow-md ring-2 ring-indigo-500/20'
                    : isDark
                    ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-700 border-slate-700 hover:text-white'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:text-slate-900'
                }`}
              >
                <Bell className={`w-4 h-4 transition-colors ${unreadCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-500/40" />
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notifDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden z-50 animate-fadeIn backdrop-blur-2xl transition-all font-mono ${
                    isDark
                      ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
                      : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
                  }`}
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold tracking-tight">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={fetchNotifications}
                      disabled={notifLoading}
                      title="Refresh notifications"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${notifLoading ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>

                  {/* Notification List Body */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifLoading && notifications.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                        <span>Loading notifications...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
                        <span className="font-semibold text-slate-300">All caught up!</span>
                        <span className="text-[11px] text-slate-500">No unread notifications recorded.</span>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isError =
                          (n.textmsg && n.textmsg.toLowerCase().includes('error')) ||
                          (n.reference && n.reference.toLowerCase().includes('error'));
                        const titleText =
                          n.description ||
                          (n.textmsg ? n.textmsg.split('\n')[0] : '') ||
                          n.reference ||
                          `Note #${n.ad_note_id}`;

                        return (
                          <div
                            key={n.ad_note_id}
                            className={`p-3.5 transition-colors text-left flex gap-3 ${
                              isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                                  isError
                                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                                    : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400'
                                }`}
                              >
                                {isError ? (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                ) : (
                                  <Info className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="text-[11px] font-bold tracking-tight line-clamp-1">
                                  {titleText}
                                </h5>
                                <span className="text-[9px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                  {formatRelativeTime(n.created)}
                                </span>
                              </div>

                              {n.textmsg && (
                                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                                  {n.textmsg}
                                </p>
                              )}

                              {n.reference && (
                                <div className="pt-0.5">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono border max-w-full truncate ${
                                      isDark
                                        ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                                        : 'bg-slate-100 border-slate-200 text-slate-700'
                                    }`}
                                    title={n.reference}
                                  >
                                    {n.reference}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Showing {notifications.length} of {unreadCount} notes</span>
                      <span className="text-[9px] font-semibold text-cyan-400">Unprocessed</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Button with Context & Actions Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                title={`Signed in as ${user?.name || user?.username || 'User'}`}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
                  userDropdownOpen
                    ? isDark
                      ? 'bg-slate-800 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/15 ring-2 ring-cyan-500/20'
                      : 'bg-white border-indigo-400 text-slate-900 shadow-md ring-2 ring-indigo-500/20'
                    : isDark
                    ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="hidden md:inline font-mono text-[11px] max-w-[130px] truncate text-left">
                  {user?.name || user?.username || 'User'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    userDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-4 z-50 animate-fadeIn backdrop-blur-2xl transition-all font-mono ${
                    isDark
                      ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
                      : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
                  }`}
                >
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold truncate">
                        {user?.name || user?.username || 'User'}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {user?.email || user?.username || 'Active Account'}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    </div>
                  </div>

                  {/* Active Context Details Section */}
                  <div className="py-3 space-y-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Active Context</span>
                      <span className="text-[9px] text-cyan-400 font-semibold">iDempiere Core</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Tenant / Client */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] ${
                          isDark
                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="text-slate-400 text-[10px]">Client:</span>
                          <span className="font-bold truncate">{clientName}</span>
                        </div>
                      </div>

                      {/* Role */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] ${
                          isDark
                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="text-slate-400 text-[10px]">Role:</span>
                          <span className="font-bold truncate">{roleName}</span>
                        </div>
                      </div>

                      {/* Organization */}
                      <div
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] ${
                          isDark
                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Network className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="text-slate-400 text-[10px]">Org:</span>
                          <span className="font-bold truncate">{orgName}</span>
                        </div>
                      </div>

                      {/* Warehouse (if present) */}
                      {warehouseName && warehouseName !== '-' && (
                        <div
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] ${
                            isDark
                              ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Warehouse className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="text-slate-400 text-[10px]">Warehouse:</span>
                            <span className="font-bold truncate">{warehouseName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Switch Role & Sign Out */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleSwitchRole();
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Switch Role</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isDark
                          ? 'bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border-rose-500/30 hover:border-rose-500/50'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full min-w-0 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

