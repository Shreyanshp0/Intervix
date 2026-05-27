import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Terminal, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Type,
  SunMoon,
  Loader2,
  Lock,
  Unlock,
  Check
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

const CodeEditorPanel = ({
  code,
  language,
  onLanguageChange,
  executionStatus,
  output,
  onRunCode,
  onEditorMount,
  editorLocked,
  isRecruiter,
  remoteCursor,
  remoteTyping,
  saveStatus = 'autosaved' // 'saving' | 'autosaved' | 'idle'
}) => {
  const { 
    editorFontSize, 
    setFontSize, 
    editorTheme, 
    setTheme, 
    isFullscreen, 
    toggleFullscreen 
  } = useRoomStore();

  const [consoleTab, setConsoleTab] = useState('output'); // 'output' | 'testcases' | 'performance'
  const [customInput, setCustomInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Check if editor is read-only (locked by recruiter and user is a candidate)
  const isReadOnly = editorLocked && !isRecruiter;

  const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'java', label: 'Java' }
  ];

  // Parse whether output is a clean pass
  const isExecutionSuccess = output && (output.toLowerCase().includes('success') || output.toLowerCase().includes('all test cases passed') || output.toLowerCase().includes('hello interview'));

  return (
    <section className={`flex-1 flex flex-col h-full bg-[#080C16] border-r border-white/5 relative overflow-hidden select-none ${
      isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
    }`}>
      {/* Top Controls Header */}
      <div className="h-12 border-b border-white/10 bg-[#0E1424]/90 backdrop-blur px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
            <FileCode size={14} className="text-cyan-400" />
            <span>Workspace</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="h-8 rounded-lg border border-white/10 bg-[#060A14] px-2.5 text-xs font-semibold text-gray-200 outline-none hover:border-white/20 transition-all cursor-pointer select-none appearance-none pr-8 min-w-[110px]"
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Lock State Visual Indicator */}
          {editorLocked && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              <Lock size={10} />
              Locked
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Typing/Cursor status */}
          <AnimatePresence mode="wait">
            {remoteTyping && (
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[11px] text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full font-medium"
              >
                {remoteTyping.role === 'recruiter' ? 'Recruiter' : 'Candidate'} is typing...
              </motion.span>
            )}
            {!remoteTyping && remoteCursor && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] font-mono text-gray-500 max-sm:hidden"
              >
                Peer: L{remoteCursor.lineNumber}:C{remoteCursor.column}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 bg-white/[0.02] px-2 py-1 rounded-md border border-white/5">
            <div className={`h-1.5 w-1.5 rounded-full ${
              saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`} />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* AI Helper trigger */}
          <button 
            title="Ask AI Copilot"
            className="h-8 w-8 rounded-lg hover:bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors active:scale-95"
          >
            <Sparkles size={14} className="animate-pulse" />
          </button>

          {/* Editor Settings popover */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95 ${
                showSettings ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
            >
              <Settings size={14} />
            </button>

            <AnimatePresence>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowSettings(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0E1424] shadow-2xl p-3 z-30 space-y-3.5 select-none"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Settings</div>
                    
                    {/* Font Size Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                        <Type size={11} /> Font Size ({editorFontSize}px)
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="24"
                        value={editorFontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Editor Theme Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                        <SunMoon size={11} /> Visual Theme
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setTheme('vs-dark')}
                          className={`px-2 py-1 text-[10px] font-medium rounded-md border text-center transition-colors ${
                            editorTheme === 'vs-dark'
                              ? 'bg-primary/20 border-primary text-white'
                              : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          Midnight
                        </button>
                        <button
                          onClick={() => setTheme('hc-black')}
                          className={`px-2 py-1 text-[10px] font-medium rounded-md border text-center transition-colors ${
                            editorTheme === 'hc-black'
                              ? 'bg-primary/20 border-primary text-white'
                              : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          High Contrast
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Fullscreen view toggle */}
          <button
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-lg hover:bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-95"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="flex-1 min-h-0 relative bg-[#060910]">
        <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language}
          theme={editorTheme}
          value={code}
          onMount={onEditorMount}
          options={{
            readOnly: isReadOnly,
            minimap: { enabled: false },
            fontSize: editorFontSize,
            lineHeight: 22,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderWhitespace: 'selection',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 }
          }}
        />

        {/* Locked Overlay for Candidate */}
        {isReadOnly && (
          <div className="absolute inset-0 bg-[#060910]/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-6 z-10">
            <div className="p-4 rounded-2xl border border-white/5 bg-[#0D1222]/80 shadow-2xl max-w-sm flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Editor is locked</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  The recruiter has temporarily paused code editing capabilities. You will still see real-time updates.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Cursor Flags */}
      {remoteCursor && (
        <div 
          className="absolute pointer-events-none z-20 text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono shadow-[0_0_10px_rgba(34,211,238,0.4)] flex items-center gap-1 transition-all duration-100"
          style={{
            // Note: In visual mockups, we render a representation, absolute coordinates would need monaco overlays.
            display: 'none' 
          }}
        >
          {remoteCursor.role === 'recruiter' ? 'Recruiter' : 'Candidate'}
        </div>
      )}

      {/* Bottom Console execution panel drawer */}
      <div className="h-56 border-t border-white/10 bg-[#060910] flex flex-col min-h-0">
        {/* Console headers */}
        <div className="h-9 px-3 border-b border-white/5 bg-[#090E1A]/85 backdrop-blur flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setConsoleTab('output')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                consoleTab === 'output' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Terminal size={12} />
              Console Output
            </button>
            <button
              onClick={() => setConsoleTab('testcases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                consoleTab === 'testcases' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <CheckCircle2 size={12} />
              Test Cases
            </button>
            <button
              onClick={() => setConsoleTab('performance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                consoleTab === 'performance' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              Performance Tab
            </button>
          </div>

          {/* Execution Controls */}
          <button
            onClick={onRunCode}
            disabled={executionStatus === 'running' || isReadOnly}
            className="h-7 px-3.5 bg-gradient-to-r from-primary to-accent hover:from-indigo-400 hover:to-cyan-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all select-none"
          >
            {executionStatus === 'running' ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                Run Code
              </>
            )}
          </button>
        </div>

        {/* Tab contents */}
        <div className="flex-1 min-h-0 bg-[#060910] overflow-y-auto p-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {consoleTab === 'output' && (
              <motion.div
                key="output-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="h-full font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap select-text"
              >
                {/* Visual success banner indicator */}
                {isExecutionSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 animate-bounce" />
                    <div className="font-sans text-xs">
                      <span className="font-bold">Execution Successful:</span> All sample test cases passed flawlessly!
                    </div>
                  </motion.div>
                )}

                {output ? (
                  output
                ) : (
                  <span className="text-gray-500 font-sans italic">
                    Press "Run Code" above to compile, execute, and verify your program. Results will appear here in real-time.
                  </span>
                )}
              </motion.div>
            )}

            {consoleTab === 'testcases' && (
              <motion.div
                key="testcases-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="space-y-4"
              >
                <div className="flex gap-2">
                  <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-bold text-gray-300 cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-1 select-none">
                    <Check size={11} className="text-emerald-400" /> Case 1: Ideal input
                  </div>
                  <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-bold text-gray-300 cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-1 select-none">
                    <Check size={11} className="text-emerald-400" /> Case 2: Boundary/Empty limits
                  </div>
                  <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-bold text-gray-300 cursor-pointer hover:bg-white/10 transition-colors select-none">
                    + Custom Input
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Custom Test Input</label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Provide standard input (stdin) to pass into your solution..."
                    className="w-full h-16 resize-none rounded-xl border border-white/10 bg-[#0b0f19] p-3 text-xs text-gray-300 outline-none hover:border-white/20 focus:border-primary/50 transition-all font-mono"
                  />
                </div>
              </motion.div>
            )}

            {consoleTab === 'performance' && (
              <motion.div
                key="performance-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="grid grid-cols-3 gap-4"
              >
                <div className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Run Time</div>
                  <div className="text-2xl font-bold text-white mt-1.5 font-mono">14ms</div>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    ▲ Faster than 94.5% submissions
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Memory Usage</div>
                  <div className="text-2xl font-bold text-white mt-1.5 font-mono">24.2 MB</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Under threshold of 256.0 MB
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time Complexity</div>
                  <div className="text-2xl font-bold text-white mt-1.5 font-mono">O(N) Expected</div>
                  <div className="text-[10px] text-cyan-400 mt-1">
                    Optimal linear evaluation
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default CodeEditorPanel;
