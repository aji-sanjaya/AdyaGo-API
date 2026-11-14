import api, { getActiveSessionToken } from './client';
import { idempiereConfig } from '../config/idempiere';

const inflightRequests = new Map();

const dedupedGet = async (url, options = {}) => {
  const cacheKey = `${url}_${JSON.stringify(options.params || {})}`;
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  const promise = api
    .get(url, options)
    .then((res) => {
      inflightRequests.delete(cacheKey);
      return res.data;
    })
    .catch((err) => {
      inflightRequests.delete(cacheKey);
      throw err;
    });

  inflightRequests.set(cacheKey, promise);
  return promise;
};

const masterOptionsCache = new Map();
const masterOptionsPromises = new Map();

export const getCachedMasterOptions = (params = {}) => {
  const cacheKey = `${params.client_id || ''}_${params.org_id || ''}`;
  return masterOptionsCache.get(cacheKey) || null;
};

export const clearMasterOptionsCache = () => {
  masterOptionsCache.clear();
  masterOptionsPromises.clear();
  inflightRequests.clear();
};

export const requisitionApi = {
  getRequisitions: async (params = {}) => {
    return dedupedGet('/requisitions', { params });
  },

  getRequisitionDetail: async (id) => {
    return dedupedGet(`/requisitions/${id}`);
  },

  getRequisitionLines: async (id) => {
    return dedupedGet(`/requisitions/${id}/lines`);
  },

  getRequisitionCounts: async (id) => {
    return dedupedGet(`/requisitions/${id}/counts`);
  },

  getMasterOptions: async (params = {}, forceRefresh = false) => {
    const cacheKey = `${params.client_id || ''}_${params.org_id || ''}`;
    if (!forceRefresh && masterOptionsCache.has(cacheKey)) {
      return masterOptionsCache.get(cacheKey);
    }
    if (!forceRefresh && masterOptionsPromises.has(cacheKey)) {
      return masterOptionsPromises.get(cacheKey);
    }

    const fetchPromise = api
      .get('/requisitions/options', { params })
      .then((response) => {
        masterOptionsCache.set(cacheKey, response.data);
        masterOptionsPromises.delete(cacheKey);
        return response.data;
      })
      .catch((err) => {
        masterOptionsPromises.delete(cacheKey);
        throw err;
      });

    masterOptionsPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  },

  searchProducts: async (params = {}) => {
    return dedupedGet('/requisitions/products', { params });
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
    return dedupedGet(`/requisitions/${id}/attachments`);
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
    const token = getActiveSessionToken();
    const query = [
      download ? 'download=true' : '',
      token ? `token=${encodeURIComponent(token)}` : '',
    ].filter(Boolean).join('&');
    return `${idempiereConfig.api.baseUrl}/requisitions/${id}/attachments/${encodeURIComponent(filename)}${query ? `?${query}` : ''}`;
  },

  getChat: async (id) => {
    return dedupedGet(`/requisitions/${id}/chat`);
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
    return `${idempiereConfig.api.baseUrl}/requisitions/chat/attachments/${chatEntryId}/${encodeURIComponent(filename)}`;
  },

  getChangeLogs: async (id) => {
    return dedupedGet(`/requisitions/${id}/changelogs`);
  },

  getOrders: async (id) => {
    return dedupedGet(`/requisitions/${id}/orders`);
  },
};
