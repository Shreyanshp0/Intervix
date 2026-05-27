import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  // Tab states
  activeProblemTab: 'problem', // 'problem' | 'submissions'
  activeRightTab: 'ai',        // 'ai' | 'resume' | 'participants' | 'notes' | 'chat'
  
  // Editor preferences
  editorFontSize: 14,
  editorTheme: 'vs-dark',
  isFullscreen: false,

  // Floating states
  handRaised: false,
  participants: [], // List of connected participant objects
  
  // Recruiter specific notes
  recruiterNotes: '',

  // Centralized participants media presence
  participantsMedia: {
    candidate: { cameraEnabled: true, micEnabled: true, screenSharing: false, handRaised: false },
    recruiter: { cameraEnabled: true, micEnabled: true, screenSharing: false, handRaised: false }
  },

  // Setters
  setProblemTab: (tab) => set({ activeProblemTab: tab }),
  setRightTab: (tab) => set({ activeRightTab: tab }),
  setFontSize: (size) => set({ editorFontSize: Math.max(10, Math.min(30, size)) }),
  setTheme: (theme) => set({ editorTheme: theme }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  
  setHandRaised: (raised) => set({ handRaised: raised }),
  setParticipants: (list) => set({ participants: list }),
  updateNotes: (notes) => set({ recruiterNotes: notes }),
  
  setParticipantMedia: (role, mediaState) => set((state) => ({
    participantsMedia: {
      ...state.participantsMedia,
      [role]: {
        ...state.participantsMedia[role],
        ...mediaState
      }
    }
  })),

  // Actions to reset
  resetRoomUi: () => set({
    activeProblemTab: 'problem',
    activeRightTab: 'ai',
    editorFontSize: 14,
    editorTheme: 'vs-dark',
    isFullscreen: false,
    handRaised: false,
    participants: [],
    recruiterNotes: '',
    participantsMedia: {
      candidate: { cameraEnabled: true, micEnabled: true, screenSharing: false, handRaised: false },
      recruiter: { cameraEnabled: true, micEnabled: true, screenSharing: false, handRaised: false }
    }
  })
}));
