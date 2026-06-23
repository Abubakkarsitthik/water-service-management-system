import api from './api';

const dashboardService = {
  getStats: () => api.get('/dashboard/stats').then(r => r.data),
};

export default dashboardService;
