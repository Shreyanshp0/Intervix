import { useEffect, useState, useRef } from 'react';
import { Sparkles, Star, Clock, User, Briefcase, Code, Video, PhoneOff, Award, Save } from 'lucide-react';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { connectSocket } from '../../services/socket';
import { Panel } from '../../components/jobs/JobUi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import { safeArray } from '../../utils/safety';

const InterviewCenter = () => {
  const [interviews, setInterviews] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sockets / Synced State
  const [notepadContent, setNotepadContent] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [userJoined, setUserJoined] = useState(false);
  const [evalScores, setEvalScores] = useState({ technicalScore: 80, communicationScore: 80, feedback: '' });
  const [evalSaving, setEvalSaving] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.recruiter.liveInterviews);
        setInterviews(safeArray(response.data?.interviews, 'live interviews'));
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch scheduled live assessments.');
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchInterviews();
  }, [activeRoom]);

  // Connect socket when entering a room
  useEffect(() => {
    if (!activeRoom) {
      if (socketRef.current) {
        socketRef.current.emit('live:end', { roomId: activeRoom?._id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('live:join', {
      roomId: activeRoom._id,
      role: 'recruiter',
      userName: 'Recruiter'
    });

    socket.on('live:user_joined', ({ role, userName }) => {
      setUserJoined(true);
      console.log(`${userName} (${role}) joined live assessment room`);
    });

    socket.on('live:notepad_updated', ({ content }) => {
      setNotepadContent(content);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeRoom]);

  const handleNotepadChange = (val) => {
    setNotepadContent(val);
    if (socketRef.current && activeRoom) {
      socketRef.current.emit('live:notepad_sync', {
        roomId: activeRoom._id,
        content: val
      });
    }
  };

  const saveRoomNotepad = async () => {
    if (!activeRoom) return;
    try {
      await api.put(API_ROUTES.recruiter.liveInterviewNotepad(activeRoom._id), {
        notepadContent,
        recruiterNotes
      });
    } catch (err) {
      console.error('Failed to autosave live notepad:', err);
    }
  };

  // Autosave Notepad in DB every 10 seconds during active round
  useEffect(() => {
    if (!activeRoom) return;
    const interval = setInterval(() => {
      void saveRoomNotepad();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeRoom, notepadContent, recruiterNotes]);

  const handleLaunchRoom = (interview) => {
    setActiveRoom(interview);
    setNotepadContent(interview?.notepadContent || '');
    setRecruiterNotes(interview?.recruiterNotes || '');
    setUserJoined(false);
  };

  const submitEvaluation = async () => {
    if (!activeRoom) return;
    setEvalSaving(true);
    try {
      await api.post(API_ROUTES.recruiter.liveInterviewEvaluate(activeRoom._id), evalScores);
      alert('Technical round evaluation logged and verified skills synced successfully!');
      setActiveRoom(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log interview evaluation.');
    } finally {
      setEvalSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Launching Interview Center...</div>
      </div>
    );
  }

  // Split-Screen Interactive Technical Room View
  if (activeRoom) {
    return (
      <div className="h-[92vh] flex flex-col overflow-hidden -mx-4 -my-6 lg:-mx-8 text-left bg-slate-950">
        {/* Top Header Bar */}
        <div className="bg-slate-900 border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Video size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Live technical room: {activeRoom.candidate?.name}</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Role: {activeRoom.job?.roleTitle} • Status: {userJoined ? 'Candidate Connected' : 'Waiting for candidate...'}</p>
            </div>
          </div>
          <Button variant="danger" className="gap-1.5" onClick={() => setActiveRoom(null)}>
            <PhoneOff size={16} /> Exit Room
          </Button>
        </div>

        {/* Workspace Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Synced Technical Notepad */}
          <div className="flex-1 flex flex-col border-r border-white/5">
            <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex items-center gap-2 shrink-0">
              <Code size={14} className="text-primary" />
              <span className="text-xs text-gray-300 font-medium">Collaborative Technical Notepad Editor</span>
            </div>
            <textarea
              value={notepadContent}
              onChange={(e) => handleNotepadChange(e.target.value)}
              className="flex-1 bg-slate-950 p-6 text-xs font-mono text-emerald-400 outline-none resize-none leading-relaxed"
              placeholder="// Recruiter and Candidate live notepad edit. Paste templates or coding questions here..."
            />
          </div>

          {/* Right panel: Recruiter Notes & Evaluation Form */}
          <div className="w-[35%] flex flex-col overflow-y-auto p-6 space-y-6 bg-slate-900">
            {/* Recruiters Notes Notepad */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recruiter Private Notes Log</label>
              <textarea
                value={recruiterNotes}
                onChange={(e) => setRecruiterNotes(e.target.value)}
                className="w-full min-h-[140px] rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-gray-100 outline-none resize-none leading-relaxed"
                placeholder="Write private observations, code reviews, or dynamic architecture scoring points..."
              />
            </div>

            {/* Live Evaluation Panel */}
            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-5 space-y-4">
              <h4 className="text-xs uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1.5">
                <Award size={14} /> Evaluation Matrix Sheet
              </h4>
              <p className="text-[10px] text-gray-400 leading-normal">
                Score candidate live round. Submitting technical score will verify this topic in their profile immediately.
              </p>

              <div className="space-y-3">
                <Input
                  label="Technical Score (0-100)"
                  type="number"
                  value={evalScores.technicalScore}
                  onChange={(e) => setEvalScores(curr => ({ ...curr, technicalScore: e.target.value }))}
                />
                <Input
                  label="Communication Score (0-100)"
                  type="number"
                  value={evalScores.communicationScore}
                  onChange={(e) => setEvalScores(curr => ({ ...curr, communicationScore: e.target.value }))}
                />
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Feedback Summary</label>
                  <textarea
                    value={evalScores.feedback}
                    onChange={(e) => setEvalScores(curr => ({ ...curr, feedback: e.target.value }))}
                    className="w-full min-h-[100px] rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-gray-100 outline-none"
                    placeholder="Candidate demonstrated solid Node framework knowledge..."
                  />
                </div>
                <Button className="w-full mt-4 gap-1.5 glow-effect" onClick={submitEvaluation} isLoading={evalSaving}>
                  <Save size={16} /> Complete Round & Verify Skills
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(99,102,241,0.15),rgba(2,6,23,0.95))] border-white/10">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary w-fit">
          <Clock size={14} />
          Technical Coordinator
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Live technical interview coordinator center</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Coordinate, schedule, and launch live synchronized technical round notepad assessments with real-time feedback logging and dynamic verified skills populating.
        </p>
      </Panel>

      {error ? (
        <EmptyState
          title="Live interview center unavailable"
          description={error}
          actionLabel="Refresh"
          onAction={() => window.location.reload()}
        />
      ) : null}

      <div className="space-y-5">
        {interviews.length > 0 ? (
          interviews.map((item) => (
            <div key={item._id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:border-white/10 hover:bg-white/5">
              <div className="flex items-start gap-4">
                {item.candidate?.profilePhoto ? (
                  <img src={item.candidate.profilePhoto} alt={item.candidate?.name} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 shrink-0">
                    <User size={22} />
                  </div>
                )}
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white leading-tight">{item.candidate?.name}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5 capitalize"><Briefcase size={13} /> {item.job?.roleTitle} Role</span>
                    <span className="flex items-center gap-1.5"><Clock size={13} /> Scheduled: {new Date(item.scheduledAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize border ${
                  item.status === 'completed'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                }`}>
                  {item.status}
                </span>
                {item.status !== 'completed' && (
                  <Button className="gap-1.5 font-medium shadow-lg hover:scale-[1.01]" onClick={() => handleLaunchRoom(item)}>
                    <Video size={16} /> Launch Technical Room
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-xs text-gray-500 py-10 glass-card rounded-2xl border border-white/5">
            No live interview assessment rooms scheduled yet. Schedule live assessments inside candidate pipelines!
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewCenter;
