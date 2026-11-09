import axios from 'axios';
import { idempiereConfig } from '../config/idempiere';

const api = axios.create({
  baseURL: idempiereConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const notificationApi = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
};

