import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ShieldCheck, Square, Volume2, Wifi } from 'lucide-react';
import { useInterviewSetupStore } from '../../store/useInterviewSetupStore';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';

const normalizeDifficulty = (difficulty) => (difficulty || 'medium').toLowerCase();

const buildAssetUrl = (assetPath) => {
  if (!assetPath) return null;
  if (assetPath.startsWith('http')) return assetPath;

  const apiBaseUrl = api.defaults.baseURL || '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}${assetPath}`;
};

const WaveformVisualizer = ({ isActive }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-full bg-primary"
          animate={isActive ? { height: ['20%', '100%', '20%'] } : { height: '20%' }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.05,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

const AIVoiceInterview = () => {
  const navigate = useNavigate();
  const { config, sessionId, setSessionId, setLatestReportId, setSessionSnapshot } = useInterviewSetupStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiState, setAiState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorStage, setErrorStage] = useState('');
  const [interviewMeta, setInterviewMeta] = useState({
    currentTopic: '',
    followUpDepthLevel: 0,
    difficulty: '',
    fallback: false,
    remainingSeconds: (config.duration || 15) * 60,
  });
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!config || !config.mode) {
      navigate('/interview/setup');
    }
  }, [config, navigate]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const playAudio = async (audioUrl) => {
    const resolvedUrl = buildAssetUrl(audioUrl);
    if (!resolvedUrl) {
      setAiState('idle');
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(resolvedUrl);
      audioRef.current = audio;
      audio.onended = () => setAiState('idle');
      audio.onerror = () => setAiState('idle');
      await audio.play();
    } catch (error) {
      console.error('Failed to play generated speech:', error);
      setAiState('idle');
    }
  };

  useEffect(() => {
    const initInterview = async () => {
      setAiState('analyzing');
      setErrorMessage('');

      if (!config?.mode || !config?.topic) {
        console.error("Missing interview configuration");
        setErrorMessage("Missing interview configuration");
        setAiState('idle');
        return;
      }

      try {
        const topic = config.topic === 'custom' ? config.customTopic : config.topic;
        const payload = {
          mode: config.mode,
          topic,
          difficulty: normalizeDifficulty(config.difficulty),
          experienceLevel: config.experienceLevel || 'fresher',
          interviewType: config.interviewType || 'technical',
          style: config.style || 'Friendly',
          duration: config.duration || 15,
        };
        console.log("Interview Config:", config);
        console.log("Sending Payload:", payload);

        const sessionResponse = await api.post('/interviews/start', payload);

        const nextSessionId = sessionResponse.data.session._id;
        const firstQuestion = sessionResponse.data.firstQuestion;

        setSessionId(nextSessionId);
        setSessionSnapshot(sessionResponse.data.session);
        setTranscript(firstQuestion);
        setInterviewMeta({
          currentTopic: payload.topic,
          followUpDepthLevel: 0,
          difficulty: payload.difficulty,
          fallback: Boolean(sessionResponse.data.fallback),
          remainingSeconds: sessionResponse.data.session.remainingSeconds || payload.duration * 60,
        });
        setAiState('speaking');

        try {
          const speechResponse = await api.post('/voice/speak', { text: firstQuestion });
          console.log('TTS Response:', speechResponse.data);
          if (speechResponse.data?.fallback || !speechResponse.data?.audioUrl) {
            setErrorMessage(speechResponse.data?.warning || 'Voice generation unavailable. Continuing in text-assisted mode.');
            setAiState('idle');
            return;
          }
          await playAudio(speechResponse.data.audioUrl);
        } catch (speechError) {
          console.error('Failed to generate initial speech:', speechError);
          setErrorMessage('Voice generation unavailable. Continuing in text-assisted mode.');
          setAiState('idle');
        }
      } catch (error) {
        console.error(
          "Start Interview Error:",
          error.response?.data || error.message
        );
        setTranscript('Sorry, I had trouble connecting. Please try again.');
        setErrorMessage(error.response?.data?.message || 'Failed to start interview. Please complete all setup fields.');
        setAiState('idle');
      }
    };

    if (hasStarted && !sessionId) {
      initInterview();
    }
  }, [config, hasStarted, sessionId, setSessionId]);

  const startRecording = async () => {
    try {
      setErrorMessage('');
      setErrorStage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAiState('idle');
      setTranscript('Listening...');
    } catch (error) {
      console.error('Unable to access microphone:', error);
      setErrorMessage('Microphone permission is required for voice interviews.');
      setErrorStage('recording_start');
      setAiState('idle');
    }
  };

  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    setIsRecording(false);
    setAiState('analyzing');

    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
      mediaRecorder.stop();
    });

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
      console.log('Audio Chunks:', audioChunksRef.current);
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      console.log('Audio Blob:', audioBlob);
      console.log('Blob Size:', audioBlob.size);
      console.log('Blob Type:', audioBlob?.type);

      if (!audioBlob.size) {
        throw new Error('Recorded audio is empty.');
      }

      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audio', audioBlob, `recording.${extension}`);
      console.log('Uploading audio file:', formData.get('audio'));

      const response = await api.post('/voice/respond', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('TTS Response:', response.data);

      setTranscript(response.data.question);
      setInterviewMeta((prev) => ({
        currentTopic: response.data.evaluation?.currentTopic || prev.currentTopic,
        followUpDepthLevel: response.data.evaluation?.followUpDepthLevel ?? prev.followUpDepthLevel,
        difficulty: response.data.evaluation?.difficulty || prev.difficulty,
        fallback: Boolean(response.data.evaluation?.fallback),
        remainingSeconds: response.data.session?.remainingSeconds || prev.remainingSeconds,
      }));
      if (response.data.session) {
        setSessionSnapshot(response.data.session);
      }
      if (response.data.completed || !response.data.question) {
        const reportId = response.data.reportUrl?.split('/').pop() || sessionId;
        setLatestReportId(reportId);
        navigate(`/interview/report/${reportId}`);
        return;
      }
      if (response.data?.fallback || !response.data?.audioUrl) {
        setErrorMessage(response.data?.warning || 'Voice generation unavailable. Continuing in text-assisted mode.');
        setAiState('idle');
        return;
      }

      setAiState('speaking');
      await playAudio(response.data.audioUrl);
    } catch (error) {
      console.error('Failed to process voice response:', error);
      console.error('Voice response error payload:', error.response?.data);
      setErrorMessage(error.response?.data?.message || 'Voice processing failed. Please try again.');
      setErrorStage(error.response?.data?.stage || 'voice_pipeline');
      setTranscript('I had trouble processing that response. Please try again.');
      setAiState('idle');
    } finally {
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  };

  const handleRecordToggle = async () => {
    if (!sessionId) return;

    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const handleEndSession = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (sessionId) {
      try {
        const response = await api.post(`/interviews/${sessionId}/end`);
        const reportId = response.data.session._id;
        setLatestReportId(reportId);
        setSessionSnapshot(response.data.session);
        navigate(`/interview/report/${reportId}`);
        return;
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    setSessionId(null);
    navigate('/dashboard');
  };

  const handleRetryVoice = async () => {
    setErrorMessage('');
    setErrorStage('');
    await startRecording();
  };

  const handleContinueTextMode = () => {
    navigate('/interview/text');
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl glass-card p-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Voice Environment Check</h1>
            <p className="text-gray-400">Please ensure your environment is quiet and microphone is ready.</p>
          </div>

          <div className="space-y-4 mb-10">
            <div className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <div className="flex items-center gap-3">
                <Mic className="text-primary" size={24} />
                <div>
                  <h4 className="font-medium text-white">Microphone</h4>
                  <p className="text-xs text-gray-400">Browser media capture</p>
                </div>
              </div>
              <ShieldCheck className="text-success" size={20} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <div className="flex items-center gap-3">
                <Volume2 className="text-primary" size={24} />
                <div>
                  <h4 className="font-medium text-white">Speaker</h4>
                  <p className="text-xs text-gray-400">AI speech playback enabled</p>
                </div>
              </div>
              <ShieldCheck className="text-success" size={20} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <div className="flex items-center gap-3">
                <Wifi className="text-primary" size={24} />
                <div>
                  <h4 className="font-medium text-white">Backend Connection</h4>
                  <p className="text-xs text-gray-400">Interview, speech, and transcription APIs</p>
                </div>
              </div>
              <ShieldCheck className="text-success" size={20} />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full text-lg glow-effect"
            onClick={() => setHasStarted(true)}
          >
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
          background: aiState === 'speaking'
            ? 'radial-gradient(circle at center, rgba(99,102,241,0.2) 0%, rgba(11,15,25,0) 70%)'
            : 'radial-gradient(circle at center, rgba(11,15,25,0) 0%, rgba(11,15,25,0) 100%)'
        }}
        transition={{ duration: 1 }}
      />

      {/* Header */}
      <div className="relative z-10 h-20 border-b border-white/5 flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Mic size={20} />
          </div>
          <div>
            <h2 className="text-white font-medium">Voice Interview Session</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${aiState === 'speaking' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-gray-400 capitalize">{aiState}</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {Math.floor(interviewMeta.remainingSeconds / 60)}m {interviewMeta.remainingSeconds % 60}s
          </span>
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 capitalize">
            {interviewMeta.currentTopic || (config.topic === 'custom' ? config.customTopic : config.topic)}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10">
            Depth {interviewMeta.followUpDepthLevel}
          </span>
          <span className={`px-3 py-1 rounded-full border ${interviewMeta.fallback ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>
            {interviewMeta.fallback ? 'Fallback' : 'Adaptive'}
          </span>
        </div>

        <Button variant="danger" onClick={handleEndSession}>
          End Session
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
        {errorMessage && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-xl flex items-center gap-3 backdrop-blur-md max-w-lg text-center">
            <ShieldCheck size={20} className="shrink-0" />
            <div className="flex flex-col gap-3 items-center">
              <p className="text-sm">{errorMessage}</p>
              {errorStage ? <p className="text-xs text-red-300/80">Stage: {errorStage}</p> : null}
              <div className="flex gap-2">
                <button
                  onClick={handleRetryVoice}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-xs"
                >
                  Retry Recording
                </button>
                <button
                  onClick={handleContinueTextMode}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-gray-100 text-xs"
                >
                  Continue In Text Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visualizer & Transcript */}
        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="h-32 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {aiState === 'speaking' || isRecording ? (
                <motion.div
                  key="waveform"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <WaveformVisualizer isActive={true} />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-16 h-16 rounded-full bg-surfaceHighlight flex items-center justify-center border border-white/5"
                >
                  <Volume2 className="text-gray-500" size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[120px] px-8 py-6 rounded-2xl bg-surfaceHighlight/50 border border-white/5 backdrop-blur-sm">
            <p className="text-xl text-gray-200 leading-relaxed font-medium">
              {transcript || "Preparing your session..."}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 h-32 border-t border-white/5 bg-surface/50 backdrop-blur-md flex items-center justify-center">
        <button
          onClick={handleRecordToggle}
          disabled={aiState === 'speaking' || aiState === 'analyzing'}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:bg-red-500/30'
              : 'bg-primary text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed'
          }`}
        >
          {isRecording ? <Square size={28} className="fill-current" /> : <Mic size={32} />}
        </button>
      </div>
    </div>
  );
};

export default AIVoiceInterview;
