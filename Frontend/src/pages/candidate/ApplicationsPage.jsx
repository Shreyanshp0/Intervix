import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, MessageSquareText, Sparkles, Video } from 'lucide-react';
import { Panel, StageBadge, StatPill } from '../../components/jobs/JobUi';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { safeArray } from '../../utils/safety';

const STAGES = ['', 'Applied', 'Shortlisted', 'Interview Scheduled', 'Passed', 'Rejected', 'Hired'];

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [stage, setStage] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.candidate.applications, { params: stage ? { stage } : {} });
        setApplications(safeArray(response.data?.applications, 'candidate applications'));
        setMessage('');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load applications.');
      } finally {
        setLoading(false);
      }
    };

    void loadApplications();
  }, [stage]);

  const stats = useMemo(() => ({
    active: safeArray(applications, 'candidate applications stats').filter((item) => ['Applied', 'Shortlisted', 'Interview Scheduled'].includes(item.stage)).length,
    passed: safeArray(applications, 'candidate applications stats').filter((item) => item.stage === 'Passed').length,
    hired: safeArray(applications, 'candidate applications stats').filter((item) => item.stage === 'Hired').length
  }), [applications]);

  return (
    <div className="space-y-6 pb-10">
      <Panel className="bg-[linear-gradient(135deg,rgba(12,10,9,0.92),rgba(5,150,105,0.18),rgba(15,23,42,0.92))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-emerald-100">
              <Sparkles size={14} />
              Application tracker
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Track every stage of your hiring journey</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200/80">
              See status changes, interview schedules, and recruiter-visible feedback without leaving the candidate portal.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill label="Active" value={stats.active} tone="accent" />
            <StatPill label="Passed" value={stats.passed} tone="success" />
            <StatPill label="Hired" value={stats.hired} tone="warning" />
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="max-w-xs">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Stage filter</label>
          <div className="relative group">
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="flex w-full h-10 rounded-xl border border-white/10 bg-[#1A1F2C]/50 px-3.5 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-[#1A1F2C]/80 transition-all duration-300 appearance-none cursor-pointer pr-10"
            >
              {STAGES.map((item) => (
                <option key={item || 'all'} value={item} className="bg-[#0E1424] text-gray-200">
                  {item || 'All stages'}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
              ▼
            </div>
          </div>
        </div>
      </Panel>

      {loading ? <Panel><div className="text-sm text-gray-400">Loading applications...</div></Panel> : null}
      {!loading && message ? <Panel><div className="text-sm text-rose-300">{message}</div></Panel> : null}
      {!loading && !message && !applications.length ? (
        <Panel><div className="text-sm text-gray-400">No applications found for the selected filter.</div></Panel>
      ) : null}

      <div className="grid gap-5">
        {!loading && !message ? safeArray(applications, 'candidate applications list').map((application) => (
          <Panel key={application._id} className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(2,6,23,0.45))]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <StageBadge stage={application.stage} />
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300">
                    {application.matchSnapshot?.score || 0}% match at apply time
                  </div>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{application.job?.roleTitle}</h2>
                <div className="mt-2 text-sm text-gray-400">{application.company?.name} • {application.job?.location}</div>
                <p className="mt-4 text-sm leading-6 text-gray-300">{application.matchSnapshot?.summary}</p>
              </div>

              <div className="w-full xl:max-w-md space-y-4">
                {(() => {
                  const sessionLink = application.interviewSchedule?.sessionUrl
                    || (application.interviewSchedule?.sessionToken ? `/interview/session?token=${encodeURIComponent(application.interviewSchedule.sessionToken)}` : '');
                  const status = application.interviewSchedule?.status || (sessionLink ? 'active' : 'scheduled');

                  return (
                    <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-5">
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider"><CalendarClock size={14} /> Interview schedule</div>
                      {application.interviewSchedule?.scheduledFor ? (
                        <div className="mt-3 space-y-3">
                          <div className="text-xs text-gray-300">
                            {new Date(application.interviewSchedule.scheduledFor).toLocaleString()} ({application.interviewSchedule.timezone})<br />
                            <span className="capitalize font-semibold text-primary">{application.interviewSchedule.mode} Interview</span>
                          </div>
                          
                          {status === 'active' && sessionLink ? (
                            <Link 
                              to={sessionLink}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-indigo-400 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all text-center active:scale-95"
                            >
                              <Video size={14} /> Join Live Coding Room
                            </Link>
                          ) : status === 'scheduled' ? (
                            <button
                              disabled
                              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/5 px-4 py-2.5 text-xs font-bold text-gray-500 cursor-not-allowed text-center select-none"
                            >
                              Upcoming interview
                            </button>
                          ) : status === 'ended' || status === 'completed' ? (
                            <button
                              disabled
                              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs font-bold text-emerald-400 cursor-not-allowed text-center select-none"
                            >
                              Interview Completed
                            </button>
                          ) : status === 'cancelled' ? (
                            <button
                              disabled
                              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-400 cursor-not-allowed text-center select-none"
                            >
                              Interview Cancelled
                            </button>
                          ) : (
                            <button
                              disabled
                              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs font-bold text-red-400 cursor-not-allowed text-center select-none"
                            >
                              Session Expired
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-gray-400">No interview scheduled yet.</div>
                      )}
                    </div>
                  );
                })()}

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white"><MessageSquareText size={16} /> Recruiter feedback</div>
                  <div className="mt-3 space-y-3">
                    {safeArray(application.recruiterFeedback, 'application recruiter feedback').filter((item) => item.visibility === 'candidate').map((item) => (
                      <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                        {item.message}
                      </div>
                    ))}
                    {!safeArray(application.recruiterFeedback, 'application recruiter feedback').filter((item) => item.visibility === 'candidate').length ? (
                      <div className="text-sm text-gray-400">No recruiter feedback shared yet.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )) : null}
      </div>
    </div>
  );
};

export default ApplicationsPage;
