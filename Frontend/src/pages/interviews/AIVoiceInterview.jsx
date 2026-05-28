import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ShieldCheck, Square, Volume2, Wifi, WifiOff } from 'lucide-react';
import { useInterviewSetupStore } from '../../store/useInterviewSetupStore';
import { useInterviewRuntimeStore } from '../../store/useInterviewRuntimeStore';
import { useInterviewSessionChannel } from '../../hooks/useInterviewSessionChannel';
import { connectSocket } from '../../services/socket';
import api from '../../services/api';
import { API_ROUTES, getApiOrigin } from '../../constants/apiRoutes';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import InterviewErrorBoundary from '../../components/common/InterviewErrorBoundary';

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
  const [isStarting, setIsStarting] = useState(false); // Double-start protection
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryPayload, setRetryPayload] = useState(null);
  const [browserSttActive, setBrowserSttActive] = useState(false);
  const recognitionRef = useRef(null);
  const recognizedTextRef = useRef('');
  
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const socket = useMemo(() => connectSocket(), []);
  
  const bootstrapStartedRef = useRef(false);
  const isPlayingRef = useRef(false); // Strict sequential playback queue protection

  const resolveVoiceErrorMessage = (error) => {
    const stage = error?.response?.data?.stage;
    const defaultMessage = error?.response?.data?.error || error?.response?.data?.message || 'Voice processing failed. Please try again.';

    const stageMessageMap = {
      upload_received: 'Audio upload failed. Please retry recording.',
      transcription_started: 'Voice transcription failed. Please retry or type your response.',
      transcription_completed: 'Voice transcription failed. Please retry or type your response.',
      ai_processing_started: 'AI is temporarily unavailable. Please retry in a moment.',
      ai_processing_completed: 'AI processing failed. Please retry in a moment.',
      tts_started: 'Speech generation is unavailable. Continuing in text-assisted mode.',
      tts_completed: 'Speech generation is unavailable. Continuing in text-assisted mode.',
    };

    return stage ? (stageMessageMap[stage] || defaultMessage) : defaultMessage;
  };

  // Client Browser SpeechSynthesis Fallback Trigger
  const triggerBrowserSpeechFallback = (text) => {
    if (!text) return;
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); // Cancel outstanding browser utterances
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Use a high-quality English voice if available
        const voices = window.speechSynthesis.getVoices();
        const niceVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('google')) || 
                          voices.find(v => v.lang.startsWith('en-US')) ||
                          voices.find(v => v.lang.startsWith('en'));
        if (niceVoice) {
          utterance.voice = niceVoice;
        }

        utterance.onstart = () => {
          setAudioPlaying(true);
        };
        
        utterance.onend = () => {
          setAudioPlaying(false);
        };

        utterance.onerror = (e) => {
          console.error('[SpeechSynthesis] Error during fallback speech:', e);
          setAudioPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('[SpeechSynthesis] Exception during fallback initialization:', err);
        setAudioPlaying(false);
      }
    } else {
      console.warn('[SpeechSynthesis] Not supported in this browser. Falling back to text-only mode.');
      setAudioPlaying(false);
    }
  };

  const onAudioInterrupted = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop and cancel browser SpeechSynthesis fallback
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    isPlayingRef.current = false;
    setAudioPlaying(false);
    clearAudioQueue();
  };

  const onAudioReady = (payload) => {
    if (payload?.sessionId !== sessionId) {
      return;
    }
    enqueueAudio(payload);
  };

  const onAudioFailed = (payload) => {
    if (payload?.sessionId !== sessionId) {
      return;
    }
    console.warn('[VoicePipeline] Backend TTS depleted/failed. Triggering client SpeechSynthesis fallback.');
    triggerBrowserSpeechFallback(payload.text);
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
    onAudioFailed,
  });

  useEffect(() => {
    if (!config?.mode) {
      navigate('/candidate/interview/setup');
    }
  }, [config, navigate]);

  // Reconnect-safe bootstrap effect (running once to avoid strict-mode API double-fetches)
  useEffect(() => {
    const bootstrap = async () => {
      if (bootstrapStartedRef.current) return;
      bootstrapStartedRef.current = true;
      try {
        const response = await api.get(API_ROUTES.interviews.active);
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

  // Strict Sequential playback queue handler
  useEffect(() => {
    const playNext = async () => {
      if (isAudioPlaying || isPlayingRef.current || !sessionId) {
        return;
      }

      const next = dequeueAudio();
      if (!next?.audioUrl) {
        return;
      }

      isPlayingRef.current = true;
      try {
        setAudioPlaying(true);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.onended = null;
        }

        const audio = new Audio(`${getApiOrigin()}${next.audioUrl}`);
        audioRef.current = audio;
        audio.onended = () => {
          isPlayingRef.current = false;
          setAudioPlaying(false);
        };
        await audio.play();
      } catch (error) {
        console.error('Failed to play sequential queue audio:', error);
        isPlayingRef.current = false;
        setAudioPlaying(false);
      }
    };

    void playNext();
  }, [sessionId, isAudioPlaying, dequeueAudio, setAudioPlaying]);

  // Double click protection startInterview
  const startInterview = async () => {
    if (isStarting) return;
    setIsStarting(true);
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

      const response = await api.post(API_ROUTES.interviews.start, payload);
      setSessionId(response.data.session._id);
      setSessionSnapshot(response.data.session);
      hydrateFromSession(response.data.session);
      setTranscript(response.data.firstQuestion);
      setHasStarted(true);

      // Attempt to synthesize audio for the first question
      const speechResponse = await api.post(API_ROUTES.voice.speak, { text: response.data.firstQuestion });
      if (speechResponse.data?.audioUrl) {
        enqueueAudio({ sessionId: response.data.session._id, audioUrl: speechResponse.data.audioUrl });
      } else {
        // Fallback directly to client browser speechSynthesis
        triggerBrowserSpeechFallback(response.data.firstQuestion);
      }
    } catch (error) {
      console.error('Start Interview Error:', error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || 'Failed to start voice interview.');
    } finally {
      setIsStarting(false);
    }
  };

  const submitTextResponse = async (textAnswer) => {
    setIsSubmitting(true);
    setTranscript('Processing response text...');

    try {
      const response = await api.post(API_ROUTES.interviews.respond(sessionId), { answer: textAnswer });
      
      setTranscript(response.data.question || 'Processing complete.');
      if (response.data.session) {
        setSessionSnapshot(response.data.session);
        hydrateFromSession(response.data.session);
      }
      if (response.data.completed || !response.data.question) {
        goToReport(response.data.session);
        return;
      }

      // Generate audio asynchronously for next question
      let requestId = null;
      try {
        const speechResponse = await api.post(API_ROUTES.voice.speak, { text: response.data.question });
        if (speechResponse.data?.audioUrl) {
          enqueueAudio({ sessionId, audioUrl: speechResponse.data.audioUrl });
        } else {
          triggerBrowserSpeechFallback(response.data.question);
        }
      } catch (audioErr) {
        console.warn('Speech synthesis failed. Triggering browser fallback:', audioErr);
        triggerBrowserSpeechFallback(response.data.question);
      }
    } catch (error) {
      console.error('Failed to submit local speech response:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to submit voice response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      
      // Cancel ongoing synthesizers instantly on user response capture
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      isPlayingRef.current = false;
      setAudioPlaying(false);
      clearAudioQueue();

      socket.emit('interview:speech_interrupt', { sessionId });
      
      // Always initialize background SpeechRecognition for live preview and failover
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognizedTextRef.current = '';
        setTranscript('Listening...');

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          const text = finalTranscript || interimTranscript;
          if (text) {
            setTranscript(text);
            recognizedTextRef.current = text;
          }
        };

        recognition.onerror = (e) => {
          console.warn('Background SpeechRecognition warning:', e.error);
        };

        recognition.onend = () => {
          console.log('Background SpeechRecognition ended');
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      if (!browserSttActive) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        mediaStreamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream, {
          audioBitsPerSecond: 128000
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        if (!SpeechRecognition) {
          setTranscript('Listening...');
        }
      }
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
    // 1. Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop failed:', e);
      }
    }

    setIsRecording(false);
    setIsSubmitting(true);
    setTranscript('Processing speech...');

    if (browserSttActive) {
      const textAnswer = recognizedTextRef.current || '';
      if (!textAnswer.trim()) {
        setErrorMessage('No speech detected. Please try speaking again.');
        setIsSubmitting(false);
        return;
      }
      await submitTextResponse(textAnswer);
      return;
    }

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      setIsSubmitting(false);
      return;
    }

    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
      mediaRecorder.stop();
    });

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (!audioChunksRef.current.length) {
      // Fallback instantly if audio was lost but background recognition has text!
      if (recognizedTextRef.current.trim()) {
        console.warn('Audio capture failed. Recovering via background SpeechRecognition text.');
        setBrowserSttActive(true);
        await submitTextResponse(recognizedTextRef.current);
        return;
      }
      setErrorMessage('No audio captured. Please record again.');
      setIsSubmitting(false);
      mediaRecorderRef.current = null;
      return;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (!audioBlob.size) {
        if (recognizedTextRef.current.trim()) {
          setBrowserSttActive(true);
          await submitTextResponse(recognizedTextRef.current);
          return;
        }
        setErrorMessage('No audio captured. Please record again.');
        setIsSubmitting(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audio', audioBlob, 'recording.webm');

      setRetryPayload({ sessionId, audioBlob, mimeType: audioBlob.type || 'audio/webm' });

      const response = await api.post(API_ROUTES.voice.respond, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.success === false && response.data.fallback === 'browser-stt') {
        setErrorMessage('Voice server busy. Switching to local voice recognition.');
        setBrowserSttActive(true);
        
        // Instant recovery: if background text exists, submit it immediately!
        if (recognizedTextRef.current.trim()) {
          setTranscript('Local voice recognition recovery activated. Submitting local transcript...');
          await submitTextResponse(recognizedTextRef.current);
          return;
        }

        setTranscript('Local voice recognition active. Please click "Tap to Speak" and speak your answer!');
        setIsSubmitting(false);
        return;
      }

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

      const response = await api.post(API_ROUTES.voice.respond, formData, {
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
    if (!sessionId || isSubmitting) {
      return;
    }

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleEndSession = async () => {
    if (sessionId) {
      const response = await api.post(API_ROUTES.interviews.end(sessionId));
      goToReport(response.data.session);
    } else {
      navigate('/candidate/dashboard');
    }
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden text-left">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl glass-card p-10 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Low-Latency Voice Assessment</h1>
            <p className="text-gray-400 text-sm leading-relaxed">Text appears as soon as it is ready, and speech streams in asynchronously after recovery-safe persistence.</p>
          </div>
          <div className="space-y-4 mb-10">
            {[Mic, Volume2, Wifi].map((Icon, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight border border-white/5 shadow-inner">
                <div className="flex items-center gap-3">
                  <Icon className="text-primary animate-pulse" size={24} />
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
          <Button size="lg" className="w-full text-lg glow-effect py-3" onClick={startInterview} disabled={isStarting}>
            {isStarting ? 'Initializing Mock Session...' : 'Start Voice Interview'}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden text-left">
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
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Mic size={20} className={isRecording ? 'animate-bounce' : ''} />
          </div>
          <div>
            <h2 className="text-white font-medium">Voice Interview Session</h2>
            <div className="flex items-center gap-2 text-sm">
              {connectionState === 'connected' || connectionState === 'recovered' ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> : <WifiOff size={14} className="text-amber-300 animate-ping" />}
              <span className="text-gray-400 capitalize">{connectionState}</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs">
          {browserSttActive && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold shadow-sm animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Local STT Active
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold shadow-sm">
            {Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s
          </span>
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 capitalize font-semibold shadow-sm">
            {session?.topic || (config.topic === 'custom' ? config.customTopic : config.topic)}
          </span>
        </div>

        <Button variant="danger" onClick={handleEndSession} className="shadow-lg">
          End Session
        </Button>
      </div>

      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
        {errorMessage ? (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-xl backdrop-blur-md max-w-lg text-center shadow-lg">
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
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-200 px-6 py-3 rounded-xl backdrop-blur-md max-w-lg text-center shadow-lg">
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
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-16 h-16 rounded-full bg-surfaceHighlight flex items-center justify-center border border-white/5 shadow-inner">
                  <Volume2 className="text-gray-500" size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[120px] px-8 py-6 rounded-2xl bg-surfaceHighlight/50 border border-white/5 backdrop-blur-sm shadow-xl">
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
              : 'bg-primary text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95'
          }`}
        >
          {isRecording ? <Square size={28} className="fill-current" /> : <Mic size={32} />}
        </button>
      </div>
    </div>
  );
};

// Premium Error Boundary Wrapped Export
const AIVoiceInterviewWithErrorBoundary = () => (
  <InterviewErrorBoundary>
    <AIVoiceInterview />
  </InterviewErrorBoundary>
);

export default AIVoiceInterviewWithErrorBoundary;
