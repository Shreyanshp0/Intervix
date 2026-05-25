import { create } from 'zustand';
import api from '../services/api';
import { API_ROUTES } from '../constants/apiRoutes';

export const useResumeStore = create((set) => ({
  resume: null,
  hasResume: false,
  isLoading: false,
  isUploading: false,
  error: null,
  uploadProgress: 0,

  fetchMyResume: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(API_ROUTES.resume.me);
      set({
        resume: data.resume,
        hasResume: data.hasResume,
        isLoading: false
      });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch resume', isLoading: false });
    }
  },

  uploadResume: async (file) => {
    set({ isUploading: true, error: null, uploadProgress: 0 });
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const { data } = await api.post(API_ROUTES.resume.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ uploadProgress: percentCompleted });
        }
      });
      
      set({
        resume: data.resume,
        hasResume: true,
        isUploading: false,
        uploadProgress: 100
      });
      
      return data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Upload failed. Please try again.',
        isUploading: false,
        uploadProgress: 0
      });
      throw error;
    }
  },

  deleteResume: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(API_ROUTES.resume.me);
      set({
        resume: null,
        hasResume: false,
        isLoading: false
      });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to delete resume', isLoading: false });
    }
  },

  resetError: () => set({ error: null })
}));