import { create } from 'zustand';
import api from '../services/api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  toasts: [], // Renders in-flight animated alerts

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/api/notifications');
      set({ 
        notifications: response.data?.notifications || [], 
        unreadCount: response.data?.unreadCount || 0,
        loading: false 
      });
    } catch (error) {
      console.error('[NotificationStore] Failed to load notifications:', error);
      set({ loading: false });
    }
  },

  addNotification: (item) => {
    set((state) => {
      // Prevent duplicates
      if (state.notifications.some((n) => String(n._id) === String(item._id))) {
        return state;
      }
      return {
        notifications: [item, ...state.notifications],
        unreadCount: state.unreadCount + (item.read ? 0 : 1)
      };
    });

    // Also trigger toast popup!
    get().addToast({
      title: item.title,
      message: item.message,
      type: item.type,
      metadata: item.metadata
    });
  },

  markRead: async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) => 
          String(n._id) === String(id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('[NotificationStore] Failed to mark notification read:', error);
    }
  },

  markAllRead: async () => {
    try {
      await api.post('/api/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('[NotificationStore] Failed to mark all read:', error);
    }
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }));
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  }
}));
