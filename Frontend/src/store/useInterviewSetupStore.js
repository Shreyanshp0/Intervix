import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useInterviewSetupStore = create(
  persist(
    (set) => ({
      sessionId: null,
      latestReportId: null,
      sessionSnapshot: null,
      config: {
        mode: '',
        topic: '',
        customTopic: '',
        difficulty: 'Medium',
        experienceLevel: 'Intermediate',
        style: 'Friendly',
        duration: 15,
      },

      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
      setSessionId: (sessionId) => set({ sessionId }),
      setLatestReportId: (latestReportId) => set({ latestReportId }),
      setSessionSnapshot: (sessionSnapshot) => set({ sessionSnapshot }),

      resetConfig: () =>
        set({
          sessionId: null,
          latestReportId: null,
          sessionSnapshot: null,
          config: {
            mode: '',
            topic: '',
            customTopic: '',
            difficulty: 'Medium',
            experienceLevel: 'Intermediate',
            style: 'Friendly',
            duration: 15,
          },
        }),
    }),
    {
      name: 'interview-setup-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        latestReportId: state.latestReportId,
        sessionSnapshot: state.sessionSnapshot,
        config: state.config,
      }),
    }
  )
);
