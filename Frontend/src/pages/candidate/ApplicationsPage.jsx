import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, MessageSquareText, Sparkles } from 'lucide-react';
import { Panel, StageBadge, StatPill } from '../../components/jobs/JobUi';
import api from '../../services/api';

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
        const response = await api.get('/candidate/applications', { params: stage ? { stage } : {} });
        setApplications(response.data.applications || []);
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
    active: applications.filter((item) => ['Applied', 'Shortlisted', 'Interview Scheduled'].includes(item.stage)).length,
    passed: applications.filter((item) => item.stage === 'Passed').length,
    hired: applications.filter((item) => item.stage === 'Hired').length
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

      <Panel>
        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Stage filter</label>
        <select
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          className="h-10 w-full max-w-xs rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        >
          {STAGES.map((item) => (
            <option key={item || 'all'} value={item} className="bg-slate-950">
              {item || 'All stages'}
            </option>
          ))}
        </select>
      </Panel>

      {loading ? <Panel><div className="text-sm text-gray-400">Loading applications...</div></Panel> : null}
      {!loading && message ? <Panel><div className="text-sm text-rose-300">{message}</div></Panel> : null}
      {!loading && !message && !applications.length ? (
        <Panel><div className="text-sm text-gray-400">No applications found for the selected filter.</div></Panel>
      ) : null}

      <div className="grid gap-5">
        {!loading && !message ? applications.map((application) => (
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
                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white"><CalendarClock size={16} /> Interview schedule</div>
                  {application.interviewSchedule?.scheduledFor ? (
                    <div className="mt-3 text-sm text-gray-300">
                      {new Date(application.interviewSchedule.scheduledFor).toLocaleString()} ({application.interviewSchedule.timezone})<br />
                      {application.interviewSchedule.mode} {application.interviewSchedule.meetingLink ? `• ${application.interviewSchedule.meetingLink}` : ''}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-400">No interview scheduled yet.</div>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white"><MessageSquareText size={16} /> Recruiter feedback</div>
                  <div className="mt-3 space-y-3">
                    {(application.recruiterFeedback || []).filter((item) => item.visibility === 'candidate').map((item) => (
                      <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                        {item.message}
                      </div>
                    ))}
                    {!application.recruiterFeedback?.filter((item) => item.visibility === 'candidate').length ? (
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
