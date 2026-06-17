import api from './api';

const settingsService = {
  get: async () => {
    const response = await api.get('/settings/');
    return response.data;
  },

  update: async (data) => {
    const response = await api.put('/settings/update', data);
    return response.data;
  },
};

export default settingsService;
