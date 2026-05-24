import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetupStore } from '../../store/useInterviewSetupStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  Mic,
  MessageSquare,
  Code,
  Layout,
  Database,
  Terminal,
  Settings,
  Briefcase,
  Zap,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Clock3,
} from 'lucide-react';

const TOPICS = [
  { id: 'dsa', name: 'Data Structures', icon: Code },
  { id: 'react', name: 'React.js', icon: Layout },
  { id: 'node', name: 'Node.js', icon: Terminal },
  { id: 'dbms', name: 'DBMS', icon: Database },
  { id: 'system-design', name: 'System Design', icon: Settings },
  { id: 'hr', name: 'HR / Behavioral', icon: Briefcase },
];

const DURATIONS = [
  { value: 10, label: '10 Minutes', detail: '5-7 focused questions' },
  { value: 15, label: '15 Minutes', detail: '8-12 balanced questions' },
  { value: 30, label: '30 Minutes', detail: '15-20 deep-dive questions' },
];

const STEPS = [1, 2, 3, 4, 5];

const InterviewSetup = () => {
  const navigate = useNavigate();
  const { config, updateConfig, setSessionId, setLatestReportId, setSessionSnapshot } = useInterviewSetupStore();
  const [step, setStep] = useState(1);

  const nextStep = () => setStep((current) => Math.min(5, current + 1));
  const prevStep = () => setStep((current) => Math.max(1, current - 1));

  const handleComplete = () => {
    setSessionId(null);
    setLatestReportId(null);
    setSessionSnapshot(null);
    navigate(`/candidate/interview/${config.mode}`);
  };

  const resolvedTopic =
    config.topic === 'custom'
      ? config.customTopic
      : TOPICS.find((topic) => topic.id === config.topic)?.name || 'Interview';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
            <Sparkles className="text-primary" /> Interview Configuration
          </h1>
          <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
            {STEPS.map((value) => (
              <div key={value} className="flex-1 flex items-center">
                <div className={`h-2 flex-1 rounded-full transition-colors duration-500 ${value <= step ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                {value < STEPS.length && <div className="w-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card min-h-[560px] flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-1 p-8 md:p-12"
            >
              {step === 1 && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold mb-2">How would you like to interview?</h2>
                    <p className="text-gray-400">Choose your preferred interaction mode.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <button
                      onClick={() => updateConfig({ mode: 'voice' })}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${config.mode === 'voice' ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(99,102,241,0.2)] scale-[1.02]' : 'border-white/10 bg-surface/50 hover:bg-surface hover:border-white/20'}`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${config.mode === 'voice' ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 group-hover:text-primary'}`}>
                        <Mic size={28} />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Voice Interview</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">Realistic spoken AI interview for communication, pressure, and thinking on your feet.</p>
                    </button>

                    <button
                      onClick={() => updateConfig({ mode: 'text' })}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${config.mode === 'text' ? 'border-secondary bg-secondary/10 shadow-[0_0_30px_rgba(168,85,247,0.2)] scale-[1.02]' : 'border-white/10 bg-surface/50 hover:bg-surface hover:border-white/20'}`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${config.mode === 'text' ? 'bg-secondary text-white' : 'bg-white/5 text-gray-400 group-hover:text-secondary'}`}>
                        <MessageSquare size={28} />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Text Interview</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">Chat-based adaptive AI interview for deeper technical reasoning and cleaner transcript review.</p>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold mb-2">What is the focus of this interview?</h2>
                    <p className="text-gray-400">Select a primary domain or enter a custom topic.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {TOPICS.map((topic) => {
                      const selected = config.topic === topic.id && !config.customTopic;
                      return (
                        <button
                          key={topic.id}
                          onClick={() => updateConfig({ topic: topic.id, customTopic: '' })}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${selected ? 'border-primary bg-primary/20 text-white' : 'border-white/10 bg-surface/50 text-gray-400 hover:bg-surface hover:text-gray-200'}`}
                        >
                          <topic.icon size={20} className={selected ? 'text-primary' : ''} />
                          <span className="font-medium">{topic.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-w-xl mx-auto pt-4 relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-sm font-medium leading-6">
                      <span className="bg-background px-4 text-gray-500 glass-card rounded-full">OR</span>
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto">
                    <Input
                      placeholder="E.g., Advanced GraphQL system design"
                      label="Custom Topic"
                      value={config.customTopic}
                      onChange={(event) => updateConfig({ customTopic: event.target.value, topic: 'custom' })}
                      className={config.customTopic ? 'border-primary focus:border-primary' : ''}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-12 max-w-3xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold mb-2">Set the benchmark</h2>
                    <p className="text-gray-400">Calibrate expectations before the timer starts.</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Experience Level</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['Fresher', 'Intermediate', 'Experienced'].map((experienceLevel) => (
                        <button
                          key={experienceLevel}
                          onClick={() => updateConfig({ experienceLevel })}
                          className={`py-4 rounded-xl border transition-all duration-200 font-medium ${config.experienceLevel === experienceLevel ? 'border-primary bg-primary/20 text-white' : 'border-white/10 bg-surface/50 text-gray-400 hover:bg-surface'}`}
                        >
                          {experienceLevel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Difficulty Level</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                        <button
                          key={difficulty}
                          onClick={() => updateConfig({ difficulty })}
                          className={`py-4 rounded-xl border transition-all duration-200 font-medium ${config.difficulty === difficulty ? 'border-amber-300 bg-amber-400/10 text-white' : 'border-white/10 bg-surface/50 text-gray-400 hover:bg-surface'}`}
                        >
                          {difficulty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold mb-2">Choose your timed assessment window</h2>
                    <p className="text-gray-400">This controls countdown behavior and target question depth.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {DURATIONS.map((duration) => {
                      const selected = config.duration === duration.value;
                      return (
                        <button
                          key={duration.value}
                          onClick={() => updateConfig({ duration: duration.value })}
                          className={`rounded-2xl border p-6 text-left transition-all duration-300 ${selected ? 'border-primary bg-primary/15 shadow-[0_0_30px_rgba(99,102,241,0.2)] -translate-y-1' : 'border-white/10 bg-surface/50 hover:border-white/20 hover:bg-surface'}`}
                        >
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary mb-6">
                            <Clock3 size={22} />
                          </div>
                          <div className="text-2xl font-semibold text-white mb-2">{duration.label}</div>
                          <p className="text-sm text-gray-400">{duration.detail}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8 max-w-3xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold mb-2">Final Touches</h2>
                    <p className="text-gray-400">Pick the interviewer persona and review your setup.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {[
                      { id: 'Friendly', desc: 'Supportive and encouraging.' },
                      { id: 'FAANG', desc: 'High expectations and sharp follow-ups.' },
                      { id: 'Startup', desc: 'Practical, execution-first questioning.' },
                      { id: 'Strict', desc: 'Formal and evaluation-heavy.' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => updateConfig({ style: style.id })}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 ${config.style === style.id ? 'border-primary bg-primary/20' : 'border-white/10 bg-surface/50 hover:bg-surface'}`}
                      >
                        <h4 className={`font-medium mb-1 ${config.style === style.id ? 'text-white' : 'text-gray-300'}`}>{style.id}</h4>
                        <p className="text-xs text-gray-500">{style.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="p-6 rounded-2xl bg-surfaceHighlight border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Ready to start</p>
                      <h3 className="text-xl font-semibold text-white capitalize">
                        {config.experienceLevel} {resolvedTopic}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <span className="text-primary">{config.mode} Mode</span>
                        <span className="text-warning">{config.difficulty} Difficulty</span>
                        <span className="text-emerald-300">{config.duration} minutes</span>
                        <span className="text-secondary">{config.style}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Zap size={24} />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="p-6 border-t border-white/5 bg-surface/50 flex items-center justify-between mt-auto">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1}
              className={step === 1 ? 'invisible' : ''}
            >
              <ArrowLeft size={18} className="mr-2" /> Back
            </Button>

            {step < 5 ? (
              <Button
                onClick={nextStep}
                disabled={(step === 1 && !config.mode) || (step === 2 && !config.topic && !config.customTopic)}
                className="glow-effect"
              >
                Continue <ChevronRight size={18} className="ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="glow-effect bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                Launch Assessment <Sparkles size={18} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
