import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ShieldCheck, Square, Volume2, Wifi, WifiOff } from 'lucide-react';
import { useInterviewSetupStore } from '../../store/useInterviewSetupStore';
import { useInterviewRuntimeStore } from '../../store/useInterviewRuntimeStore';
import { useInterviewSessionChannel } from '../../hooks/useInterviewSessionChannel';
import { connectSocket } from '../../services/socket';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';

const normalizeDifficulty = (difficulty) => (difficulty || 'medium').toLowerCase();

const WaveformVisualizer = ({ isActive }) => (
  <div className="flex items-center justify-center gap-1.5 h-16">
    {[...Array(20)].map((_, index) => (
      <motion.div
        key={index}
        className="w-2 rounded-full bg-primary"
        animate={isActive ? { height: ['20%', '100%', '20%'] } : { height: '20%' }}
        transition={{ duration: 0.8, repeat: Infinity, delay: index * 0.05, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

const generateTabId = () => `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const AIVoiceInterview = () => {
  const navigate = useNavigate();
  const [tabId] = useState(generateTabId);
  const { config, sessionId, setSessionId, setLatestReportId, setSessionSnapshot } = useInterviewSetupStore();
  const { session, timerSeconds, connectionState, recoveryMessage, hydrateFromSession, enqueueAudio, dequeueAudio, clearAudioQueue, setAudioPlaying, isAudioPlaying } = useInterviewRuntimeStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryPayload, setRetryPayload] = useState(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const socket = useMemo(() => connectSocket(), []);

  const resolveVoiceErrorMessage = (error) => {
    const stage = error?.response?.data?.stage;
    const defaultMessage = error?.response?.data?.error || error?.response?.data?.message || 'Voice processing failed. Please try again.';

    const stageMessageMap = {
      upload_received: 'Audio upload failed. Please retry recording.',
      transcription_started: 'Voice transcription failed. Please retry or type your response.',
      transcription_completed: 'Voice transcription failed. Please retry or type your response.',
      ai_processing_started: 'AI is temporarily unavailable. Please retry in a moment.',
      ai_processing_completed: 'AI processing failed. Please retry in a moment.',
      tts_started: 'Speech generation is unavailable. Continuing in text-only mode.',
      tts_completed: 'Speech generation is unavailable. Continuing in text-only mode.',
    };

    return stage ? (stageMessageMap[stage] || defaultMessage) : defaultMessage;
  };

  const onAudioInterrupted = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    clearAudioQueue();
  };

  const onAudioReady = (payload) => {
    if (payload?.sessionId !== sessionId) {
      return;
    }
    enqueueAudio(payload);
  };

  const goToReport = (sessionData) => {
    setLatestReportId(sessionData._id);
    setSessionSnapshot(sessionData);
    navigate(`/candidate/interview/report/${sessionData._id}`);
  };

  useInterviewSessionChannel({
    sessionId,
    tabId,
    onCompleted: goToReport,
    onAudioReady,
    onAudioInterrupted,
  });

  useEffect(() => {
    if (!config?.mode) {
      navigate('/candidate/interview/setup');
    }
  }, [config, navigate]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await api.get('/interviews/active');
        if (response.data?.session && response.data.session.mode === 'voice' && response.data.session.status === 'active') {
          setSessionId(response.data.session._id);
          setSessionSnapshot(response.data.session);
          hydrateFromSession(response.data.session);
          setTranscript(response.data.session.currentQuestion || '');
          setHasStarted(true);
        }
      } catch (error) {
        console.error('Failed to restore active voice session:', error);
      }
    };

    if (!hasStarted && !sessionId) {
      void bootstrap();
    }
  }, [hasStarted, sessionId, hydrateFromSession, setSessionId, setSessionSnapshot]);

  useEffect(() => {
    const playNext = async () => {
      if (isAudioPlaying || !sessionId) {
        return;
      }

      const next = dequeueAudio();
      if (!next?.audioUrl) {
        return;
      }

      try {
        setAudioPlaying(true);
        const baseUrl = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
        const audio = new Audio(`${baseUrl}${next.audioUrl}`);
        audioRef.current = audio;
        audio.onended = () => setAudioPlaying(false);
        await audio.play();
      } catch (error) {
        console.error('Failed to play audio:', error);
        setAudioPlaying(false);
      }
    };

    void playNext();
  }, [sessionId, isAudioPlaying, dequeueAudio, setAudioPlaying]);

  const startInterview = async () => {
    setErrorMessage('');

    try {
      const topic = config.topic === 'custom' ? config.customTopic : config.topic;
      const payload = {
        mode: config.mode,
        topic,
        difficulty: normalizeDifficulty(config.difficulty),
        experienceLevel: config.experienceLevel || 'Intermediate',
        interviewType: config.interviewType || 'technical',
        style: config.style || 'Friendly',
        duration: config.duration || 15,
      };

      const response = await api.post('/interviews/start', payload);
      setSessionId(response.data.session._id);
      setSessionSnapshot(response.data.session);
      hydrateFromSession(response.data.session);
      setTranscript(response.data.firstQuestion);
      setHasStarted(true);

      const speechResponse = await api.post('/voice/speak', { text: response.data.firstQuestion });
      if (speechResponse.data?.audioUrl) {
        enqueueAudio({ sessionId: response.data.session._id, audioUrl: speechResponse.data.audioUrl });
      }
    } catch (error) {
      console.error('Start Interview Error:', error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || 'Failed to start voice interview.');
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      if (audioRef.current) {
        audioRef.current.pause();
      }
      socket.emit('interview:speech_interrupt', { sessionId });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('Listening...');
    } catch (error) {
      console.error('Unable to access microphone:', error);
      if (error?.name === 'NotAllowedError') {
        setErrorMessage('Microphone permission is required for voice interviews.');
      } else if (error?.name === 'NotFoundError') {
        setErrorMessage('No microphone detected. Please connect an audio device.');
      } else {
        setErrorMessage('Unable to access the microphone. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      return;
    }

    setIsRecording(false);
    setIsSubmitting(true);
    setTranscript('Processing response...');
    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
      mediaRecorder.stop();
    });

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (!audioBlob.size) {
        setErrorMessage('No audio captured. Please record again.');
        return;
      }
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audio', audioBlob, 'recording.webm');

      setRetryPayload({ sessionId, audioBlob, mimeType: audioBlob.type || 'audio/webm' });

      const response = await api.post('/voice/respond', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTranscript(response.data.question || 'Processing complete.');
      if (response.data.session) {
        setSessionSnapshot(response.data.session);
        hydrateFromSession(response.data.session);
      }
      if (response.data.completed || !response.data.question) {
        goToReport(response.data.session);
      }
    } catch (error) {
      if (error.response?.status === 410 && error.response.data?.session) {
        goToReport(error.response.data.session);
        return;
      }

      console.error('Failed to process voice response:', error);
      setErrorMessage(resolveVoiceErrorMessage(error));
    } finally {
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!retryPayload || !sessionId) {
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', retryPayload.sessionId);
      formData.append('audio', retryPayload.audioBlob, 'retry-recording.webm');

      const response = await api.post('/voice/respond', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTranscript(response.data.question || 'Processing complete.');
      if (response.data.session) {
        setSessionSnapshot(response.data.session);
        hydrateFromSession(response.data.session);
      }
      if (response.data.completed || !response.data.question) {
        goToReport(response.data.session);
      }
    } catch (error) {
      console.error('Retry failed:', error);
      setErrorMessage(resolveVoiceErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordToggle = async () => {
    if (!sessionId) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const handleEndSession = async () => {
    if (sessionId) {
      const response = await api.post(`/interviews/${sessionId}/end`);
      goToReport(response.data.session);
    } else {
      navigate('/candidate/dashboard');
    }
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl glass-card p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Low-Latency Voice Assessment</h1>
            <p className="text-gray-400">Text appears as soon as it is ready, and speech streams in asynchronously after recovery-safe persistence.</p>
          </div>
          <div className="space-y-4 mb-10">
            {[Mic, Volume2, Wifi].map((Icon, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight border border-white/5">
                <div className="flex items-center gap-3">
                  <Icon className="text-primary" size={24} />
                  <div>
                    <h4 className="font-medium text-white">{index === 0 ? 'Microphone' : index === 1 ? 'Interruptible Audio' : 'Realtime Recovery'}</h4>
                    <p className="text-xs text-gray-400">{index === 0 ? 'Browser media capture' : index === 1 ? 'Audio stops when you begin speaking' : 'Timer and state sync over Socket.IO'}</p>
                  </div>
                </div>
                <ShieldCheck className="text-success" size={20} />
              </div>
            ))}
          </div>
          {errorMessage ? <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div> : null}
          <Button size="lg" className="w-full text-lg glow-effect" onClick={startInterview}>
            Start Voice Interview
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-30 pointer-events-none"
        animate={{
          background: isRecording || isAudioPlaying
            ? 'radial-gradient(circle at center, rgba(99,102,241,0.2) 0%, rgba(11,15,25,0) 70%)'
            : 'radial-gradient(circle at center, rgba(11,15,25,0) 0%, rgba(11,15,25,0) 100%)',
        }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 h-20 border-b border-white/5 flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Mic size={20} />
          </div>
          <div>
            <h2 className="text-white font-medium">Voice Interview Session</h2>
            <div className="flex items-center gap-2 text-sm">
              {connectionState === 'connected' ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> : <WifiOff size={14} className="text-amber-300" />}
              <span className="text-gray-400">{connectionState}</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s
          </span>
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 capitalize">
            {session?.topic || (config.topic === 'custom' ? config.customTopic : config.topic)}
          </span>
        </div>

        <Button variant="danger" onClick={handleEndSession}>
          End Session
        </Button>
      </div>

      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
        {errorMessage ? (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-xl backdrop-blur-md max-w-lg text-center">
            <p className="text-sm">{errorMessage}</p>
            {retryPayload ? (
              <div className="mt-3 flex justify-center">
                <Button size="sm" variant="secondary" onClick={handleRetry} disabled={isSubmitting}>
                  Retry last response
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {recoveryMessage ? (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-200 px-6 py-3 rounded-xl backdrop-blur-md max-w-lg text-center">
            <p className="text-sm">{recoveryMessage}</p>
          </div>
        ) : null}

        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="h-32 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isAudioPlaying || isRecording ? (
                <motion.div key="waveform" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <WaveformVisualizer isActive={true} />
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-16 h-16 rounded-full bg-surfaceHighlight flex items-center justify-center border border-white/5">
                  <Volume2 className="text-gray-500" size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[120px] px-8 py-6 rounded-2xl bg-surfaceHighlight/50 border border-white/5 backdrop-blur-sm">
            <p className="text-xl text-gray-200 leading-relaxed font-medium">
              {transcript || session?.currentQuestion || 'Preparing your session...'}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 h-32 border-t border-white/5 bg-surface/50 backdrop-blur-md flex items-center justify-center">
        <button
          onClick={handleRecordToggle}
          disabled={isSubmitting}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:bg-red-500/30'
              : 'bg-primary text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105'
          }`}
        >
          {isRecording ? <Square size={28} className="fill-current" /> : <Mic size={32} />}
        </button>
      </div>
    </div>
  );
};

export default AIVoiceInterview;
