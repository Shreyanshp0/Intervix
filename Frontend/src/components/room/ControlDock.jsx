import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  MonitorUp, 
  ScreenShareOff, 
  Hand, 
  Users, 
  MoreHorizontal, 
  X,
  AlertTriangle,
  Lock,
  Unlock,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

const ControlDock = ({
  micEnabled,
  toggleMic,
  cameraEnabled,
  toggleCamera,
  screenSharing,
  startScreenShare,
  stopScreenShare,
  isRecruiter,
  editorLocked,
  paused,
  onRecruiterAction, // recruiterAction(event, payload)
  onLeaveRoom,
  onEndRoom,
  onToggleHandRaised
}) => {
  const { handRaised, setHandRaised } = useRoomStore();
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleRaiseHand = () => {
    if (onToggleHandRaised) {
      onToggleHandRaised();
    } else {
      setHandRaised(!handRaised);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="glass-panel px-6 py-3.5 rounded-full border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl bg-[#0b0f19]/70 flex items-center gap-4.5"
        >
          {/* Microphone toggle */}
          <button
            onClick={toggleMic}
            title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${
              micEnabled 
                ? 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10' 
                : 'border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30'
            }`}
          >
            {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          </button>

          {/* Camera toggle */}
          <button
            onClick={toggleCamera}
            title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${
              cameraEnabled 
                ? 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10' 
                : 'border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30'
            }`}
          >
            {cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
          </button>

          {/* Screen Share toggle (Only for Candidate in standard rooms, but let Recruiter trigger preview too) */}
          <button
            onClick={screenSharing ? stopScreenShare : startScreenShare}
            disabled={isRecruiter} // Rule: Recruiter can preview but Candidate is sharing
            title={screenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:pointer-events-none ${
              screenSharing 
                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
            }`}
          >
            {screenSharing ? <ScreenShareOff size={16} /> : <MonitorUp size={16} />}
          </button>

          {/* Raise Hand toggle */}
          <button
            onClick={handleRaiseHand}
            title="Raise Hand"
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${
              handRaised 
                ? 'border-amber-500/30 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
            }`}
          >
            <Hand size={16} className={handRaised ? 'animate-bounce' : ''} />
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Recruiter Advanced Controls popover */}
          {isRecruiter && (
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="Room Options"
                className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${
                  showMoreMenu ? 'border-primary bg-primary/20 text-white' : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                <MoreHorizontal size={16} />
              </button>

              <AnimatePresence>
                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowMoreMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: -130, scale: 1 }} // Shift upwards from dock
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      className="absolute left-1/2 -translate-x-1/2 w-48 rounded-2xl border border-white/10 bg-[#0E1424] shadow-2xl p-2.5 z-30 space-y-1.5"
                    >
                      <button
                        onClick={() => {
                          onRecruiterAction('lock_editor', { locked: !editorLocked });
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-3 py-2 hover:bg-white/5 rounded-xl text-left text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                      >
                        {editorLocked ? <Unlock size={13} className="text-cyan-400" /> : <Lock size={13} className="text-amber-400" />}
                        {editorLocked ? 'Unlock Editor' : 'Lock Editor'}
                      </button>

                      <button
                        onClick={() => {
                          onRecruiterAction('pause_interview', { paused: !paused });
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-3 py-2 hover:bg-white/5 rounded-xl text-left text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <Pause size={13} className="text-amber-400" />
                        {paused ? 'Resume Interview' : 'Pause Interview'}
                      </button>

                      <button
                        onClick={() => {
                          onRecruiterAction('request_screen_share');
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-3 py-2 hover:bg-white/5 rounded-xl text-left text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <MonitorUp size={13} className="text-cyan-400" />
                        Request Screen
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* End/Leave Interview Button */}
          {isRecruiter ? (
            <button
              onClick={() => setShowConfirmEnd(true)}
              className="h-10 px-5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-full text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <X size={14} />
              End Session
            </button>
          ) : (
            <button
              onClick={onLeaveRoom}
              className="h-10 px-5 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5"
            >
              <X size={14} />
              Leave Room
            </button>
          )}

        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmEnd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmEnd(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0E1322] shadow-[0_20px_50px_rgba(239,68,68,0.2)] p-6 z-10 text-center select-none"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-bounce">
                <AlertTriangle size={20} />
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                Delete & End Interview Session?
              </h3>
              
              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                Ending this interview is an <span className="text-red-400 font-bold">irreversible</span> operations. Sockets will disconnect, WebRTC streams will immediately close, and the candidate will be redirected. The room cannot be re-accessed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmEnd(false)}
                  className="flex-1 h-10 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmEnd(false);
                    onEndRoom();
                  }}
                  className="flex-1 h-10 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 transition-all"
                >
                  Confirm End
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ControlDock;
