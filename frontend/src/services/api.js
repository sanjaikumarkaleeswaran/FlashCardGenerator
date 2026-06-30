import axios from 'axios';

// Get API URL from env, default to local port 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token in Authorization header
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

export const authService = {
  async register(email, password) {
    const response = await api.post('/api/register', { email, password });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/api/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  async me() {
    const response = await api.get('/api/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
};

export const flashcardService = {
  async generate(notes) {
    const response = await api.post('/api/flashcards/generate', { notes });
    return response.data;
  },

  async list() {
    const response = await api.get('/api/flashcards');
    return response.data;
  },

  async getReviewQueue() {
    const response = await api.get('/api/review');
    return response.data;
  },

  async updateReviewStatus(cardId, status) {
    const response = await api.post('/api/review/update', { cardId, status });
    return response.data;
  },
};

export default api;
