import api from './client';

export const aiApi = {
  chat: (message, history = []) =>
    api.post('/ai/chat', { message, history }, { timeout: 120000 }),
};
