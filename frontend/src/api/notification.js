import axios from 'axios';
import { idempiereConfig } from '../config/idempiere';

const api = axios.create({
  baseURL: idempiereConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const NOTIF_CACHE_TTL = 60 * 1000; // 60 seconds
let notificationCache = {
  key: '',
  timestamp: 0,
  data: null,
};
let notificationPromise = null;

export const getCachedNotifications = (params = {}) => {
  const cacheKey = `${params.client_id || ''}_${params.user_id || ''}_${params.username || ''}`;
  if (
    notificationCache.key === cacheKey &&
    Date.now() - notificationCache.timestamp < NOTIF_CACHE_TTL &&
    notificationCache.data
  ) {
    return notificationCache.data;
  }
  return null;
};

export const clearNotificationCache = () => {
  notificationCache = { key: '', timestamp: 0, data: null };
  notificationPromise = null;
};

export const notificationApi = {
  getNotifications: async (params = {}, forceRefresh = false) => {
    const cacheKey = `${params.client_id || ''}_${params.user_id || ''}_${params.username || ''}`;
    const now = Date.now();

    if (
      !forceRefresh &&
      notificationCache.key === cacheKey &&
      now - notificationCache.timestamp < NOTIF_CACHE_TTL &&
      notificationCache.data
    ) {
      return notificationCache.data;
    }

    if (!forceRefresh && notificationPromise) {
      return notificationPromise;
    }

    notificationPromise = api
      .get('/notifications', { params })
      .then((response) => {
        notificationCache = {
          key: cacheKey,
          timestamp: Date.now(),
          data: response.data,
        };
        notificationPromise = null;
        return response.data;
      })
      .catch((err) => {
        notificationPromise = null;
        throw err;
      });

    return notificationPromise;
  },
};
