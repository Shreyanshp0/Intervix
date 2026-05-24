import { useEffect, useState } from 'react';
import { ArrowRight, Bot, FileText, MapPin, Sparkles, Target, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Button from '../../components/common/Button';
import api from '../../services/api';

const CandidateDashboard = () => {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get('/candidate/dashboard');
        setDashboard(response.data);
      } catch (error) {
        console.error('Failed to load candidate dashboard:', error);
      }
    };

    void loadDashboard();
  }, []);

  const interview = dashboard?.interview;
  const profile = dashboard?.profile;

  const summaryCards = [
    { label: 'Profile Completeness', value: `${profile?.completionScore || 0}%`, icon: UserRound },
    { label: 'Total Interviews', value: interview?.totalInterviews || 0, icon: Bot },
    { label: 'Average Score', value: interview?.averageScore || 0, icon: TrendingUp },
    { label: 'Best Score', value: interview?.bestScore || 0, icon: Trophy },
    { label: 'Latest Score', value: interview?.latestScore || 0, icon: Sparkles },
    { label: 'Strongest Topic', value: interview?.strongestTopic || 'N/A', icon: Target },
    { label: 'Weakest Topic', value: interview?.weakestTopic || 'N/A', icon: Target }
  ];

  return (
    <div className="space-y-8 pb-12">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {summaryCards.slice(0, 2).map((card) => (
          <div key={card.label} className="glass-card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                <card.icon size={22} />
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-2">{card.label}</div>
            <div className="text-3xl font-semibold text-white">{card.value}</div>
          </div>
        ))}
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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={interview?.scoreProgression || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888' }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
              <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-[320px]">
          <h2 className="text-xl font-semibold mb-6">Topic-wise Performance</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={interview?.topicPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="topic" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
              <Bar dataKey="averageScore" fill="#14B8A6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
