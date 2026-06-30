import axios from 'axios';

// Get API URL from env, default to local port 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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
  async generate(payload) {
    const response = await api.post('/api/flashcards/generate', payload);
    return response.data;
  },

  async uploadDocument(formData, onUploadProgress) {
    const response = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress
    });
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

  async renameSet(setId, title) {
    const response = await api.put(`/api/flashcards/set/${setId}`, { title });
    return response.data;
  },

  async deleteSet(setId) {
    const response = await api.delete(`/api/flashcards/set/${setId}`);
    return response.data;
  },

  async addCard(setId, cardData) {
    const response = await api.post(`/api/flashcards/set/${setId}/card`, cardData);
    return response.data;
  },

  async editCard(setId, cardId, cardData) {
    const response = await api.put(`/api/flashcards/set/${setId}/card/${cardId}`, cardData);
    return response.data;
  },

  async deleteCard(setId, cardId) {
    const response = await api.delete(`/api/flashcards/set/${setId}/card/${cardId}`);
    return response.data;
  },
};

export default api;
