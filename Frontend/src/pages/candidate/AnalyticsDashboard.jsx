import { useEffect, useState } from 'react';
import { Sparkles, Star, Shield, ArrowUpRight, TrendingUp, CheckCircle, AlertCircle, Compass, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Panel } from '../../components/jobs/JobUi';
import Button from '../../components/common/Button';

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const response = await api.get('/candidate/dashboard');
        setData(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to compile analytics dashboard.');
      } finally {
        setLoading(false);
      }
    };
    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Assembling analytics report...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Panel className="border-rose-500/20 bg-rose-500/5 text-center p-8">
        <AlertCircle className="text-rose-400 mx-auto mb-4" size={36} />
        <p className="text-sm text-rose-300">{error || 'Failed to load report.'}</p>
      </Panel>
    );
  }

  const {
    totalInterviews,
    averageScore,
    bestScore,
    latestScore,
    strongestTopic,
    weakestTopic,
    employability,
    employabilityTrends,
    scoreProgression,
    topicPerformance,
    learningRecommendations
  } = data;

  const scoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 55) return 'text-cyan-400';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-6 pb-10 text-left">
      {/* Top Banner Header */}
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(6,182,212,0.15),rgba(2,6,23,0.95))] border-white/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
              <Sparkles size={14} />
              AI Employability Index
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Your Employability Score is {employability?.overallScore || 50}%</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              A comprehensive scoring model computed across verified skills, AI interview outcomes, resume metrics, and portfolio project density.
            </p>
          </div>
          <Link to="/candidate/interview/setup">
            <Button className="gap-2 glow-effect">
              Start new round <PlayCircle size={16} />
            </Button>
          </Link>
        </div>
      </Panel>

      {/* Main KPI Counters Grid */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Assessments', value: totalInterviews, sub: 'All rounds completed' },
          { label: 'Avg Interview Score', value: `${averageScore}%`, sub: 'Across sessions' },
          { label: 'Employability Rating', value: `${employability?.overallScore}%`, sub: 'Aggregate index' },
          { label: 'Peak Assessment', value: `${bestScore}%`, sub: 'Highest score record' }
        ].map((kpi, idx) => (
          <div key={idx} className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-[10px] text-gray-400">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {/* Employability Breakdown Dashboard */}
          <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield size={18} className="text-cyan-300" /> Employability Index Breakdown
              </h3>
              <p className="text-xs text-gray-400 mt-1">Detailed weights contributing to your aggregate career-readiness rating.</p>
            </div>

            <div className="space-y-5">
              {[
                { name: 'Interview Performance', val: employability?.breakdown?.interviewPerformance || 0, weight: '35%' },
                { name: 'Verified Skills (Assessments)', val: employability?.breakdown?.verifiedSkills || 50, weight: '20%' },
                { name: 'Resume Structural Quality', val: employability?.breakdown?.resumeQuality || 50, weight: '15%' },
                { name: 'Communication Clarity', val: employability?.breakdown?.communication || 50, weight: '15%' },
                { name: 'Portfolio Projects Depth', val: employability?.breakdown?.projectDepth || 0, weight: '15%' }
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">{item.name} <span className="text-gray-500 font-normal">({item.weight} weight)</span></span>
                    <span className={`font-semibold ${scoreColor(item.val)}`}>{item.val}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[linear-gradient(90deg,var(--color-primary),#06b6d4)] h-full" style={{ width: `${item.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Score progression */}
          <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-300" /> Assessment Score Progression
            </h3>
            <div className="h-44 flex items-end justify-between gap-2 pt-6">
              {scoreProgression.map((s, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full bg-slate-800 rounded-t-lg transition-all hover:bg-primary" style={{ height: `${s.score}%` }}>
                    <div className="text-[10px] text-white text-center -mt-6 font-mono">{s.score}%</div>
                  </div>
                  <div className="text-[9px] text-gray-500 truncate max-w-full font-mono">{s.label}</div>
                </div>
              ))}
              {!scoreProgression.length && (
                <div className="flex-1 text-center text-xs text-gray-500 self-center">No assessments completed.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Strengths & Recommendations */}
        <div className="space-y-6">
          {/* Skill verified topic metrics */}
          <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Star size={16} className="text-cyan-300" /> Topic Performance Summary
            </h3>
            <div className="space-y-4 max-h-56 overflow-y-auto pr-2">
              {topicPerformance.map((t) => (
                <div key={t.topic} className="flex justify-between items-center text-xs border-b border-white/5 pb-2.5">
                  <div>
                    <span className="font-semibold text-white capitalize">{t.topic}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{t.interviewsTaken} rounds completed</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${scoreColor(t.averageScore)}`}>{t.averageScore}% avg</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{t.confidenceAverage}% confidence</span>
                  </div>
                </div>
              ))}
              {!topicPerformance.length && (
                <div className="text-center text-xs text-gray-500 py-4">No topic statistics compiled.</div>
              )}
            </div>
          </div>

          {/* AI recommendations */}
          <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass size={16} className="text-cyan-300" /> AI Study Recommendations
            </h3>
            <div className="space-y-3">
              {learningRecommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <ArrowUpRight size={16} className="text-cyan-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed text-left">{rec}</p>
                </div>
              ))}
              {!learningRecommendations.length && (
                <div className="text-xs text-gray-500 py-2">No learning recommendations generated yet. Try taking some assessments.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
