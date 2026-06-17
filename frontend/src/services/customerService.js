import api from './api';

const customerService = {
  list: async (params = {}) => {
    const response = await api.get('/customers/list', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/customers/details/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/customers/create', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/customers/update/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/customers/delete/${id}`);
    return response.data;
  },
};

export default customerService;
