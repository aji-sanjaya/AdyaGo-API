import axios from 'axios';
import { idempiereConfig } from '../config/idempiere';

const api = axios.create({
  baseURL: idempiereConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const sidebarMenuCache = new Map();
const sidebarMenuPromises = new Map();

export const getCachedSidebarMenus = (roleId, rootId) => {
  const cacheKey = `${roleId}_${rootId}`;
  return sidebarMenuCache.get(cacheKey) || null;
};

export const clearSidebarMenuCache = () => {
  sidebarMenuCache.clear();
  sidebarMenuPromises.clear();
};

export const dashboardApi = {
  getProcurementDashboard: async (clientId, orgId) => {
    const params = {};
    if (clientId) params.client_id = clientId;
    if (orgId) params.org_id = orgId;
    const response = await api.get('/dashboard/procurement', { params });
    return response.data;
  },

  getSalesDashboard: async (clientId, orgId) => {
    const params = {};
    if (clientId) params.client_id = clientId;
    if (orgId) params.org_id = orgId;
    const response = await api.get('/dashboard/sales', { params });
    return response.data;
  },

  getDeliveryDashboard: async (clientId, orgId) => {
    const params = {};
    if (clientId) params.client_id = clientId;
    if (orgId) params.org_id = orgId;
    const response = await api.get('/dashboard/delivery', { params });
    return response.data;
  },

  getWarehouseDashboard: async (clientId, orgId) => {
    const params = {};
    if (clientId) params.client_id = clientId;
    if (orgId) params.org_id = orgId;
    const response = await api.get('/dashboard/warehouse', { params });
    return response.data;
  },

  getSidebarMenus: async (roleId, rootId, forceRefresh = false) => {
    const cacheKey = `${roleId}_${rootId}`;
    if (!forceRefresh && sidebarMenuCache.has(cacheKey)) {
      return sidebarMenuCache.get(cacheKey);
    }
    if (!forceRefresh && sidebarMenuPromises.has(cacheKey)) {
      return sidebarMenuPromises.get(cacheKey);
    }

    const fetchPromise = api.get('/menus/sidebar', {
      params: { role_id: roleId, root_id: rootId }
    })
      .then((response) => {
        sidebarMenuCache.set(cacheKey, response.data);
        sidebarMenuPromises.delete(cacheKey);
        return response.data;
      })
      .catch((err) => {
        sidebarMenuPromises.delete(cacheKey);
        throw err;
      });

    sidebarMenuPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }
};
