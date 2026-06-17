import api from './api';

const reportService = {
  getCustomerReport: async (params = {}) => {
    const response = await api.get('/reports/customers', { params });
    return response.data;
  },

  getServiceReport: async (params = {}) => {
    const response = await api.get('/reports/services', { params });
    return response.data;
  },

  getTechnicianReport: async (params = {}) => {
    const response = await api.get('/reports/technicians', { params });
    return response.data;
  },

  getDueServiceReport: async (params = {}) => {
    const response = await api.get('/reports/due-services', { params });
    return response.data;
  },

  downloadCSV: async (type, params = {}) => {
    const response = await api.get(`/reports/${type}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default reportService;
