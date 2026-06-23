import api from './api';

const customerService = {
  list: (params) => api.get('/customers/list', { params }).then(r => r.data),
  get: (id) => api.get(`/customers/details/${id}`).then(r => r.data),
  create: (data) => api.post('/customers/create', data).then(r => r.data),
  update: (id, data) => api.put(`/customers/update/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/customers/delete/${id}`).then(r => r.data),
  completeService: (id) => api.post(`/customers/complete-service/${id}`).then(r => r.data),
  importCustomers: (rows) => api.post('/customers/import', rows).then(r => r.data),
  exportCustomers: (params) => {
    // Download Excel file
    return api.get('/customers/export', {
      params,
      responseType: 'blob',
    }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `customers_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },
};

export default customerService;
