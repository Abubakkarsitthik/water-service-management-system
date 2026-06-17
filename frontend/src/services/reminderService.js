import api from './api';

const reminderService = {
  list: async (params = {}) => {
    const response = await api.get('/reminders/list', { params });
    return response.data;
  },

  generateWhatsAppLink: async (customerId, templateId = null) => {
    const params = { customer_id: customerId };
    if (templateId) params.template_id = templateId;
    const response = await api.post('/reminders/generate-whatsapp-link', null, { params });
    return response.data;
  },

  getTemplates: async () => {
    const response = await api.get('/reminders/templates');
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await api.post('/reminders/templates/create', data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await api.put(`/reminders/templates/update/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id) => {
    const response = await api.delete(`/reminders/templates/delete/${id}`);
    return response.data;
  },
};

export default reminderService;
