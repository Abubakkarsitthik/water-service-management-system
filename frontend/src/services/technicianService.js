import api from './api';

const technicianService = {
  list: async (params = {}) => {
    const response = await api.get('/technicians/list', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/technicians/create', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/technicians/update/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/technicians/delete/${id}`);
    return response.data;
  },

  getServices: async (id, params = {}) => {
    const response = await api.get(`/technicians/${id}/services`, { params });
    return response.data;
  },
};

export default technicianService;
