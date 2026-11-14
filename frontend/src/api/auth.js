import api from './client';

export const authApi = {
  // Step 1: Initial Login
  login: async (username, password, remember = false) => {
    const res = await api.post('/auth/login', { username, password, remember });
    return res.data;
  },

  // Lookup data for Context Selection
  getClients: async () => {
    const res = await api.get('/auth/clients');
    return res.data;
  },

  getRoles: async (userId, clientId) => {
    const res = await api.get('/auth/roles', {
      params: { user_id: userId, client_id: clientId },
    });
    return res.data;
  },

  getOrgs: async (userId, clientId, roleId) => {
    const res = await api.get('/auth/orgs', {
      params: { user_id: userId, client_id: clientId, role_id: roleId },
    });
    return res.data;
  },

  getWarehouses: async (roleId, orgId) => {
    const res = await api.get('/auth/warehouses', {
      params: { role_id: roleId, org_id: orgId },
    });
    return res.data;
  },

  // Step 2: Final Context Login
  selectContext: async ({ username, password, clientId, roleId, orgId, warehouseId }) => {
    const res = await api.post('/auth/select-context', {
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
    const res = await api.get('/menus', {
      params: { role_id: roleId },
    });
    return res.data;
  },

  // Authorized Menu Paths for Permission Checking
  getAuthorizedPaths: async (roleId) => {
    const res = await api.get('/menus/authorized-paths', {
      params: { role_id: roleId },
    });
    return res.data;
  },
};


