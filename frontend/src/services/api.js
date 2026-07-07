import axios from 'axios';

// Get API URL from env, default to local port 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
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

// Response interceptor to handle token expiration & rotating token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // If refresh token validation fails, log out completely
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, log out completely
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
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
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    return response.data;
  },

  async me() {
    const response = await api.get('/api/me');
    return response.data;
  },

  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.error("Logout request failed:", e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
};

export const settingsService = {
  async getSettings() {
    const response = await api.get('/api/settings');
    return response.data;
  },

  async updateSettings(settings) {
    const response = await api.put('/api/settings', settings);
    return response.data;
  },

  async listModels() {
    const response = await api.get('/api/models');
    return response.data;
  },

  async addCustomPrompt(name, instruction) {
    const response = await api.post('/api/settings/prompts', { name, instruction });
    return response.data;
  },

  async deleteCustomPrompt(promptId) {
    const response = await api.delete(`/api/settings/prompts/${promptId}`);
    return response.data;
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

  async listDocuments() {
    const response = await api.get('/api/documents');
    return response.data;
  },

  async deleteDocument(docId) {
    const response = await api.delete(`/api/documents/${docId}`);
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

  async updateReviewSM2(cardId, quality) {
    const response = await api.post('/api/review/sm2-update', { cardId, quality });
    return response.data;
  },

  async exportSetCsv(setId) {
    const response = await api.get(`/api/export/flashcards?setId=${setId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async listSubjects() {
    const response = await api.get('/api/subjects');
    return response.data;
  },

  // SM-2 Forecast & Leech Analytics
  async getForecast() {
    const response = await api.get('/api/forecast');
    return response.data;
  },

  async getLeechCards() {
    const response = await api.get('/api/leech');
    return response.data;
  },

  async getAnalytics() {
    const response = await api.get('/api/analytics');
    return response.data;
  },

  // Bulk operations
  async importCsv(payload) {
    const response = await api.post('/api/import', payload);
    return response.data;
  },

  async resetDeckProgress(setId) {
    const response = await api.post(`/api/flashcards/reset-deck/${setId}`);
    return response.data;
  },

  async resetCardProgress(setId, cardId) {
    const response = await api.post(`/api/flashcards/reset-card/${setId}/${cardId}`);
    return response.data;
  },

  async resetGlobalProgress() {
    const response = await api.post('/api/flashcards/reset-global');
    return response.data;
  },

  async batchOperations(payload) {
    const response = await api.post('/api/flashcards/batch', payload);
    return response.data;
  },
};

export default api;
