import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, PlayCircle, Target, Clock, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetupStore } from '../../store/useInterviewSetupStore';
import { useInterviewRuntimeStore } from '../../store/useInterviewRuntimeStore';
import { useInterviewSessionChannel } from '../../hooks/useInterviewSessionChannel';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';

const normalizeDifficulty = (difficulty) => (difficulty || 'medium').toLowerCase();
const formatRemainingTime = (remainingSeconds = 0) => `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
const generateTabId = () => `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const AITextInterview = () => {
  const navigate = useNavigate();
  const [tabId] = useState(generateTabId);
  const { config, sessionId, setSessionId, setSessionSnapshot, setLatestReportId } = useInterviewSetupStore();
  const {
    session,
    messages,
    timerSeconds,
    aiState,
    connectionState,
    autosaveStatus,
    recoveryMessage,
    setSession,
    hydrateFromSession,
    appendMessage,
    setAutosaveStatus,
    setRecoveryMessage,
  } = useInterviewRuntimeStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const messagesEndRef = useRef(null);

  const resolvedTopic = config.topic === 'custom' ? config.customTopic : config.topic || 'General';

  const goToReport = (sessionData) => {
    setLatestReportId(sessionData._id);
    setSessionSnapshot(sessionData);
    navigate(`/candidate/interview/report/${sessionData._id}`);
  };

  useInterviewSessionChannel({
    sessionId,
    tabId,
    onCompleted: goToReport,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiState]);

  useEffect(() => {
    if (!config?.mode) {
      navigate('/candidate/interview/setup');
    }
  }, [config, navigate]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await api.get(API_ROUTES.interviews.active);
        if (response.data?.session && response.data.session.status === 'active') {
          setSessionId(response.data.session._id);
          setSessionSnapshot(response.data.session);
          hydrateFromSession(response.data.session);
          setHasStarted(true);
          setRecoveryMessage('Recovered your in-progress interview from the server.');
          return;
        }
      } catch (error) {
        console.error('Failed to restore active session:', error);
      }
    };

    if (!hasStarted && !sessionId) {
      void bootstrap();
    }
  }, [hasStarted, sessionId, hydrateFromSession, setRecoveryMessage, setSessionId, setSessionSnapshot]);

  useEffect(() => {
    if (!sessionId || !hasStarted) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        setAutosaveStatus('saving');
        await api.post(API_ROUTES.interviews.autosave(sessionId), {
          currentAnswerDraft: input,
          aiState,
          activePhase: 'candidate_answering',
          tabId,
          connectionState,
        });
      } catch (error) {
        console.error('Autosave failed:', error);
        setAutosaveStatus('error');
      }
    }, 20000);

    return () => window.clearInterval(interval);
  }, [sessionId, hasStarted, input, aiState, tabId, connectionState, setAutosaveStatus]);

  const startInterview = async () => {
    setNotice('');
    setIsSubmitting(true);

    try {
      const payload = {
        mode: config.mode,
        topic: resolvedTopic,
        difficulty: normalizeDifficulty(config.difficulty),
        experienceLevel: config.experienceLevel || 'Intermediate',
        interviewType: config.interviewType || 'technical',
        style: config.style || 'Friendly',
        duration: config.duration || 15,
      };

      const response = await api.post(API_ROUTES.interviews.start, payload);
      setSessionId(response.data.session._id);
      setSessionSnapshot(response.data.session);
      setSession(response.data.session);
      hydrateFromSession(response.data.session);
      setHasStarted(true);
    } catch (error) {
      console.error('Start Interview Error:', error.response?.data || error.message);
      setNotice(error.response?.data?.message || 'Failed to start interview.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const endInterview = async () => {
    if (!sessionId) {
      navigate('/candidate/dashboard');
      return;
    }

    try {
      const response = await api.post(API_ROUTES.interviews.end(sessionId));
      goToReport(response.data.session);
    } catch (error) {
      console.error('Failed to end interview:', error);
      navigate('/candidate/dashboard');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSubmitting || !sessionId) {
      return;
    }

    const answer = input.trim();
    appendMessage({ id: `u-${Date.now()}`, role: 'user', content: answer });
    setInput('');
    setIsSubmitting(true);

    try {
      const response = await api.post(API_ROUTES.interviews.respond(sessionId), { answer });
      if (response.data.session) {
        setSessionSnapshot(response.data.session);
        setSession(response.data.session);
      }

      if (response.data.completed || !response.data.question) {
        goToReport(response.data.session);
        return;
      }

      appendMessage({ id: `i-${Date.now()}`, role: 'interviewer', content: response.data.question });
    } catch (error) {
      if (error.response?.status === 410 && error.response.data?.session) {
        goToReport(error.response.data.session);
        return;
      }

      console.error('Failed to fetch response:', error);
      setNotice('The interviewer had trouble processing that answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl glass-card p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-secondary/20 rounded-2xl mx-auto flex items-center justify-center mb-6 text-secondary shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Bot size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Recoverable Timed Text Assessment</h1>
          <p className="text-gray-400 mb-8 text-lg">Server-authoritative timer, Mongo-backed recovery, and autosave every 20 seconds.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
            <div className="p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Target size={14} /> Domain</p>
              <p className="font-semibold text-gray-200 capitalize">{resolvedTopic}</p>
            </div>
            <div className="p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Clock size={14} /> Duration</p>
              <p className="font-semibold text-gray-200">{config.duration} minutes</p>
            </div>
          </div>
          {notice ? <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{notice}</div> : null}
          <Button size="lg" className="w-full text-lg glow-effect bg-secondary hover:bg-secondary/80" onClick={startInterview} isLoading={isSubmitting}>
            Start Interview <PlayCircle className="ml-2" size={20} />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden p-4 gap-4">
      <div className="w-full md:w-80 glass-panel rounded-2xl p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Bot className="text-primary" /> Interview Runtime
        </h2>

        <div className="space-y-6 flex-1">
          <div className={`rounded-2xl border p-4 ${timerSeconds <= 60 ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-surfaceHighlight'}`}>
            <p className="text-sm text-gray-400 mb-2">Server Timer</p>
            <div className="text-3xl font-mono font-semibold text-white">{formatRemainingTime(timerSeconds)}</div>
            <p className="text-xs text-gray-500 mt-2">Driven from `expiresAt - serverTime` and synced over Socket.IO.</p>
          </div>

          <div className="rounded-xl bg-surfaceHighlight border border-white/5 p-4">
            <div className="text-sm text-gray-400 mb-1">Connection</div>
            <div className={`text-sm font-medium ${connectionState === 'connected' ? 'text-emerald-300' : 'text-amber-300'}`}>
              {connectionState}
            </div>
            {recoveryMessage ? <div className="text-xs text-gray-400 mt-2">{recoveryMessage}</div> : null}
          </div>

          <div className="rounded-xl bg-surfaceHighlight border border-white/5 p-4">
            <div className="text-sm text-gray-400 mb-1">Autosave</div>
            <div className="text-sm font-medium text-white">{autosaveStatus}</div>
          </div>

          <div className="rounded-xl bg-surfaceHighlight border border-white/5 p-4">
            <div className="text-sm text-gray-400 mb-1">AI State</div>
            <div className="text-sm font-medium text-white">{session?.aiState || aiState}</div>
          </div>
        </div>

        <div className="mt-auto">
          <button onClick={endInterview} className="w-full py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-medium">
            End Interview
          </button>
        </div>
      </div>

      <div className="flex-1 glass-card flex flex-col relative overflow-hidden">
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-surface/50">
          <div className="flex items-center gap-3">
            {connectionState === 'connected' ? <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> : <WifiOff size={16} className="text-amber-300" />}
            <span className="font-medium text-gray-200">{connectionState === 'connected' ? 'Session Active' : 'Recovering Connection'}</span>
          </div>
          <div className="text-sm font-mono text-gray-300">{formatRemainingTime(timerSeconds)}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 max-w-[85%] ${message.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${message.role === 'user' ? 'bg-surfaceHighlight border border-white/10' : 'bg-primary/20 text-primary'}`}>
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${message.role === 'user' ? 'bg-surfaceHighlight border border-white/5 text-gray-100' : 'bg-primary/10 border border-primary/20 text-blue-50'}`}>
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-surface/80 border-t border-white/5 backdrop-blur-md">
          <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type your response..."
              className="w-full bg-surfaceHighlight border border-white/10 rounded-xl py-3 px-4 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none min-h-[52px] max-h-32 text-sm"
              rows={1}
            />
            <button onClick={() => void handleSend()} disabled={!input.trim() || isSubmitting} className="absolute right-3 bottom-3 text-primary hover:text-indigo-400 disabled:opacity-50 transition-colors">
              <Send size={20} />
            </button>
          </div>
          {notice ? <div className="mt-3 text-sm text-amber-200">{notice}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default AITextInterview;
