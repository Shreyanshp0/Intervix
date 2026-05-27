import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CalendarClock, 
  MessageSquareText, 
  Sparkles, 
  Video, 
  AlertTriangle,
  BellRing,
  CheckCheck,
  CheckCircle2
} from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';

const NOTIFICATION_ICONS = {
  INTERVIEW_SCHEDULED: <CalendarClock size={13} className="text-cyan-400" />,
  INTERVIEW_UPDATED: <Sparkles size={13} className="text-cyan-400" />,
  INTERVIEW_CANCELLED: <AlertTriangle size={13} className="text-red-400" />,
  RECRUITER_MESSAGE: <MessageSquareText size={13} className="text-purple-400" />,
  ROOM_READY: <Video size={13} className="text-emerald-400" />,
  INTERVIEW_STARTING: <BellRing size={13} className="text-amber-400 animate-bounce" />,
  FEEDBACK_RECEIVED: <MessageSquareText size={13} className="text-purple-400" />
};

const NotificationDropdown = () => {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationStore();
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      void fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (item) => {
    if (!item.read) {
      await markRead(item._id);
    }
    setIsOpen(false);

    // Route target based on notification metadata
    if (item.metadata?.roomId) {
      // Direct session or room routing
      if (item.metadata?.token) {
        navigate(`/interview/session?token=${encodeURIComponent(item.metadata.token)}`);
      } else {
        navigate(`/candidate/applications`);
      }
    } else if (item.type === 'RECRUITER_MESSAGE' || item.type === 'FEEDBACK_RECEIVED') {
      navigate('/candidate/applications');
    } else {
      navigate('/candidate/applications');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-9 w-9 rounded-xl border flex items-center justify-center transition-all duration-200 ${
          isOpen 
            ? 'border-primary bg-primary/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
            : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <Bell size={16} className={unreadCount > 0 ? 'animate-pulse text-cyan-400' : ''} />
        
        {/* Pulsing notification badge count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-cyan-400 border border-slate-950 text-[9px] font-extrabold text-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.5)] scale-100 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-white/10 bg-[#0c101b]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 flex flex-col overflow-hidden max-h-[420px] select-none"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.005]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-300">
                Notifications Hub
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <CheckCheck size={11} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications Scroll List */}
            <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="h-10 w-10 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 mb-2">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="text-[11px] font-semibold text-gray-400">All clear!</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">No notifications on file</div>
                </div>
              ) : (
                notifications.map((item) => {
                  const icon = NOTIFICATION_ICONS[item.type] || <BellRing size={13} className="text-cyan-400" />;
                  
                  return (
                    <div
                      key={item._id}
                      onClick={() => void handleNotificationClick(item)}
                      className={`p-3.5 flex gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors relative ${
                        !item.read ? 'bg-[#22d3ee]/[0.015]' : ''
                      }`}
                    >
                      {/* Left blue unread slice */}
                      {!item.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400" />
                      )}

                      {/* Icon */}
                      <div className="flex-shrink-0 h-6.5 w-6.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-[11px] font-bold leading-none ${!item.read ? 'text-cyan-400' : 'text-gray-300'}`}>
                            {item.title}
                          </h4>
                          <span className="text-[8px] text-gray-600 flex-shrink-0 font-medium font-mono">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed leading-4 break-words">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/5 bg-[#0b0e18]/80 text-center select-none text-[8.5px] text-gray-500 font-medium">
              Autosynced with active interview schedules
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
