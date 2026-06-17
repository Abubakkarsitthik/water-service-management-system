import api from './api';

const serviceTypeService = {
  list: async (params = {}) => {
    const response = await api.get('/service-types/list', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/service-types/create', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/service-types/update/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/service-types/delete/${id}`);
    return response.data;
  },
};

export default serviceTypeService;
