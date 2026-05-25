import { useEffect, useState } from 'react';
import { Sparkles, Star, Shield, TrendingUp, BarChart3, Users, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { Panel } from '../../components/jobs/JobUi';
import EmptyState from '../../components/common/EmptyState';
import { safeArray, safeObject } from '../../utils/safety';

const HiringAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.recruiter.analytics);
        setData(safeObject(response.data, 'hiring analytics'));
        setError('');
      } catch (err) {
        setError('Failed to fetch pipeline analytics.');
      } finally {
        setLoading(false);
      }
    };
    void fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Compiling hiring funnel analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Hiring analytics unavailable"
        description={error || 'Analytics will appear once jobs and applicant data are available.'}
        actionLabel="Refresh"
        onAction={() => window.location.reload()}
      />
    );
  }

  const analytics = safeObject(data, 'hiring analytics payload');
  const funnel = safeObject(analytics.funnel, 'funnel stats');
  const topCandidates = safeArray(analytics.topCandidates, 'top candidates');
  const { activeJobsCount, averageQualityScore, averageAtsScore } = analytics;

  const funnelMax = Math.max(...Object.values(funnel), 1);

  return (
    <div className="space-y-6 pb-10 text-left">
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(249,115,22,0.15),rgba(28,25,23,0.95))] border-white/10">
        <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-amber-200 w-fit">
          <BarChart3 size={14} />
          Hiring Analytics
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Advanced Hiring Pipelines & Analytics</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Track hiring velocities across pipelines, verify resume readability scores, and review peak candidate alignments instantly.
        </p>
      </Panel>

      {/* Analytics KPI Dashboard */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Jobs', value: activeJobsCount, sub: 'Recruiter open listings' },
          { label: 'Pipeline Candidates', value: Object.values(funnel).reduce((a, b) => a + b, 0), sub: 'Total active applicants' },
          { label: 'Avg Quality Score', value: `${averageQualityScore}%`, sub: 'Candidate resume average' },
          { label: 'Avg ATS Score', value: `${averageAtsScore}%`, sub: 'ATS readability rating' }
        ].map((kpi, idx) => (
          <div key={idx} className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-[10px] text-gray-400">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Recruiter hiring funnel chart */}
        <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={18} className="text-amber-400" /> Active Hiring Funnel
          </h3>
          <div className="space-y-4 pt-2">
            {Object.entries(funnel).map(([stage, count]) => (
              <div key={stage} className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-300">
                  <span className="font-semibold text-white">{stage}</span>
                  <span className="font-mono text-gray-400">{count} candidates</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                  <div className="bg-[linear-gradient(90deg,var(--color-primary),var(--color-secondary))] h-full" style={{ width: `${(count / funnelMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top candidates list */}
        <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-5 flex flex-col">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Star size={18} className="text-amber-400" /> Top Ranked Candidates
          </h3>
          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-2">
            {topCandidates.map((candidate) => (
              <div key={candidate.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 flex items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <span className="font-semibold text-white text-sm block">{candidate.name}</span>
                  <span className="text-[10px] text-gray-400 block truncate max-w-[180px]">{candidate.preferredRoles.join(', ') || 'Software Engineer'} • {candidate.location}</span>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">Quality</div>
                    <div className="text-sm font-semibold text-cyan-300">{candidate.qualityScore}%</div>
                  </div>
                  <Link to={`/recruiter/candidates/${candidate.id}`}>
                    <button className="h-8 w-8 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 flex items-center justify-center transition-colors">
                      <ArrowUpRight size={15} />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
            {!topCandidates.length && (
              <div className="text-center text-xs text-gray-500 py-6">No top candidates matching funnel yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiringAnalytics;
