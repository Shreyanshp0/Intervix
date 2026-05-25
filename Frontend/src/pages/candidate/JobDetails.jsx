import { useEffect, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, CalendarClock, MapPin, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import { MatchBadge, Panel, StageBadge, TextareaField } from '../../components/jobs/JobUi';
import api from '../../services/api';

const JobDetails = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadJob = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/jobs/candidate/${jobId}`);
        setJob(response.data.job);
        setMessage('');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load job details.');
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [jobId]);

  const handleApply = async () => {
    setSubmitting(true);
    try {
      const response = await api.post(`/jobs/candidate/${jobId}/apply`, { coverLetter });
      setJob((current) => ({ ...current, application: response.data.application }));
      setMessage('Application submitted successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Panel><div className="text-sm text-gray-400">Loading job details...</div></Panel>;
  }

  if (!job) {
    return <Panel><div className="text-sm text-rose-300">{message || 'Job not found.'}</div></Panel>;
  }

  return (
    <div className="space-y-6 pb-10">
      <Link to="/candidate/jobs" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} />
        Back to recommendations
      </Link>

      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(67,56,202,0.2),rgba(8,47,73,0.9))]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <MatchBadge score={job.matchScore || 0} />
              {job.application ? <StageBadge stage={job.application.stage} /> : null}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">
                <Sparkles size={14} />
                AI-ranked
              </div>
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{job.roleTitle}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
              <span className="inline-flex items-center gap-2"><BriefcaseBusiness size={16} /> {job.company?.name}</span>
              <span className="inline-flex items-center gap-2"><MapPin size={16} /> {job.location}</span>
              <span className="capitalize">{job.experienceLevel}</span>
              <span className="capitalize">{job.interviewStyle.replace('-', ' ')}</span>
              <span className="capitalize">{job.interviewDifficulty} interviews</span>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-100/80">{job.description}</p>
          </div>

          <div className="w-full xl:max-w-sm">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-gray-500">Application panel</div>
              {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">{message}</div> : null}
              {job.application ? (
                <div className="mt-4 space-y-4">
                  <StageBadge stage={job.application.stage} />
                  {job.application.interviewSchedule?.scheduledFor ? (
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-100">
                      <div className="inline-flex items-center gap-2 font-medium"><CalendarClock size={16} /> Interview scheduled</div>
                      <div className="mt-2">{new Date(job.application.interviewSchedule.scheduledFor).toLocaleString()}</div>
                    </div>
                  ) : null}
                  <Link to="/candidate/applications">
                    <Button className="w-full">Track application</Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <TextareaField
                    label="Optional cover letter"
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    placeholder="Add a concise recruiter-facing note about fit, motivation, or availability."
                  />
                  <Button className="w-full" onClick={handleApply} isLoading={submitting}>
                    Apply now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-white">Role requirements</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-gray-300">Required skills</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(job.requiredSkills?.raw || []).map((skill) => (
                  <span key={skill} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">{skill}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-300">Preferred skills</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(job.preferredSkills?.raw || []).map((skill) => (
                  <span key={skill} className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-gray-300">Responsibilities</div>
              <ul className="mt-3 space-y-3 text-sm text-gray-300">
                {(job.responsibilities || []).map((item) => <li key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">{item}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-300">Qualifications</div>
              <ul className="mt-3 space-y-3 text-sm text-gray-300">
                {(job.qualifications || []).map((item) => <li key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">{item}</li>)}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-white">Match breakdown</h2>
          <div className="mt-5 space-y-3">
            {Object.entries(job.matchBreakdown || {}).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm capitalize text-gray-300">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-lg font-semibold text-white">{value}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-900">
                  <div className="h-2 rounded-full bg-gradient-to-r from-primary via-sky-400 to-emerald-300" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-gray-400">{job.candidateSummary}</p>
        </Panel>
      </div>
    </div>
  );
};

export default JobDetails;
