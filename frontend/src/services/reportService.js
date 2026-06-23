import api from './api';

const reportService = {
  getCustomerReport: (params) => api.get('/reports/customers', { params }).then(r => r.data),
  getDueServiceReport: (params) => api.get('/reports/due-services', { params }).then(r => r.data),
  getReminderReport: (params) => api.get('/reports/reminders', { params }).then(r => r.data),

  downloadExcel: (type) => {
    return api.get(`/reports/${type}`, {
      params: { format: 'excel' },
      responseType: 'blob',
    }).then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `${type}_report_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },
};

export default reportService;
