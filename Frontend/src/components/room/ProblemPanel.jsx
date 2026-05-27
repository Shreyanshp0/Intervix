import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Code, Clock, ThumbsUp, ThumbsDown, User, Shield, HelpCircle } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

const ProblemPanel = ({ problem, role, executionHistory = [] }) => {
  const { activeProblemTab, setProblemTab } = useRoomStore();

  const difficulty = problem?.difficulty || 'Medium';
  const estimatedTime = problem?.estimatedTime || '45 mins';
  const roleName = role === 'recruiter' || role === 'admin' ? 'Recruiter' : 'Candidate';

  const getDifficultyColor = (diff) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400';
      case 'hard':
        return 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400';
      case 'medium':
      default:
        return 'from-cyan-500/20 to-indigo-500/20 border-cyan-500/30 text-cyan-400';
    }
  };

  return (
    <aside className="w-[340px] flex flex-col h-full border-r border-white/10 bg-[#090F1C]/80 backdrop-blur-md overflow-hidden flex-shrink-0 select-none">
      {/* Role and Session Information Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <div className={`h-6 px-2.5 rounded-full text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1 border ${
            role === 'recruiter' || role === 'admin'
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}>
            {role === 'recruiter' || role === 'admin' ? <Shield size={11} /> : <User size={11} />}
            {roleName}
          </div>
        </div>
        <div className="text-[11px] text-gray-400 font-mono">
          Ver. 1.4.0
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 border-b border-white/5 flex gap-4 bg-white/[0.005]">
        <button
          onClick={() => setProblemTab('problem')}
          className={`pb-2.5 text-xs font-semibold relative transition-colors ${
            activeProblemTab === 'problem' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BookOpen size={13} />
            Problem
          </span>
          {activeProblemTab === 'problem' && (
            <motion.div
              layoutId="activeProblemTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
            />
          )}
        </button>
        <button
          onClick={() => setProblemTab('submissions')}
          className={`pb-2.5 text-xs font-semibold relative transition-colors ${
            activeProblemTab === 'submissions' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Code size={13} />
            Submissions
            {executionHistory.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-gray-300">
                {executionHistory.length}
              </span>
            )}
          </span>
          {activeProblemTab === 'submissions' && (
            <motion.div
              layoutId="activeProblemTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
            />
          )}
        </button>
      </div>

      {/* Scrollable description or submissions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeProblemTab === 'problem' ? (
            <motion.div
              key="problem-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Problem Metadata Header */}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">{problem?.title || 'Coding Challenge'}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gradient-to-r border ${getDifficultyColor(difficulty)}`}>
                    {difficulty}
                  </span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> {estimatedTime}
                  </span>
                </div>
              </div>

              {/* Problem Body */}
              <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap font-sans">
                {problem?.description || 'Problem statement and description is loading...'}
              </div>

              {/* Examples */}
              {problem?.examples && problem.examples.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Examples</h3>
                  {problem.examples.map((ex, index) => (
                    <div key={index} className="glass-panel p-3.5 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
                      <div className="text-[11px] font-bold text-gray-400 uppercase">Example {index + 1}</div>
                      <div className="space-y-1.5 text-xs font-mono text-gray-300">
                        {ex.input && (
                          <div>
                            <span className="text-gray-500">Input:</span> <span className="text-cyan-400">{ex.input}</span>
                          </div>
                        )}
                        {ex.output && (
                          <div>
                            <span className="text-gray-500">Output:</span> <span className="text-indigo-400">{ex.output}</span>
                          </div>
                        )}
                        {ex.explanation && (
                          <div className="pt-1.5 border-t border-white/5 text-[11px] text-gray-400 font-sans italic">
                            <span className="text-gray-500 not-italic font-bold">Explanation:</span> {ex.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {problem?.constraints && problem.constraints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Constraints</h3>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-gray-400 font-mono">
                    {problem.constraints.map((c, index) => (
                      <li key={index}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Questions (recruiter visual guide or candidate stretch targets) */}
              <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] text-xs text-purple-200">
                <span className="font-semibold text-purple-300 flex items-center gap-1.5 mb-1">
                  <HelpCircle size={13} />
                  Stretch Goal / Follow-up
                </span>
                Can you solve this with O(N) time complexity and O(1) auxiliary space?
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="submissions-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {executionHistory.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                  <Code size={32} className="text-gray-600 mb-2" />
                  <div className="text-xs font-medium text-gray-400">No submissions yet</div>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">
                    Run your code using the editor control console to record execution attempts here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Execution Attempts</h3>
                  {executionHistory.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-white">
                            Attempt #{executionHistory.length - index}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                            {item.language}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(item.executedAt || Date.now()).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.success ? (
                          <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <CheckCircle size={12} />
                            Passed
                          </div>
                        ) : (
                          <div className="text-red-400 text-xs font-semibold">
                            Failed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Helpful/Not Helpful Footer */}
      <footer className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-xs text-gray-400 select-none">
        <span className="flex items-center gap-1">
          Was this clear?
        </span>
        <div className="flex items-center gap-2">
          <button className="h-7 w-7 rounded-md hover:bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95">
            <ThumbsUp size={12} />
          </button>
          <button className="h-7 w-7 rounded-md hover:bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95">
            <ThumbsDown size={12} />
          </button>
        </div>
      </footer>
    </aside>
  );
};

export default ProblemPanel;
