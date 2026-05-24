import { create } from 'zustand';

export const useInterviewRuntimeStore = create((set, get) => ({
  session: null,
  messages: [],
  timerSeconds: 0,
  aiState: 'idle',
  activePhase: 'pending',
  connectionState: 'disconnected',
  autosaveStatus: 'idle',
  lastSavedAt: null,
  recoveryMessage: '',
  audioQueue: [],
  isAudioPlaying: false,

  setSession: (session) =>
    set({
      session,
      timerSeconds: session?.remainingSeconds || 0,
      aiState: session?.aiState || 'idle',
      activePhase: session?.activePhase || 'pending',
    }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTimerSeconds: (timerSeconds) => set((state) => (state.timerSeconds === timerSeconds ? state : { timerSeconds })),
  setAiState: (aiState) => set((state) => (state.aiState === aiState ? state : { aiState })),
  setActivePhase: (activePhase) => set((state) => (state.activePhase === activePhase ? state : { activePhase })),
  setConnectionState: (connectionState) => set((state) => (state.connectionState === connectionState ? state : { connectionState })),
  setRecoveryMessage: (recoveryMessage) => set((state) => (state.recoveryMessage === recoveryMessage ? state : { recoveryMessage })),
  setAutosaveStatus: (autosaveStatus) => set((state) => (state.autosaveStatus === autosaveStatus ? state : { autosaveStatus })),
  setLastSavedAt: (lastSavedAt) => set((state) => (state.lastSavedAt === lastSavedAt ? state : { lastSavedAt })),

  enqueueAudio: (item) => set((state) => ({ audioQueue: [...state.audioQueue, item] })),
  dequeueAudio: () => {
    const queue = [...get().audioQueue];
    const next = queue.shift() || null;
    set({ audioQueue: queue });
    return next;
  },
  clearAudioQueue: () => set({ audioQueue: [], isAudioPlaying: false }),
  setAudioPlaying: (isAudioPlaying) => set({ isAudioPlaying }),

  hydrateFromSession: (session) => {
    const transcriptMessages = (session?.transcript || []).flatMap((entry, index) => {
      const items = [
        {
          id: `q-${index}-${entry.askedAt || index}`,
          role: 'interviewer',
          content: entry.question,
        },
      ];

      if (entry.answer) {
        items.push({
          id: `a-${index}-${entry.answeredAt || index}`,
          role: 'user',
          content: entry.answer,
        });
      }

      return items;
    });

    set({
      session,
      messages: transcriptMessages,
      timerSeconds: session?.remainingSeconds || 0,
      aiState: session?.aiState || 'idle',
      activePhase: session?.activePhase || 'pending',
    });
  },

  resetRuntime: () =>
    set({
      session: null,
      messages: [],
      timerSeconds: 0,
      aiState: 'idle',
      activePhase: 'pending',
      connectionState: 'disconnected',
      autosaveStatus: 'idle',
      lastSavedAt: null,
      recoveryMessage: '',
      audioQueue: [],
      isAudioPlaying: false,
    }),
}));
