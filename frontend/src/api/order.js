import axios from 'axios';
import { idempiereConfig } from '../config/idempiere';

const api = axios.create({
  baseURL: idempiereConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  const cacheKey = `${params.client_id || ''}_${params.org_id || ''}_${params.role_id || ''}`;
  return masterOptionsCache.get(cacheKey) || null;
};

export const clearMasterOptionsCache = () => {
  masterOptionsCache.clear();
  masterOptionsPromises.clear();
  inflightRequests.clear();
};

export const orderApi = {
  getOrders: async (params = {}) => {
    return dedupedGet('/orders', { params });
  },

  getOrderDetail: async (id) => {
    return dedupedGet(`/orders/${id}`);
  },

  getOrderLines: async (id) => {
    return dedupedGet(`/orders/${id}/lines`);
  },

  getMasterOptions: async (params = {}, forceRefresh = false) => {
    const cacheKey = `${params.client_id || ''}_${params.org_id || ''}_${params.role_id || ''}`;
    if (!forceRefresh && masterOptionsCache.has(cacheKey)) {
      return masterOptionsCache.get(cacheKey);
    }
    if (!forceRefresh && masterOptionsPromises.has(cacheKey)) {
      return masterOptionsPromises.get(cacheKey);
    }

    const fetchPromise = api
      .get('/orders/options', { params })
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

  getVendors: async (params = {}) => {
    return dedupedGet('/orders/vendors', { params });
  },

  getContacts: async (bpartnerId, search = '') => {
    return dedupedGet('/orders/contacts', { params: { bpartner_id: bpartnerId, search } });
  },

  getProducts: async (params = {}) => {
    return dedupedGet('/orders/products', { params });
  },

  getCharges: async (params = {}) => {
    return dedupedGet('/orders/charges', { params });
  },

  getRequisitionLines: async (params = {}) => {
    return dedupedGet('/orders/requisition-lines', { params });
  },

  getRequisitionLineDetail: async (id, params = {}) => {
    return dedupedGet(`/orders/requisition-line/${id}`, { params });
  },

  createOrder: async (data, params = {}, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post('/orders', data, { params, headers });
    return response.data;
  },

  updateOrder: async (id, data, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put(`/orders/${id}`, data, { headers });
    return response.data;
  },

  deleteOrder: async (id, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete(`/orders/${id}`, { headers });
    return response.data;
  },

  createOrderLine: async (id, data, params = {}, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post(`/orders/${id}/lines`, data, { params, headers });
    return response.data;
  },

  updateOrderLine: async (id, lineId, data, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.put(`/orders/${id}/lines/${lineId}`, data, { headers });
    return response.data;
  },

  deleteOrderLine: async (id, lineId, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete(`/orders/${id}/lines/${lineId}`, { headers });
    return response.data;
  },

  processOrder: async (id, docAction, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.post(`/orders/${id}/process`, { doc_action: docAction }, { headers });
    return response.data;
  },

  getAttachments: async (id) => {
    return dedupedGet(`/orders/${id}/attachments`);
  },

  uploadAttachment: async (id, file, token = '') => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await api.post(`/orders/${id}/attachments`, formData, { headers });
    return response.data;
  },

  deleteAttachment: async (id, filename, token = '') => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.delete(`/orders/${id}/attachments/${encodeURIComponent(filename)}`, { headers });
    return response.data;
  },

  getAttachmentDownloadUrl: (id, filename, download = false) => {
    return `${idempiereConfig.api.baseUrl}/orders/${id}/attachments/${encodeURIComponent(filename)}${download ? '?download=true' : ''}`;
  },

  getChat: async (id) => {
    return dedupedGet(`/orders/${id}/chat`);
  },

  sendChatMessage: async (id, message, file = null, clientID = 0, userID = 0, token = '') => {
    const formData = new FormData();
    if (message) formData.append('message', message);
    if (file) formData.append('image', file);
    if (clientID) formData.append('client_id', String(clientID));
    if (userID) formData.append('user_id', String(userID));
    const headers = {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await api.post(`/orders/${id}/chat`, formData, { headers });
    return response.data;
  },

  getChatAttachmentUrl: (chatEntryId, filename) => {
    return `${idempiereConfig.api.baseUrl}/orders/chat/attachments/${chatEntryId}/${encodeURIComponent(filename)}`;
  },

  getChangeLogs: async (id) => {
    return dedupedGet(`/orders/${id}/changelogs`);
  },

  getLinkedRequisitions: async (id) => {
    return dedupedGet(`/orders/${id}/requisitions`);
  },

  getLinkedReceipts: async (id) => {
    return dedupedGet(`/orders/${id}/receipts`);
  },
};
