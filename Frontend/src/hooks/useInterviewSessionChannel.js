import { useEffect, useMemo, useRef } from 'react';
import { connectSocket } from '../services/socket';
import { useInterviewRuntimeStore } from '../store/useInterviewRuntimeStore';

export const useInterviewSessionChannel = ({ sessionId, tabId, onCompleted, onAudioReady, onAudioInterrupted }) => {
  const hydrateFromSession = useInterviewRuntimeStore((state) => state.hydrateFromSession);
  const setTimerSeconds = useInterviewRuntimeStore((state) => state.setTimerSeconds);
  const setAiState = useInterviewRuntimeStore((state) => state.setAiState);
  const setActivePhase = useInterviewRuntimeStore((state) => state.setActivePhase);
  const setConnectionState = useInterviewRuntimeStore((state) => state.setConnectionState);
  const setAutosaveStatus = useInterviewRuntimeStore((state) => state.setAutosaveStatus);
  const setLastSavedAt = useInterviewRuntimeStore((state) => state.setLastSavedAt);
  const setRecoveryMessage = useInterviewRuntimeStore((state) => state.setRecoveryMessage);

  const onCompletedRef = useRef(onCompleted);
  const onAudioReadyRef = useRef(onAudioReady);
  const onAudioInterruptedRef = useRef(onAudioInterrupted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onAudioReadyRef.current = onAudioReady;
    onAudioInterruptedRef.current = onAudioInterrupted;
  });

  const socket = useMemo(() => connectSocket(), []);

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }

    const handleConnect = () => {
      setConnectionState('connected');
      socket.emit('interview:join', { sessionId, tabId });
      socket.emit('interview:heartbeat', { sessionId, tabId });
    };

    const handleDisconnect = () => {
      setConnectionState('disconnected');
      setRecoveryMessage('Connection lost. Reconnecting to your live interview...');
    };

    const handleState = (payload) => {
      if (payload?.session?._id !== sessionId) {
        return;
      }

      hydrateFromSession(payload.session);
      setRecoveryMessage('');
    };

    const handleRecovered = (payload) => {
      if (payload?.session?._id !== sessionId) {
        return;
      }

      hydrateFromSession(payload.session);
      setConnectionState('recovered');
      setRecoveryMessage('Interview restored from the server snapshot.');
    };

    const handleTimer = (payload) => {
      if (payload?.sessionId !== sessionId) {
        return;
      }

      setTimerSeconds(payload.remainingSeconds || 0);
    };

    const handlePhase = (payload) => {
      if (payload?.sessionId !== sessionId) {
        return;
      }

      if (payload.aiState) {
        setAiState(payload.aiState);
      }

      if (payload.activePhase) {
        setActivePhase(payload.activePhase);
      }
    };

    const handleAutosaved = (payload) => {
      if (payload?.sessionId !== sessionId) {
        return;
      }

      setAutosaveStatus('saved');
      setLastSavedAt(payload.savedAt);
    };

    const handleCompleted = (payload) => {
      if (payload?.session?._id !== sessionId) {
        return;
      }

      hydrateFromSession(payload.session);
      onCompletedRef.current?.(payload.session);
    };

    const handleAudioReady = (payload) => {
      onAudioReadyRef.current?.(payload);
    };

    const handleAudioInterrupted = (payload) => {
      onAudioInterruptedRef.current?.(payload);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('interview:state', handleState);
    socket.on('interview:recovered', handleRecovered);
    socket.on('interview:timer', handleTimer);
    socket.on('interview:phase', handlePhase);
    socket.on('interview:autosaved', handleAutosaved);
    socket.on('interview:completed', handleCompleted);
    socket.on('interview:audio_ready', handleAudioReady);
    socket.on('interview:audio_interrupted', handleAudioInterrupted);

    if (socket.connected) {
      handleConnect();
    }

    const heartbeat = window.setInterval(() => {
      if (socket.connected) {
        socket.emit('interview:heartbeat', { sessionId, tabId });
      }
    }, 15000);

    return () => {
      window.clearInterval(heartbeat);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('interview:state', handleState);
      socket.off('interview:recovered', handleRecovered);
      socket.off('interview:timer', handleTimer);
      socket.off('interview:phase', handlePhase);
      socket.off('interview:autosaved', handleAutosaved);
      socket.off('interview:completed', handleCompleted);
      socket.off('interview:audio_ready', handleAudioReady);
      socket.off('interview:audio_interrupted', handleAudioInterrupted);
    };
  }, [
    sessionId,
    socket,
    tabId,
    hydrateFromSession,
    setTimerSeconds,
    setAiState,
    setActivePhase,
    setConnectionState,
    setAutosaveStatus,
    setLastSavedAt,
    setRecoveryMessage,
  ]);

  return socket;
};
