import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const authApi = {
  // Step 1: Initial Login
  login: async (username, password, remember = false) => {
    const res = await apiClient.post('/auth/login', { username, password, remember });
    return res.data;
  },

  // Lookup data for Context Selection
  getClients: async () => {
    const res = await apiClient.get('/auth/clients');
    return res.data;
  },

  getRoles: async (userId, clientId) => {
    const res = await apiClient.get('/auth/roles', {
      params: { user_id: userId, client_id: clientId },
    });
    return res.data;
  },

  getOrgs: async (userId, clientId, roleId) => {
    const res = await apiClient.get('/auth/orgs', {
      params: { user_id: userId, client_id: clientId, role_id: roleId },
    });
    return res.data;
  },

  getWarehouses: async (roleId, orgId) => {
    const res = await apiClient.get('/auth/warehouses', {
      params: { role_id: roleId, org_id: orgId },
    });
    return res.data;
  },

  // Step 2: Final Context Login
  selectContext: async ({ username, password, clientId, roleId, orgId, warehouseId }) => {
    const res = await apiClient.post('/auth/select-context', {
      username,
      password,
      client_id: parseInt(clientId),
      role_id: parseInt(roleId),
      org_id: parseInt(orgId),
      warehouse_id: warehouseId ? parseInt(warehouseId) : null,
    });
    return res.data;
  },

  // Main Menu / Home items
  getWelcomeMenus: async (roleId) => {
    const res = await apiClient.get('/menus', {
      params: { role_id: roleId },
    });
    return res.data;
  },
};

