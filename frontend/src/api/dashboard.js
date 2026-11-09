import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  getSidebarMenus: async (roleId, rootId) => {
    const response = await api.get('/menus/sidebar', {
      params: { role_id: roleId, root_id: rootId }
    });
    return response.data;
  }
};

