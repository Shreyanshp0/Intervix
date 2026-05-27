import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarClock, 
  MessageSquareText, 
  Sparkles, 
  Video, 
  X, 
  AlertTriangle,
  BellRing
} from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

const TOAST_ICONS = {
  INTERVIEW_SCHEDULED: <CalendarClock size={16} className="text-cyan-400" />,
  INTERVIEW_UPDATED: <Sparkles size={16} className="text-cyan-400" />,
  INTERVIEW_CANCELLED: <AlertTriangle size={16} className="text-red-400" />,
  RECRUITER_MESSAGE: <MessageSquareText size={16} className="text-purple-400" />,
  ROOM_READY: <Video size={16} className="text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />,
  INTERVIEW_STARTING: <BellRing size={16} className="text-amber-400" />,
  FEEDBACK_RECEIVED: <MessageSquareText size={16} className="text-purple-400" />
};

const TOAST_BORDER_COLORS = {
  INTERVIEW_SCHEDULED: 'border-cyan-500/20 bg-cyan-500/[0.03]',
  INTERVIEW_UPDATED: 'border-cyan-500/20 bg-cyan-500/[0.03]',
  INTERVIEW_CANCELLED: 'border-red-500/20 bg-red-500/[0.03]',
  RECRUITER_MESSAGE: 'border-purple-500/20 bg-purple-500/[0.03]',
  ROOM_READY: 'border-emerald-500/25 bg-emerald-500/[0.03] shadow-[0_0_15px_rgba(16,185,129,0.1)]',
  INTERVIEW_STARTING: 'border-amber-500/20 bg-amber-500/[0.03]',
  FEEDBACK_RECEIVED: 'border-purple-500/20 bg-purple-500/[0.03]'
};

const ToastItem = ({ toast }) => {
  const { removeToast } = useNotificationStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 6000); // Auto dismiss after 6 seconds
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const icon = TOAST_ICONS[toast.type] || <BellRing size={16} className="text-cyan-400" />;
  const style = TOAST_BORDER_COLORS[toast.type] || 'border-white/10 bg-white/[0.03]';

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className={`w-80 rounded-2xl border backdrop-blur-xl p-4 flex gap-3 shadow-[0_15px_30px_rgba(0,0,0,0.5)] pointer-events-auto ${style}`}
    >
      <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white tracking-tight uppercase">
          {toast.title}
        </h4>
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed leading-4">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 self-start text-gray-500 hover:text-white p-0.5 rounded-lg transition-colors"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
};

const RealtimeToastContainer = () => {
  const { toasts } = useNotificationStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RealtimeToastContainer;
