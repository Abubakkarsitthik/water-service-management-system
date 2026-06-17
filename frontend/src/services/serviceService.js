import api from './api';

const serviceService = {
  list: async (params = {}) => {
    const response = await api.get('/services/list', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/services/create', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/services/update/${id}`, data);
    return response.data;
  },

  complete: async (id, data = {}) => {
    const response = await api.patch(`/services/complete/${id}`, data);
    return response.data;
  },

  getHistory: async (customerId) => {
    const response = await api.get(`/services/history/${customerId}`);
    return response.data;
  },
};

export default serviceService;
