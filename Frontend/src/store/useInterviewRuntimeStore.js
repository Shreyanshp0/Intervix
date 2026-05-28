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

  enqueueAudio: (item) => set((state) => {
    // Prevent duplicate entries in audio queue by matching requestId or audioUrl
    const exists = state.audioQueue.some((x) => 
      (x.requestId && x.requestId === item.requestId) || 
      (x.audioUrl && x.audioUrl === item.audioUrl)
    );
    if (exists) {
      return state;
    }
    return { audioQueue: [...state.audioQueue, item] };
  }),
  dequeueAudio: () => {
    const queue = [...get().audioQueue];
    const next = queue.shift() || null;
    set({ audioQueue: queue });
    return next;
  },
  clearAudioQueue: () => set({ audioQueue: [], isAudioPlaying: false }),
  setAudioPlaying: (isAudioPlaying) => set({ isAudioPlaying }),

  hydrateFromSession: (session) => {
    if (!session) return;
    const current = get().session;

    // Prevent duplicate rehydration and sudden re-trigger loops
    if (
      current &&
      current._id === session._id &&
      current.transcriptVersion === session.transcriptVersion &&
      current.activePhase === session.activePhase &&
      current.aiState === session.aiState
    ) {
      return;
    }

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
