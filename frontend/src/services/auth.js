import api from './api';

export const authService = {
  // Регистрация
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Логин
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  // Получить текущего пользователя
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Выход
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Проверить авторизацию
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};