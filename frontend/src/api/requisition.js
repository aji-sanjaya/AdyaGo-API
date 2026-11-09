import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const requisitionApi = {
  getRequisitions: async (params = {}) => {
    const response = await api.get('/requisitions', { params });
    return response.data;
  },

  getRequisitionDetail: async (id) => {
    const response = await api.get(`/requisitions/${id}`);
    return response.data;
  },

  getRequisitionLines: async (id) => {
    const response = await api.get(`/requisitions/${id}/lines`);
    return response.data;
  },

  getMasterOptions: async (params = {}) => {
    const response = await api.get('/requisitions/options', { params });
    return response.data;
  },

  searchProducts: async (params = {}) => {
    const response = await api.get('/requisitions/products', { params });
    return response.data;
  },

  createRequisition: async (data, params = {}, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post('/requisitions', data, { params, headers });
    return response.data;
  },

  updateRequisition: async (id, data, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put(`/requisitions/${id}`, data, { headers });
    return response.data;
  },

  createRequisitionLine: async (id, data, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post(`/requisitions/${id}/lines`, data, { headers });
    return response.data;
  },

  updateRequisitionLine: async (id, lineId, data, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put(`/requisitions/${id}/lines/${lineId}`, data, { headers });
    return response.data;
  },

  deleteRequisitionLine: async (id, lineId, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete(`/requisitions/${id}/lines/${lineId}`, { headers });
    return response.data;
  },

  processRequisition: async (id, docAction, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post(`/requisitions/${id}/process`, { doc_action: docAction }, { headers });
    return response.data;
  },

  deleteRequisition: async (id, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete(`/requisitions/${id}`, { headers });
    return response.data;
  },

  getAttachments: async (id) => {
    const response = await api.get(`/requisitions/${id}/attachments`);
    return response.data;
  },

  uploadAttachment: async (id, file, token = '') => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await api.post(`/requisitions/${id}/attachments`, formData, { headers });
    return response.data;
  },

  deleteAttachment: async (id, filename, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete(`/requisitions/${id}/attachments/${encodeURIComponent(filename)}`, { headers });
    return response.data;
  },

  getAttachmentDownloadUrl: (id, filename, download = false) => {
    return `http://localhost:8080/api/v1/requisitions/${id}/attachments/${encodeURIComponent(filename)}${download ? '?download=true' : ''}`;
  },

  getChat: async (id) => {
    const response = await api.get(`/requisitions/${id}/chat`);
    return response.data;
  },

  sendChatMessage: async (id, message, file = null, token = '') => {
    const formData = new FormData();
    if (message) formData.append('message', message);
    if (file) formData.append('image', file);
    const headers = {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await api.post(`/requisitions/${id}/chat`, formData, { headers });
    return response.data;
  },

  getChatAttachmentUrl: (chatEntryId, filename) => {
    return `http://localhost:8080/api/v1/requisitions/chat/attachments/${chatEntryId}/${encodeURIComponent(filename)}`;
  },

  getChangeLogs: async (id) => {
    const response = await api.get(`/requisitions/${id}/changelogs`);
    return response.data;
  },

  getOrders: async (id) => {
    const response = await api.get(`/requisitions/${id}/orders`);
    return response.data;
  },
};

