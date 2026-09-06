/**
 * API Client for PlantGuard AI
 * Centralized API calls with authentication
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  
  register: (name, email, password, role = 'OPERATOR') =>
    api.post('/auth/register', { name, email, password, role }),
  
  me: () => api.get('/auth/me'),
};

// Factory APIs
export const factoryAPI = {
  getAll: () => api.get('/factories'),
  getById: (id) => api.get(`/factories/${id}`),
  create: (data) => api.post('/factories', data),
  update: (id, data) => api.put(`/factories/${id}`, data),
  delete: (id) => api.delete(`/factories/${id}`),
};

// Plant APIs
export const plantAPI = {
  getAll: () => api.get('/plants'),
  getById: (id) => api.get(`/plants/${id}`),
  create: (data) => api.post('/plants', data),
  update: (id, data) => api.put(`/plants/${id}`, data),
  delete: (id) => api.delete(`/plants/${id}`),
};

// Machine APIs
export const machineAPI = {
  getAll: () => api.get('/machines'),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
};

// Sensor APIs
export const sensorAPI = {
  getReadings: (machineId, limit = 50) =>
    api.get(`/sensors/machine/${machineId}`, { params: { limit } }),
  addReading: (data) => api.post('/sensors', data),
};

// AI APIs
export const aiAPI = {
  analyze: (machineId, includeRisk = true) =>
    api.get(`/ai/analyze/${machineId}`, { params: { includeRisk } }),
};

// Simulation APIs
export const simulationAPI = {
  whatIf: (machineId, modifications, options = {}) =>
    api.post('/simulation/what-if', { machineId, modifications, options }),
  
  whatIfAI: (machineId, modifications, options = {}) =>
    api.post('/simulation/what-if-ai', { machineId, modifications, options }),
  
  scenarios: (machineId, scenarios, options = {}) =>
    api.post('/simulation/scenarios', { machineId, scenarios, options }),
};

export default api;
