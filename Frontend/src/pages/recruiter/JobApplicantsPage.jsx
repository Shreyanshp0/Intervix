import { useEffect, useState } from 'react';
import { CalendarClock, CheckCheck, MessageSquareText, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { MatchBadge, Panel, StageBadge, TextareaField } from '../../components/jobs/JobUi';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { safeArray } from '../../utils/safety';

const STAGES = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Passed', 'Rejected', 'Hired'];

const JobApplicantsPage = () => {
  const { jobId } = useParams();
  const [applications, setApplications] = useState([]);
  const [stageFilter, setStageFilter] = useState('');
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.recruiter.jobApplicants(jobId), { params: stageFilter ? { stage: stageFilter } : {} });
        setApplications(safeArray(response.data?.applications, 'job applicants'));
        setMessage('');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load applicants.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [jobId, stageFilter]);

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const response = await api.get(API_ROUTES.recruiter.jobApplicants(jobId), { params: stageFilter ? { stage: stageFilter } : {} });
      setApplications(safeArray(response.data?.applications, 'job applicants'));
      setMessage('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load applicants.');
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (applicationId, stage) => {
    try {
      await api.patch(API_ROUTES.recruiter.applicationStage(applicationId), { stage, note: `Moved to ${stage}` });
      await loadApplicants();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update stage.');
    }
  };

  const submitFeedback = async (applicationId) => {
    try {
      const draft = feedbackDrafts[applicationId];
      if (!draft?.message) return;
      await api.patch(API_ROUTES.recruiter.applicationFeedback(applicationId), draft);
      setFeedbackDrafts((current) => ({ ...current, [applicationId]: { message: '', visibility: 'candidate' } }));
      await loadApplicants();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save feedback.');
    }
  };

  const submitSchedule = async (applicationId) => {
    try {
      const draft = scheduleDrafts[applicationId];
      if (!draft?.scheduledFor || !draft?.timezone) return;
      await api.patch(API_ROUTES.recruiter.applicationSchedule(applicationId), draft);
      await loadApplicants();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to schedule interview.');
    }
  };

  const handleGenerateRoomLink = async (applicationId) => {
    try {
      const response = await api.post('/api/code/room');
      if (response.data?.success && response.data?.roomId) {
        const generatedLink = `${window.location.origin}/room/${response.data.roomId}`;
        setScheduleDrafts((current) => ({
          ...current,
          [applicationId]: {
            ...(current[applicationId] || { mode: 'video', notes: '', timezone: 'Asia/Kolkata' }),
            meetingLink: generatedLink
          }
        }));
      } else {
        alert('Failed to generate room link');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to generate room link');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(56,189,248,0.18),rgba(59,130,246,0.18))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-sky-100">
              <Sparkles size={14} />
              Ranked applicants
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Review candidates in score order and act immediately</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200/80">
              Every applicant card includes the current match score, ATS stage, recruiter feedback thread, and interview scheduling controls.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <label className="block text-sm font-medium text-gray-300 mb-1.5 ml-1">Stage filter</label>
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100"
            >
              <option value="" className="bg-slate-950">All stages</option>
              {STAGES.map((stage) => <option key={stage} value={stage} className="bg-slate-950">{stage}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      {loading ? <Panel><div className="text-sm text-gray-400">Loading applicants...</div></Panel> : null}
      {!loading && message ? <Panel><div className="text-sm text-rose-300">{message}</div></Panel> : null}
      {!loading && !message && !applications.length ? <Panel><div className="text-sm text-gray-400">No applicants found.</div></Panel> : null}

      <div className="grid gap-5">
        {!loading && !message ? applications.map((application) => (
          <Panel key={application._id} className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(2,6,23,0.45))]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <MatchBadge score={application.matchSnapshot?.score || 0} />
                  <StageBadge stage={application.stage} />
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{application.candidate?.name}</h2>
                <div className="mt-2 text-sm text-gray-400">{application.candidate?.email} • {application.candidate?.location || 'Location pending'}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(application.candidate?.skills?.normalized || []).slice(0, 10).map((skill) => (
                    <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{skill}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-300">{application.matchSnapshot?.summary}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {Object.entries(application.matchSnapshot?.breakdown || {}).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="mt-2 text-lg font-semibold text-white">{value}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full xl:max-w-md space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white"><CheckCheck size={16} /> Pipeline controls</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {STAGES.map((stage) => (
                      <Button key={stage} variant={application.stage === stage ? 'primary' : 'secondary'} size="sm" onClick={() => void updateStage(application._id, stage)}>
                        {stage}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white"><CalendarClock size={16} /> Interview scheduling</div>
                  <div className="mt-4 grid gap-3">
                    <Input
                      type="datetime-local"
                      value={scheduleDrafts[application._id]?.scheduledFor || ''}
                      onChange={(event) => setScheduleDrafts((current) => ({
                        ...current,
                        [application._id]: {
                          ...(current[application._id] || { mode: 'video', meetingLink: '', notes: '', timezone: 'Asia/Kolkata' }),
                          scheduledFor: new Date(event.target.value).toISOString()
                        }
                      }))}
                    />
                    <Input
                      placeholder="Timezone"
                      value={scheduleDrafts[application._id]?.timezone || 'Asia/Kolkata'}
                      onChange={(event) => setScheduleDrafts((current) => ({
                        ...current,
                        [application._id]: {
                          ...(current[application._id] || { mode: 'video', meetingLink: '', notes: '' }),
                          timezone: event.target.value
                        }
                      }))}
                    />
                    <div className="relative flex items-center">
                      <Input
                        placeholder="Meeting link"
                        value={scheduleDrafts[application._id]?.meetingLink || ''}
                        onChange={(event) => setScheduleDrafts((current) => ({
                          ...current,
                          [application._id]: {
                            ...(current[application._id] || { mode: 'video', notes: '', timezone: 'Asia/Kolkata' }),
                            meetingLink: event.target.value
                          }
                        }))}
                        className="pr-24 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateRoomLink(application._id)}
                        className="absolute right-2 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg border border-blue-500 transition-colors shadow-sm"
                      >
                        Generate Room
                      </button>
                    </div>
                    <Button onClick={() => void submitSchedule(application._id)}>Schedule interview</Button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white"><MessageSquareText size={16} /> Recruiter feedback</div>
                  <div className="mt-3 space-y-3">
                    {safeArray(application.recruiterFeedback, 'applicant recruiter feedback').map((item) => (
                      <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">{item.visibility}</div>
                        {item.message}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <TextareaField
                      label="New feedback"
                      value={feedbackDrafts[application._id]?.message || ''}
                      onChange={(event) => setFeedbackDrafts((current) => ({
                        ...current,
                        [application._id]: {
                          ...(current[application._id] || { visibility: 'candidate' }),
                          message: event.target.value
                        }
                      }))}
                    />
                    <select
                      value={feedbackDrafts[application._id]?.visibility || 'candidate'}
                      onChange={(event) => setFeedbackDrafts((current) => ({
                        ...current,
                        [application._id]: {
                          ...(current[application._id] || { message: '' }),
                          visibility: event.target.value
                        }
                      }))}
                      className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100"
                    >
                      <option value="candidate" className="bg-slate-950">Candidate visible</option>
                      <option value="internal" className="bg-slate-950">Internal only</option>
                    </select>
                    <Button variant="secondary" onClick={() => void submitFeedback(application._id)}>Save feedback</Button>
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

export default JobApplicantsPage;
