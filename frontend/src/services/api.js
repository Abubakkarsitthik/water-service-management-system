import axios from 'axios';

// With Vite proxy configured, /api requests are proxied to http://127.0.0.1:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor — attach JWT token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('serviceiq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — on 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired — force logout
      localStorage.removeItem('serviceiq_token');
      localStorage.removeItem('serviceiq_user');
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    if (!error.response) {
      console.warn('⚠️ Backend unavailable — API request failed:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;
