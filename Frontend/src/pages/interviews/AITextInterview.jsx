import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, PlayCircle, Target, Clock, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetupStore } from '../../store/useInterviewSetupStore';
import Button from '../../components/common/Button';
import api from '../../services/api';

const normalizeDifficulty = (difficulty) => (difficulty || 'medium').toLowerCase();

const formatRemainingTime = (remainingSeconds = 0) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const AITextInterview = () => {
  const navigate = useNavigate();
  const {
    config,
    sessionId,
    sessionSnapshot,
    setSessionId,
    setSessionSnapshot,
    setLatestReportId,
  } = useInterviewSetupStore();
  const [hasStarted, setHasStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [locked, setLocked] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(sessionSnapshot?.remainingSeconds || config.duration * 60 || 900);
  const [notice, setNotice] = useState('');
  const [interviewMeta, setInterviewMeta] = useState({
    currentTopic: sessionSnapshot?.progress?.currentTopic || '',
    followUpDepthLevel: sessionSnapshot?.progress?.followUpDepthLevel || 0,
    difficulty: sessionSnapshot?.difficulty || '',
    fallback: false,
    answeredQuestions: sessionSnapshot?.answeredQuestions || 0,
    totalQuestions: sessionSnapshot?.totalQuestions || 0,
  });
  const messagesEndRef = useRef(null);

  const resolvedTopic = config.topic === 'custom' ? config.customTopic : config.topic || 'General';

  useEffect(() => {
    if (!config?.mode) {
      navigate('/interview/setup');
    }
  }, [config, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!hasStarted || locked) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [hasStarted, locked]);

  useEffect(() => {
    if (timerSeconds !== 0 || locked || !sessionId) {
      return;
    }

    void endInterview(true);
  }, [timerSeconds, locked, sessionId]);

  useEffect(() => {
    if (!sessionId || hasStarted) {
      return;
    }

    const restoreSession = async () => {
      try {
        const response = await api.get(`/interviews/${sessionId}`);
        const { session, reportReady } = response.data;
        setSessionSnapshot(session);
        setTimerSeconds(session.remainingSeconds || 0);
        setInterviewMeta((current) => ({
          ...current,
          currentTopic: session.progress?.currentTopic || resolvedTopic,
          followUpDepthLevel: session.progress?.followUpDepthLevel || 0,
          difficulty: session.difficulty,
          answeredQuestions: session.answeredQuestions,
          totalQuestions: session.totalQuestions,
        }));
        setHasStarted(session.status === 'active');

        if (reportReady || session.status !== 'active') {
          setLatestReportId(session._id);
          navigate(`/interview/report/${session._id}`);
        }
      } catch (error) {
        console.error('Failed to restore interview session:', error);
      }
    };

    void restoreSession();
  }, [sessionId, hasStarted, navigate, resolvedTopic, setLatestReportId, setSessionSnapshot]);

  const startInterview = async () => {
    setNotice('');
    setIsTyping(true);

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

      const response = await api.post('/interviews/start', payload);
      setSessionId(response.data.session._id);
      setSessionSnapshot(response.data.session);
      setMessages([{ id: Date.now(), role: 'interviewer', content: response.data.firstQuestion }]);
      setTimerSeconds(response.data.session.remainingSeconds);
      setInterviewMeta({
        currentTopic: response.data.session.progress?.currentTopic || resolvedTopic,
        followUpDepthLevel: response.data.session.progress?.followUpDepthLevel || 0,
        difficulty: response.data.session.difficulty,
        fallback: Boolean(response.data.fallback),
        answeredQuestions: response.data.session.answeredQuestions,
        totalQuestions: response.data.session.totalQuestions,
      });
      setHasStarted(true);
    } catch (error) {
      console.error('Start Interview Error:', error.response?.data || error.message);
      setNotice(error.response?.data?.message || 'Failed to start interview.');
    } finally {
      setIsTyping(false);
    }
  };

  const endInterview = async (automatic = false) => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    try {
      const response = await api.post(`/interviews/${sessionId}/end`);
      const reportId = response.data.session._id;
      setLocked(true);
      setLatestReportId(reportId);
      setSessionSnapshot(response.data.session);
      navigate(`/interview/report/${reportId}`, {
        state: { automatic },
      });
    } catch (error) {
      console.error('Failed to end interview:', error);
      navigate('/dashboard');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || locked || !sessionId) {
      return;
    }

    const userMessage = { id: Date.now(), role: 'user', content: input.trim() };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post(`/interviews/${sessionId}/respond`, {
        answer: userMessage.content,
      });

      const { evaluation, question, completed, reportUrl, session } = response.data;
      if (session) {
        setSessionSnapshot(session);
        setTimerSeconds(session.remainingSeconds || 0);
      }

      setInterviewMeta((current) => ({
        ...current,
        currentTopic: evaluation?.currentTopic || current.currentTopic,
        followUpDepthLevel: evaluation?.followUpDepthLevel ?? current.followUpDepthLevel,
        difficulty: evaluation?.difficulty || current.difficulty,
        fallback: Boolean(evaluation?.fallback),
        answeredQuestions: session?.answeredQuestions ?? current.answeredQuestions + 1,
        totalQuestions: session?.totalQuestions ?? current.totalQuestions,
      }));

      if (completed || !question) {
        const reportId = reportUrl?.split('/').pop() || sessionId;
        setLocked(true);
        setLatestReportId(reportId);
        navigate(`/interview/report/${reportId}`);
        return;
      }

      setMessages((current) => [
        ...current,
        { id: Date.now(), role: 'interviewer', content: question },
      ]);
    } catch (error) {
      if (error.response?.status === 410) {
        const reportId = error.response?.data?.reportUrl?.split('/').pop() || sessionId;
        setLatestReportId(reportId);
        setLocked(true);
        navigate(`/interview/report/${reportId}`);
        return;
      }

      console.error('Failed to fetch response:', error);
      setNotice('The interviewer had trouble processing that answer. Please try again.');
    } finally {
      setIsTyping(false);
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

          <h1 className="text-3xl font-bold text-white mb-4">Timed Text Assessment</h1>
          <p className="text-gray-400 mb-8 text-lg">Your adaptive interviewer will run against a live countdown and generate a full assessment report at the end.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
            <div className="p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Target size={14} /> Domain</p>
              <p className="font-semibold text-gray-200 capitalize">{resolvedTopic}</p>
            </div>
            <div className="p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Zap size={14} /> Difficulty</p>
              <p className="font-semibold text-warning">{config.difficulty}</p>
            </div>
            <div className="p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><User size={14} /> Persona</p>
              <p className="font-semibold text-gray-200">{config.style}</p>
            </div>
            <div className="p-4 rounded-xl bg-surfaceHighlight border border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Clock size={14} /> Duration</p>
              <p className="font-semibold text-gray-200">{config.duration} minutes</p>
            </div>
          </div>

          {notice ? <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{notice}</div> : null}

          <Button size="lg" className="w-full text-lg glow-effect bg-secondary hover:bg-secondary/80" onClick={startInterview} isLoading={isTyping}>
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
          <Bot className="text-primary" /> Interview Status
        </h2>

        <div className="space-y-6 flex-1">
          <div className={`rounded-2xl border p-4 ${timerSeconds <= 60 ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-surfaceHighlight'}`}>
            <p className="text-sm text-gray-400 mb-2">Remaining Time</p>
            <div className="text-3xl font-mono font-semibold text-white">{formatRemainingTime(timerSeconds)}</div>
            <p className="text-xs text-gray-500 mt-2">Auto-submits your assessment when the timer reaches zero.</p>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Current Topic</p>
            <div className="px-3 py-2 bg-surfaceHighlight rounded-lg border border-white/5 text-sm font-medium capitalize">
              {interviewMeta.currentTopic || resolvedTopic}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Parameters</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/20">{interviewMeta.difficulty || config.difficulty}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/20">{config.style}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">{config.duration} min</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surfaceHighlight border border-white/5 p-3">
              <p className="text-xs text-gray-500 mb-1">Answered</p>
              <p className="text-lg font-semibold text-white">{interviewMeta.answeredQuestions}</p>
            </div>
            <div className="rounded-xl bg-surfaceHighlight border border-white/5 p-3">
              <p className="text-xs text-gray-500 mb-1">Questions</p>
              <p className="text-lg font-semibold text-white">{Math.max(interviewMeta.totalQuestions, interviewMeta.answeredQuestions)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Follow-up Depth</p>
            <div className="px-3 py-2 bg-surfaceHighlight rounded-lg border border-white/5 text-sm font-medium">
              {interviewMeta.followUpDepthLevel}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Continuity Status</p>
            <div className={`px-3 py-2 rounded-lg border text-sm font-medium ${interviewMeta.fallback ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
              {interviewMeta.fallback ? 'Fallback guard used' : 'Adaptive flow active'}
            </div>
          </div>

          {notice ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 flex gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-auto">
          <button onClick={() => endInterview(false)} className="w-full py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-medium">
            End Interview
          </button>
        </div>
      </div>

      <div className="flex-1 glass-card flex flex-col relative overflow-hidden">
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-surface/50">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${locked ? 'bg-amber-400' : 'bg-green-500 animate-pulse'}`} />
            <span className="font-medium text-gray-200">{locked ? 'Finalizing Assessment' : 'Session Active'}</span>
          </div>
          <div className="text-sm font-mono text-gray-300">{formatRemainingTime(timerSeconds)}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 max-w-[85%] ${message.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${message.role === 'user' ? 'bg-surfaceHighlight border border-white/10' : 'bg-primary/20 text-primary'}`}>
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${message.role === 'user' ? 'bg-surfaceHighlight border border-white/5 text-gray-100' : 'bg-primary/10 border border-primary/20 text-blue-50'}`}>
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[80%]">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot size={20} />
              </div>
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </motion.div>
          ) : null}
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
              disabled={locked}
              placeholder={locked ? 'Interview completed. Redirecting to report...' : 'Type your response...'}
              className="w-full bg-surfaceHighlight border border-white/10 rounded-xl py-3 px-4 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none min-h-[52px] max-h-32 text-sm disabled:opacity-60"
              rows={1}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isTyping || locked}
              className="absolute right-3 bottom-3 text-primary hover:text-indigo-400 disabled:opacity-50 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          {locked ? (
            <div className="mt-3 text-sm text-emerald-200 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Interview locked. Preparing your final assessment report.</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AITextInterview;
