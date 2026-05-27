import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Home } from 'lucide-react';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { disconnectSocket } from '../../services/socket';

const InterviewEndedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [countdown, setCountdown] = useState(10);

  // Secure Cleanup
  useEffect(() => {
    // Ensure any lingering WebRTC/Socket.io connections are aggressively terminated
    // Media tracks are handled by RoomPage's unmount, but severing the socket guarantees isolation
    disconnectSocket();
  }, []);

  // Auto-redirect handling
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, navigate]);

  const handleRedirect = () => {
    if (user?.role === 'recruiter' || user?.role === 'admin') {
      navigate('/recruiter/dashboard', { replace: true });
    } else if (user?.role === 'candidate') {
      navigate('/candidate/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/[0.02] border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-center">
        <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/20">
          <ShieldCheck size={32} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">Interview Ended</h1>
        
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          This interview session has ended. The room has been securely closed, and all media connections have been safely terminated.
        </p>

        <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-8">
          <p className="text-xs font-medium text-slate-300">
            Auto-redirecting in <span className="text-cyan-400 tabular-nums font-bold">{countdown}</span> seconds...
          </p>
          <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 gap-2 justify-center" onClick={handleRedirect}>
            Go to Dashboard <ArrowRight size={16} />
          </Button>
          
          {!user && (
            <Button variant="secondary" className="flex-1 gap-2 justify-center" onClick={() => navigate('/', { replace: true })}>
              <Home size={16} /> Go Home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewEndedPage;