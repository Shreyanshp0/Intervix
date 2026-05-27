import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  AreaChart,
  Area,
  Tooltip
} from 'recharts';
import { 
  Users, 
  FileText, 
  Sparkles, 
  Notebook, 
  MessageSquare, 
  Wifi, 
  MicOff, 
  CameraOff, 
  Send,
  User,
  Shield,
  Clock,
  Radio
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

const VideoInsightsPanel = ({
  localVideoRef,
  remoteWebcamVideoRef,
  remoteScreenVideoRef,
  micEnabled,
  cameraEnabled,
  screenSharing,
  remoteScreenSharing,
  isRecruiter,
  candidate = {},
  resume = {},
  messages = [],
  prompt,
  setPrompt,
  onSendPrompt,
  quality = 'good',
  status = 'Connected'
}) => {
  const { 
    activeRightTab, 
    setRightTab, 
    recruiterNotes, 
    updateNotes,
    participantsMedia
  } = useRoomStore();

  const [activeSpeaker, setActiveSpeaker] = useState('candidate'); // 'candidate' | 'recruiter'

  // Toggle active speaker mock for UI dynamic feel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSpeaker(prev => prev === 'candidate' ? 'recruiter' : 'candidate');
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Skill Radar Chart Data
  const radarData = [
    { subject: 'Problem Solving', A: 85, fullMark: 100 },
    { subject: 'Data Structures', A: 78, fullMark: 100 },
    { subject: 'JavaScript/ES6', A: 90, fullMark: 100 },
    { subject: 'System Design', A: 65, fullMark: 100 },
    { subject: 'Communication', A: 82, fullMark: 100 },
  ];

  const getConnectionLabel = (q) => {
    switch (q) {
      case 'poor': return { label: 'Poor', color: 'text-red-400 bg-red-400/10 border-red-400/20' };
      case 'fair': return { label: 'Fair', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
      case 'good':
      default:
        return { label: 'Excellent', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    }
  };

  const conn = getConnectionLabel(quality);

  return (
    <aside className="w-[360px] flex flex-col h-full bg-[#090F1C]/80 backdrop-blur-md border-l border-white/10 overflow-hidden flex-shrink-0 select-none">
      
      {/* WebRTC Video Panels Section */}
      <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.005]">
        
        {/* Connection Quality Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Radio size={12} className="text-cyan-400 animate-pulse" />
            Collaboration Feed
          </span>
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${conn.color}`}>
            <Wifi size={10} />
            {conn.label}
          </div>
        </div>

        {/* Video Feeds Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Candidate webcam feed */}
          <div className="relative aspect-video rounded-xl border border-white/5 bg-[#050810] overflow-hidden group shadow-lg">
            {/* Speaker active glowing aura using Framer Motion */}
            {activeSpeaker === 'candidate' && (
              <motion.div
                layoutId="activeSpeakerGlow"
                className="absolute inset-0 border-2 border-cyan-400 rounded-xl pointer-events-none z-10 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                transition={{ duration: 0.3 }}
              />
            )}
            
            <video 
              ref={isRecruiter ? remoteWebcamVideoRef : localVideoRef} 
              autoPlay 
              playsInline 
              muted={!isRecruiter}
              className="h-full w-full object-cover" 
            />

            {/* Video muted overlay placeholder */}
            {(!participantsMedia.candidate.cameraEnabled) && (
              <div className="absolute inset-0 bg-[#090D1A]/95 backdrop-blur-sm flex flex-col items-center justify-center text-gray-500 gap-1.5 z-10 transition-all select-none border border-cyan-500/10">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center"
                >
                  <CameraOff size={18} className="animate-pulse" />
                </motion.div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-cyan-400/80 mt-1">CAM MUTED</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-gray-200 border border-white/5 flex items-center gap-1 z-10">
              <User size={10} className="text-cyan-400" />
              Candidate {(!participantsMedia.candidate.micEnabled) && <MicOff size={8} className="text-red-400" />}
              {participantsMedia.candidate.handRaised && (
                <span className="text-amber-400 text-[8px] font-bold px-1 bg-amber-400/20 rounded border border-amber-400/30 animate-bounce">✋ Hand Raised</span>
              )}
            </div>
          </div>

          {/* Recruiter webcam feed */}
          <div className="relative aspect-video rounded-xl border border-white/5 bg-[#050810] overflow-hidden group shadow-lg">
            {activeSpeaker === 'recruiter' && (
              <motion.div
                layoutId="activeSpeakerGlow"
                className="absolute inset-0 border-2 border-purple-400 rounded-xl pointer-events-none z-10 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                transition={{ duration: 0.3 }}
              />
            )}

            <video 
              ref={isRecruiter ? localVideoRef : remoteWebcamVideoRef} 
              autoPlay 
              playsInline 
              muted={isRecruiter}
              className="h-full w-full object-cover" 
            />

            {/* Video muted overlay placeholder */}
            {(!participantsMedia.recruiter.cameraEnabled) && (
              <div className="absolute inset-0 bg-[#090D1A]/95 backdrop-blur-sm flex flex-col items-center justify-center text-gray-500 gap-1.5 z-10 transition-all select-none border border-purple-500/10">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-3.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] flex items-center justify-center"
                >
                  <CameraOff size={18} className="animate-pulse" />
                </motion.div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-purple-400/80 mt-1">CAM MUTED</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-gray-200 border border-white/5 flex items-center gap-1 z-10">
              <Shield size={10} className="text-purple-400" />
              Recruiter {(!participantsMedia.recruiter.micEnabled) && <MicOff size={8} className="text-red-400" />}
              {participantsMedia.recruiter.handRaised && (
                <span className="text-amber-400 text-[8px] font-bold px-1 bg-amber-400/20 rounded border border-amber-400/30 animate-bounce">✋ Hand Raised</span>
              )}
            </div>
          </div>
        </div>

        {/* Candidate screen share preview (Recruiter Dashboard only) */}
        {isRecruiter && remoteScreenSharing && (
          <div className="relative aspect-video rounded-xl border border-emerald-500/20 bg-[#050810] overflow-hidden group shadow-lg">
            <video 
              ref={remoteScreenVideoRef} 
              autoPlay 
              playsInline 
              className="h-full w-full object-contain" 
            />
            <div className="absolute top-2 right-2 rounded-md bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 text-[8px] tracking-widest uppercase animate-pulse">
              Live Share
            </div>
            <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-gray-200 border border-white/5">
              Candidate Screen
            </div>
          </div>
        )}
      </div>

      {/* Tabs list for bottom analytics */}
      <div className="px-3 pt-2 border-b border-white/5 flex justify-between bg-white/[0.005]">
        <button
          onClick={() => setRightTab('ai')}
          className={`pb-2.5 text-xs font-semibold relative transition-colors ${
            activeRightTab === 'ai' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1">
            <Sparkles size={13} className="text-cyan-400" />
            AI Insights
          </span>
          {activeRightTab === 'ai' && (
            <motion.div
              layoutId="activeRightTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
            />
          )}
        </button>

        {isRecruiter && (
          <button
            onClick={() => setRightTab('resume')}
            className={`pb-2.5 text-xs font-semibold relative transition-colors ${
              activeRightTab === 'resume' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <FileText size={13} />
              Resume
            </span>
            {activeRightTab === 'resume' && (
              <motion.div
                layoutId="activeRightTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
              />
            )}
          </button>
        )}

        <button
          onClick={() => setRightTab('participants')}
          className={`pb-2.5 text-xs font-semibold relative transition-colors ${
            activeRightTab === 'participants' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1">
            <Users size={13} />
            Users
          </span>
          {activeRightTab === 'participants' && (
            <motion.div
              layoutId="activeRightTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
            />
          )}
        </button>

        {isRecruiter && (
          <button
            onClick={() => setRightTab('notes')}
            className={`pb-2.5 text-xs font-semibold relative transition-colors ${
              activeRightTab === 'notes' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <Notebook size={13} />
              Notes
            </span>
            {activeRightTab === 'notes' && (
              <motion.div
                layoutId="activeRightTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
              />
            )}
          </button>
        )}

        <button
          onClick={() => setRightTab('chat')}
          className={`pb-2.5 text-xs font-semibold relative transition-colors ${
            activeRightTab === 'chat' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-1">
            <MessageSquare size={13} />
            Chat
          </span>
          {activeRightTab === 'chat' && (
            <motion.div
              layoutId="activeRightTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
            />
          )}
        </button>
      </div>

      {/* Tab Panel contents */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          
          {/* AI INSIGHTS PANEL */}
          {activeRightTab === 'ai' && (
            <motion.div
              key="ai-insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Radar Chart skill visual */}
              <div className="glass-panel p-2 rounded-2xl border border-white/5 bg-white/[0.005] h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 'bold' }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={false} 
                      axisLine={false} 
                    />
                    <Radar 
                      name="Candidate Profile" 
                      dataKey="A" 
                      stroke="#22D3EE" 
                      fill="#6366F1" 
                      fillOpacity={0.25} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary description */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">AI Evaluation Summary</h4>
                <p className="text-[11px] leading-relaxed text-gray-300">
                  Candidate showcases exceptional structural JavaScript familiarity and clear O(N) space reduction ideas.
                  Communication remains steady, maintaining detailed walk-throughs of logic structures.
                </p>
              </div>

              {/* Strengths tags */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Identified Strengths</h4>
                <div className="flex flex-wrap gap-1.5">
                  {['Problem Solving', 'Data Structures', 'JavaScript', 'Structured Comms'].map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Real-time score metrics */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Communication Score</div>
                  <div className="text-xl font-bold text-white font-mono mt-1">82/100</div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-accent h-full rounded-full" style={{ width: '82%' }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Coding Structure</div>
                  <div className="text-xl font-bold text-white font-mono mt-1">90/100</div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-accent h-full rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>

              {/* AI suggested next question */}
              {isRecruiter && (
                <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] text-xs text-purple-200">
                  <span className="font-semibold text-purple-300 flex items-center gap-1.5 mb-1 font-mono">
                    💡 Suggested Next Question
                  </span>
                  "Ask candidate how they would implement garbage cleaning mechanics or handle high throughput queue limits for their solution."
                </div>
              )}
            </motion.div>
          )}

          {/* RESUME TAB (RECRUITER ONLY) */}
          {activeRightTab === 'resume' && isRecruiter && (
            <motion.div
              key="resume-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 text-xs"
            >
              <div>
                <h3 className="font-bold text-white text-sm">{candidate?.name || 'Candidate Name'}</h3>
                <div className="text-gray-400 mt-0.5">{candidate?.email || 'No email registered'}</div>
                {candidate?.location && <div className="text-gray-500 mt-0.5">{candidate.location}</div>}
              </div>

              <div className="h-px bg-white/5" />

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recruiter AI Summary</h4>
                <p className="leading-relaxed text-gray-300">
                  {resume?.aiAnalysis?.recruiterSummary || 'No parsed AI resume details loaded.'}
                </p>
              </div>

              {resume?.aiAnalysis?.skills && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Technical Skillset</h4>
                  <div className="flex flex-wrap gap-1">
                    {resume.aiAnalysis.skills.map((skill, index) => (
                      <span key={index} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400 text-[10px]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PARTICIPANTS LIST */}
          {activeRightTab === 'participants' && (
            <motion.div
              key="participants-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Connected Participants</div>
              
              {/* Recruiter block */}
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Shield size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Interview Board</div>
                    <div className="text-[10px] text-gray-500">Recruiter role</div>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              {/* Candidate block */}
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <User size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{candidate?.name || 'Applicant'}</div>
                    <div className="text-[10px] text-gray-500">Candidate role</div>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </motion.div>
          )}

          {/* RECRUITER NOTES */}
          {activeRightTab === 'notes' && isRecruiter && (
            <motion.div
              key="notes-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col min-h-0"
            >
              <textarea
                value={recruiterNotes}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="Write private recruiter logs here. This shorthand pad is autosaved and only visible to recruiters..."
                className="w-full h-44 resize-none rounded-xl border border-white/10 bg-[#070b15] p-3.5 text-xs text-gray-300 outline-none hover:border-white/20 focus:border-primary/50 transition-all font-sans leading-relaxed flex-1"
              />
            </motion.div>
          )}

          {/* ROOM CHAT TAB */}
          {activeRightTab === 'chat' && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col"
            >
              {/* Prompts list */}
              <div className="flex-1 min-h-0 space-y-2 mb-3.5 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="h-36 flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare size={24} className="text-gray-600 mb-1" />
                    <div className="text-[10px] font-medium text-gray-500">No chat messages yet</div>
                  </div>
                ) : (
                  messages.map((item, index) => {
                    const isSystem = !item.includes(':');
                    let sender = '';
                    let body = item;

                    if (!isSystem) {
                      const idx = item.indexOf(':');
                      sender = item.slice(0, idx);
                      body = item.slice(idx + 1);
                    }

                    return (
                      <div 
                        key={index} 
                        className={`p-2 rounded-xl border text-[11px] leading-relaxed ${
                          isSystem 
                            ? 'border-yellow-500/10 bg-yellow-500/[0.02] text-yellow-300/80 italic text-center'
                            : sender.toLowerCase().includes('recruiter') || sender.toLowerCase().includes('board')
                              ? 'border-purple-500/15 bg-purple-500/[0.02] text-purple-200'
                              : 'border-cyan-500/15 bg-cyan-500/[0.02] text-cyan-200'
                        }`}
                      >
                        {!isSystem && (
                          <div className="font-bold text-[10px] uppercase tracking-wider mb-0.5">
                            {sender}
                          </div>
                        )}
                        <div>{body}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat action input (Visible for Recruiter only in prompt context, or common chat) */}
              {isRecruiter ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Send prompt or hint..."
                    onKeyDown={(e) => { if (e.key === 'Enter') onSendPrompt(); }}
                    className="flex-1 h-8 rounded-lg border border-white/10 bg-[#070b15] px-3.5 text-xs text-gray-300 outline-none focus:border-primary/50 transition-all"
                  />
                  <button
                    onClick={onSendPrompt}
                    className="h-8 w-8 rounded-lg bg-primary hover:bg-indigo-400 text-white flex items-center justify-center flex-shrink-0 transition-colors active:scale-95 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                  >
                    <Send size={12} />
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-gray-500 text-center italic mt-2 border-t border-white/5 pt-2">
                  Only recruiters can broadcast guidance prompts in this room channel.
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </aside>
  );
};

export default VideoInsightsPanel;
