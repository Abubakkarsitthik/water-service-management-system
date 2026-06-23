import api from './api';

const reminderService = {
  getDueCustomers: (params) => api.get('/reminders/due', { params }).then(r => r.data),
  getHistory: (params) => api.get('/reminders/history', { params }).then(r => r.data),
  generateWhatsAppLink: (customerId, templateId) =>
    api.post('/reminders/generate-whatsapp-link', null, {
      params: { customer_id: customerId, ...(templateId ? { template_id: templateId } : {}) },
    }).then(r => r.data),
  getTemplates: () => api.get('/reminders/templates').then(r => r.data),
  createTemplate: (data) => api.post('/reminders/templates/create', data).then(r => r.data),
  updateTemplate: (id, data) => api.put(`/reminders/templates/update/${id}`, data).then(r => r.data),
  deleteTemplate: (id) => api.delete(`/reminders/templates/delete/${id}`).then(r => r.data),
};

export default reminderService;
