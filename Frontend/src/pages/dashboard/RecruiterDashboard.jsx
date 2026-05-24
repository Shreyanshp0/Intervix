import { useEffect, useState } from 'react';
import { Activity, Award, Building2, Sparkles, Users, UserCheck } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../services/api';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="glass-card p-6 flex items-center justify-between">
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

const RecruiterDashboard = () => {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get('/recruiter/dashboard');
        setDashboard(response.data);
      } catch (error) {
        console.error('Failed to load recruiter dashboard:', error);
      }
    };

    void loadDashboard();
  }, []);

  const pipelineStats = dashboard?.pipelineStats || {};
  const recentCandidates = dashboard?.recentCandidates || [];
  const hiringFunnel = [
    { name: 'Candidates', count: pipelineStats.totalCandidates || 0 },
    { name: 'Shortlisted', count: pipelineStats.shortlisted || 0 },
    { name: 'Interviewing', count: pipelineStats.interviewing || 0 },
    { name: 'Completed', count: pipelineStats.completedAssessments || 0 }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="glass-card rounded-[28px] p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-accent">
              <Sparkles size={14} />
              Recruiter dashboard
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">Run hiring from a real recruiter workspace</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Company identity, recruiter details, and candidate activity are now separated cleanly so this portal can scale into job posting, evaluation, and collaborative hiring modules.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="text-sm text-gray-400">Company</div>
            <div className="mt-1 text-xl font-semibold text-white">{dashboard?.company?.name || 'Company profile pending'}</div>
            <div className="text-sm text-accent">{dashboard?.company?.industry || 'Industry not set'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Candidates" value={pipelineStats.totalCandidates || 0} icon={Users} colorClass="bg-primary/20 text-primary" />
        <StatCard title="Shortlisted" value={pipelineStats.shortlisted || 0} icon={Award} colorClass="bg-warning/20 text-warning" />
        <StatCard title="Interviewing" value={pipelineStats.interviewing || 0} icon={UserCheck} colorClass="bg-accent/20 text-accent" />
        <StatCard title="Completed Assessments" value={pipelineStats.completedAssessments || 0} icon={Activity} colorClass="bg-success/20 text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Hiring Funnel</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hiringFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: '#2A303C' }}
                  contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#38BDF8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-gray-500">Live pipeline</div>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {recentCandidates.map((candidate) => (
              <div key={candidate._id} className="p-4 rounded-xl bg-surfaceHighlight/30 border border-white/5 flex justify-between items-center hover:bg-surfaceHighlight/50 transition-colors cursor-pointer">
                <div>
                  <h4 className="font-medium text-white">{candidate.name}</h4>
                  <p className="text-sm text-gray-400">{candidate.preferredRoles?.join(', ') || candidate.location || 'Candidate profile'}</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${candidate.completionScore >= 80 ? 'text-success' : 'text-warning'}`}>
                    {candidate.completionScore || 0}% complete
                  </div>
                  <span className="text-xs text-gray-500">{candidate.skills?.normalized?.slice(0, 2).join(', ') || 'No skills added'}</span>
                </div>
              </div>
            ))}
            {!recentCandidates.length ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-400">
                Candidate profiles will appear here as soon as applicants complete onboarding.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[28px] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <Building2 size={22} />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{dashboard?.company?.name || 'Company profile pending'}</div>
            <div className="text-sm text-gray-400">{dashboard?.company?.website || 'Add company website and social links from the Company Profile page.'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
