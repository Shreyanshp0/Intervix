import { create } from 'zustand';
import api from '../services/api';

const tokenKey = 'token';

export const getPortalHome = (user) => {
  if (!user) return '/login';
  if (user.role === 'recruiter') {
    return user.onboardingCompleted ? '/recruiter/dashboard' : '/recruiter/company';
  }
  return user.onboardingCompleted ? '/candidate/dashboard' : '/candidate/profile';
};

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem(tokenKey),
  isLoading: false,
  isBootstrapping: false,

  bootstrapAuth: async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
      return null;
    }

    set({ isBootstrapping: true });
    try {
      const response = await api.get('/auth/me');
      const { user } = response.data;
      set({
        user,
        isAuthenticated: true,
        isBootstrapping: false
      });
      return user;
    } catch {
      localStorage.removeItem(tokenKey);
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
      return null;
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;

      localStorage.setItem(tokenKey, token);
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });

      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;

      localStorage.setItem(tokenKey, token);
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });

      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem(tokenKey);
    set({ user: null, isAuthenticated: false });
  }
}));
