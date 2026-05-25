import { useEffect, useState } from 'react';
import { Award, AlertCircle, Clock, Calendar, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Panel } from '../../components/jobs/JobUi';
import Button from '../../components/common/Button';

const ProgressReports = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      try {
        const response = await api.get('/candidate/dashboard');
        // Fetch sessions directly from dashboard summary
        const dashboard = response.data;
        // Search in active / past completed sessions
        const res = await api.get('/interviews/active'); // Or similar session lists
        // Let's fallback to querying candidate profiles or standard history logs
        // Wait, dashboard data itself has scoreProgression mapping!
        // Let's get past sessions list
        const sessionsResponse = await api.get('/interviews/active'); // Let's check what exists
        setLoading(false);
      } catch (err) {
        setError('Failed to load sessions timeline.');
        setLoading(false);
      }
    };
    
    // We can also directly fetch dashboard data to get the sessions stats
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        // Fetch dashboard data
        const response = await api.get('/candidate/dashboard');
        // Wait, progress reports can just load dashboard progression list!
        setSessions(response.data.scoreProgression || []);
        setError('');
      } catch (err) {
        setError('Failed to retrieve timeline progress.');
      } finally {
        setLoading(false);
      }
    };

    void fetchTimeline();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Retrieving progression timeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(6,182,212,0.15),rgba(2,6,23,0.95))] border-white/10">
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200 w-fit">
          <Clock size={14} />
          Assessment Timeline
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Chronological Progress Reports</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Revisit past interview metrics, examine technical and communication ratings, and review detailed report logs.
        </p>
      </Panel>

      {error ? (
        <Panel className="border-rose-500/20 bg-rose-500/5 text-center p-8">
          <AlertCircle className="text-rose-400 mx-auto mb-4" size={36} />
          <p className="text-sm text-rose-300">{error}</p>
        </Panel>
      ) : null}

      <div className="space-y-5">
        {sessions.length > 0 ? (
          sessions.map((session, idx) => (
            <div key={idx} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:border-white/10 hover:bg-white/5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 shrink-0">
                  <Award size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white capitalize">{session.label || 'Technical Session'}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {session.label}</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Synchronized assessment</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-left shrink-0">
                  <div className="text-[10px] uppercase text-gray-500 tracking-wider">Technical</div>
                  <div className="text-sm font-semibold text-gray-200">{session.technicalScore || session.score}%</div>
                </div>
                <div className="text-left shrink-0">
                  <div className="text-[10px] uppercase text-gray-500 tracking-wider">Communication</div>
                  <div className="text-sm font-semibold text-gray-200">{session.communicationScore || 0}%</div>
                </div>
                <div className="text-left shrink-0">
                  <div className="text-[10px] uppercase text-gray-500 tracking-wider">Overall Score</div>
                  <div className="text-lg font-bold text-cyan-300">{session.score}%</div>
                </div>
                <Link to="/candidate/dashboard">
                  <Button variant="secondary" className="gap-2">
                    Open Summary <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-xs text-gray-500 py-10 glass-card rounded-2xl border border-white/5">
            No completed assessments found in your history logs. Start a setup mock interview now!
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressReports;
