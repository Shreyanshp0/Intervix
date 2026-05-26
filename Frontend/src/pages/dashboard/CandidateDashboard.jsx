import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Bot, CheckCircle2, FileText, MapPin, SearchCheck, Sparkles, Target, TrendingUp, Trophy, UserRound, Workflow, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import SafeResponsiveChart from '../../components/common/SafeResponsiveChart';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { safeArray, safeObject } from '../../utils/safety';

const CandidateDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [liveInterviews, setLiveInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [response, liveResponse] = await Promise.all([
          api.get(API_ROUTES.candidate.dashboard),
          api.get(API_ROUTES.candidate.liveInterviews).catch(() => ({ data: { interviews: [] } }))
        ]);
        setDashboard(safeObject(response.data, 'candidate dashboard'));
        setLiveInterviews(safeArray(liveResponse.data?.interviews, 'candidate live interviews'));
        setError('');
      } catch (error) {
        console.error('Failed to load candidate dashboard:', error);
        setError(error.response?.data?.message || 'Failed to load candidate dashboard.');
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse flex items-center gap-2">
          <Bot size={16} className="animate-spin text-primary" />
          Loading candidate dashboard...
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <EmptyState
        title="Candidate dashboard not ready"
        description={error || 'Your dashboard is loading onboarding-safe data. Try refreshing if it stays blank.'}
        actionLabel="Retry loading"
        onAction={() => window.location.reload()}
      />
    );
  }

  const interview = safeObject(dashboard.interview, 'candidate interview dashboard');
  const profile = safeObject(dashboard.profile, 'candidate profile');
  const scoreProgression = safeArray(interview.scoreProgression, 'score progression');
  const topicPerformance = safeArray(interview.topicPerformance, 'topic performance');

  const summaryCards = [
    { label: 'Profile Completeness', value: `${profile?.completionScore || 0}%`, icon: UserRound },
    { label: 'Total Interviews', value: interview?.totalInterviews || 0, icon: Bot },
    { label: 'Average Score', value: interview?.averageScore || 0, icon: TrendingUp },
    { label: 'Best Score', value: interview?.bestScore || 0, icon: Trophy },
    { label: 'Latest Score', value: interview?.latestScore || 0, icon: Sparkles },
    { label: 'Strongest Topic', value: interview?.strongestTopic || 'N/A', icon: Target },
    { label: 'Weakest Topic', value: interview?.weakestTopic || 'N/A', icon: Target }
  ];

  const hasResume = !!profile?.resume;
  const hasSkills = !!profile?.skills?.raw?.length;
  const hasAboutMe = !!profile?.aboutMe && !!profile?.aboutMe.trim();
  const showOnboardingBanner = !hasResume || !hasSkills || !hasAboutMe || (profile?.completionScore || 0) < 50;

  return (
    <div className="space-y-8 pb-12">
      {showOnboardingBanner && (
        <div className="relative overflow-hidden rounded-[28px] border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 lg:p-8 backdrop-blur-xl shadow-xl">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl"></div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] font-medium text-amber-400">
                <AlertCircle size={14} />
                Action Required: Complete Profile
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight animate-pulse">
                Unlock Candidate Applications!
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                You are currently restricted from applying to job postings. Complete your profile by meeting all core setup steps below to activate AI resume intelligence and unlock active applications.
              </p>
              
              {/* Progress bar */}
              <div className="space-y-2 max-w-md">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <span>Profile Strength</span>
                  <span className="text-amber-400">{profile?.completionScore || 0}% Completed</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500" 
                    style={{ width: `${profile?.completionScore || 0}%` }}
                  />
                </div>
              </div>

              {/* Checklist items */}
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {hasResume ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-[10px] text-gray-400 font-bold bg-gray-800">!</div>
                  )}
                  <span className={hasResume ? 'text-gray-300 font-medium' : 'text-gray-500'}>Resume Uploaded</span>
                </div>

                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {hasSkills ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-[10px] text-gray-400 font-bold bg-gray-800">!</div>
                  )}
                  <span className={hasSkills ? 'text-gray-300 font-medium' : 'text-gray-500'}>Skills Added</span>
                </div>

                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {hasAboutMe ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-[10px] text-gray-400 font-bold bg-gray-800">!</div>
                  )}
                  <span className={hasAboutMe ? 'text-gray-300 font-medium' : 'text-gray-500'}>About Me Bio</span>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <Link to="/candidate/profile">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-2 border-0 shadow-lg shadow-amber-500/20">
                  Setup Profile
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card rounded-[28px] p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-primary">
                <Sparkles size={14} />
                Candidate dashboard
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white">Run mock interviews and keep your candidate record sharp</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Your interview intelligence and your profile data now live together, so the platform can grow into a full recruitment ecosystem instead of a single practice tool.
              </p>
            </div>
            <Link to="/candidate/interview/setup">
              <Button className="gap-2">
                Launch interview
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-6 lg:p-8">
          <div className="text-xs uppercase tracking-[0.28em] text-gray-500">Candidate snapshot</div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <UserRound size={20} />
              </div>
              <div>
                <div className="font-medium text-white">{profile?.name || 'Complete your profile'}</div>
                <div className="text-sm text-gray-400">{profile?.email || 'No email on file'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <MapPin size={20} />
              </div>
              <div>
                <div className="font-medium text-white">{profile?.location || 'Location pending'}</div>
                <div className="text-sm text-gray-400">Preferred roles: {profile?.preferredRoles?.join(', ') || 'Not set yet'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <FileText size={20} />
              </div>
              <div>
                <div className="font-medium text-white">{profile?.resume?.fileName || 'Resume metadata not added'}</div>
                <div className="text-sm text-gray-400">{profile?.skills?.normalized?.length || 0} normalized skills captured</div>
              </div>
            </div>
            <Link to="/candidate/profile">
              <Button variant="secondary" className="w-full">Open candidate profile</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {liveInterviews.slice(0, 1).map((item) => (
          <div key={item._id} className="glass-card p-6 flex flex-col justify-between group cursor-pointer hover:border-cyan-400/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-400/20 flex items-center justify-center text-cyan-300">
                <Video size={24} />
              </div>
              <ArrowRight size={20} className="text-gray-500 group-hover:text-cyan-300 transition-colors transform group-hover:translate-x-1" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Scheduled Live Interview</h3>
              <p className="text-sm text-gray-400">{item.job?.roleTitle || 'Technical interview'} / {new Date(item.scheduledAt).toLocaleString()}</p>
            </div>
            <Link to={`/room/${item.roomId || item._id}`} className="mt-4">
              <Button variant="outline" className="w-full">Join Interview</Button>
            </Link>
          </div>
        ))}

        <div className="glass-card p-6 flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Bot size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-500 group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">AI Mock Interview</h3>
            <p className="text-sm text-gray-400">Launch a timed adaptive assessment with a final report.</p>
          </div>
          <Link to="/candidate/interview/setup" className="mt-4">
            <Button variant="outline" className="w-full">Configure Interview</Button>
          </Link>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between group cursor-pointer hover:border-accent/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <SearchCheck size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-500 group-hover:text-accent transition-colors transform group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">AI Job Feed</h3>
            <p className="text-sm text-gray-400">Browse roles ranked by skill and interview alignment.</p>
          </div>
          <Link to="/candidate/jobs" className="mt-4">
            <Button variant="outline" className="w-full">Open Job Feed</Button>
          </Link>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between group cursor-pointer hover:border-emerald-400/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-300">
              <Workflow size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-500 group-hover:text-emerald-300 transition-colors transform group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Applications Tracker</h3>
            <p className="text-sm text-gray-400">Monitor recruiter stage changes and interview schedules.</p>
          </div>
          <Link to="/candidate/applications" className="mt-4">
            <Button variant="outline" className="w-full">View Applications</Button>
          </Link>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Video size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-500 group-hover:text-blue-400 transition-colors transform group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Live Interview Room</h3>
            <p className="text-sm text-gray-400">Join only recruiter-scheduled secure rooms with authenticated access control.</p>
          </div>
          <Link to="/candidate/applications" className="mt-4">
            <Button variant="outline" className="w-full">View Scheduled Rooms</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="glass-card p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">{card.label}</div>
            <div className="text-lg font-semibold text-white break-words">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="glass-card p-6 h-[320px]">
          <h2 className="text-xl font-semibold mb-6">Score Progression</h2>
          {scoreProgression.length ? (
            <SafeResponsiveChart minHeight={240}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreProgression}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888' }} axisLine={false} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} />
                </LineChart>
              </ResponsiveContainer>
            </SafeResponsiveChart>
          ) : (
            <EmptyState title="No interview scores yet" description="Run a first mock interview to populate your progression chart." />
          )}
        </div>

        <div className="glass-card p-6 h-[320px]">
          <h2 className="text-xl font-semibold mb-6">Topic-wise Performance</h2>
          {topicPerformance.length ? (
            <SafeResponsiveChart minHeight={240}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="topic" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="averageScore" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SafeResponsiveChart>
          ) : (
            <EmptyState title="No topic data yet" description="Topic performance will appear after you complete a few assessments." />
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
