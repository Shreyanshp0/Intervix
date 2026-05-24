import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, Code } from 'lucide-react';
import { Link } from 'react-router-dom';

const LiveVideoInterview = () => {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  // TODO: Connect WebRTC via Socket.io signaling
  // TODO: Implement getusermedia for local video stream

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden relative">
      
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-center px-6">
        <div className="text-white font-medium">Frontend Engineer Interview</div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            REC
          </div>
          <div className="text-gray-300 text-sm font-mono">45:12</div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 flex gap-4 mt-12 mb-20">
        {/* Remote Video (Recruiter) */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-surfaceHighlight border border-white/10 group">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-surface flex items-center justify-center text-4xl text-gray-500">
              R
            </div>
            {/* TODO: `<video autoPlay playsInline />` goes here */}
          </div>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-sm text-white flex items-center gap-2">
            Recruiter
          </div>
        </div>

        {/* Local Video (Candidate) */}
        <div className="w-1/3 max-w-sm relative rounded-2xl overflow-hidden bg-surface border border-white/10">
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            {videoOn ? (
              <span className="text-gray-500 text-sm">Camera Stream Placeholder</span>
            ) : (
              <div className="w-20 h-20 rounded-full bg-surfaceHighlight flex items-center justify-center text-2xl text-gray-400">
                You
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-sm text-white flex items-center gap-2">
            You {!micOn && <MicOff size={14} className="text-red-400" />}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center items-center z-20">
        <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-4">
          
          <button 
            onClick={() => setMicOn(!micOn)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${micOn ? 'bg-surfaceHighlight hover:bg-surface text-white' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button 
            onClick={() => setVideoOn(!videoOn)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${videoOn ? 'bg-surfaceHighlight hover:bg-surface text-white' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
          >
            {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <button className="w-12 h-12 rounded-xl bg-surfaceHighlight hover:bg-surface text-white flex items-center justify-center transition-colors">
            <MonitorUp size={20} />
          </button>

          <Link to="/candidate/interview/coding">
            <button className="w-12 h-12 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 flex items-center justify-center transition-colors group relative">
              <Code size={20} />
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black text-white text-xs py-1 px-2 rounded">Code</span>
            </button>
          </Link>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <button className="px-6 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 transition-colors">
            <PhoneOff size={18} /> Leave
          </button>

        </div>
      </div>

    </div>
  );
};

export default LiveVideoInterview;
