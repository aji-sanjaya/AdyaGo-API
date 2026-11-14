import axios from 'axios';
import { idempiereConfig } from '../config/idempiere';

const SESSION_KEY = idempiereConfig.storage.sessionKey;
const LEGACY_SESSION_KEY = idempiereConfig.storage.legacySessionKey;

// Helper to retrieve active token from storage
export function getActiveSessionToken() {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) ||
      sessionStorage.getItem(SESSION_KEY) ||
      localStorage.getItem(LEGACY_SESSION_KEY) ||
      sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.token || '';
  } catch {
    return '';
  }
}

// Centralized Axios instance with secure defaults
const api = axios.create({
  baseURL: idempiereConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Automatically injects Bearer token into all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = getActiveSessionToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catches 401 Unauthorized for centralized session timeout handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not redirect if user is already on login or context selection pages
      const currentPath = window.location.pathname;
      const isAuthFlow =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/select-role');

      if (!isAuthFlow) {
        console.warn('[AdyaGo Auth] Session expired or unauthorized (HTTP 401).');
        // Dispatch custom event for application components (e.g., ReauthModal or redirect)
        window.dispatchEvent(
          new CustomEvent('adyago:session_expired', {
            detail: { error: error.response?.data },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;

