import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, CalendarClock, MapPin, Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Bot, ArrowRight, X } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { MatchBadge, Panel, StageBadge, TextareaField } from '../../components/jobs/JobUi';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { safeArray, safeObject } from '../../utils/safety';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [profile, setProfile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  // Modal & Eligibility States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);

  useEffect(() => {
    const loadJobAndProfile = async () => {
      setLoading(true);
      try {
        const [jobRes, profileRes] = await Promise.all([
          api.get(API_ROUTES.candidate.jobDetails(jobId)),
          api.get(API_ROUTES.candidate.me)
        ]);

        setJob(safeObject(jobRes.data?.job, 'job details job'));
        setProfile(safeObject(profileRes.data?.profile, 'candidate profile'));
        setMessage('');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load job details.');
      } finally {
        setLoading(false);
      }
    };

    void loadJobAndProfile();
  }, [jobId]);

  const completeness = useMemo(() => {
    if (!profile) return [];
    const missing = [];
    if (!safeArray(profile.skills?.raw, 'profile skills').length) missing.push('Skills');
    if (!profile.aboutMe || !profile.aboutMe.trim()) missing.push('About Me');
    if (!profile.resume) missing.push('Resume');
    return missing;
  }, [profile]);

  useEffect(() => {
    setMissingFieldsList(completeness);
  }, [completeness]);

  const handleApply = async () => {
    if (missingFieldsList.length > 0) {
      setIsModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(API_ROUTES.candidate.applyToJob(jobId), { coverLetter });
      setJob((current) => ({ ...current, application: response.data.application }));
      setMessage('Application submitted successfully.');
    } catch (error) {
      if (error.response?.data?.code === 'PROFILE_INCOMPLETE') {
        setMissingFieldsList(error.response.data.missingFields || ['Resume', 'Skills', 'About Me']);
        setIsModalOpen(true);
      } else {
        setMessage(error.response?.data?.message || 'Unable to submit application.');
      }
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

  const isProfileIncomplete = missingFieldsList.length > 0;

  return (
    <div className="space-y-6 pb-10 text-left relative">
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
              <span className="capitalize">{(job.interviewStyle || 'mixed').replace('-', ' ')}</span>
              <span className="capitalize">{job.interviewDifficulty || 'mixed'} interviews</span>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-100/80">{job.description}</p>
          </div>

          <div className="w-full xl:max-w-sm">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-gray-500">Application panel</div>
              
              {message ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                  {message}
                </div>
              ) : null}

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
                  {isProfileIncomplete ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        <AlertTriangle size={14} /> Profile Setup Incomplete
                      </div>
                      <p className="text-[11px] text-gray-300 leading-normal">
                        To submit applications, you must first upload your resume, add your skills, and write a bio.
                      </p>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors underline flex items-center gap-1.5"
                      >
                        Check what is missing <ArrowRight size={11} />
                      </button>
                    </div>
                  ) : (
                    <TextareaField
                      label="Optional cover letter"
                      value={coverLetter}
                      onChange={(event) => setCoverLetter(event.target.value)}
                      placeholder="Add a concise recruiter-facing note about fit, motivation, or availability."
                    />
                  )}
                  
                  <Button 
                    className={`w-full ${isProfileIncomplete ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-lg' : ''}`} 
                    onClick={handleApply} 
                    isLoading={submitting}
                  >
                    {isProfileIncomplete ? 'Complete Profile to Apply' : 'Apply now'}
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

      {/* Structured Glassmorphic Block Validation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-lg font-bold text-white leading-tight">Profile Setup Required</h3>
                <p className="text-xs text-gray-400">Complete missing milestones to unlock candidate applications.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/60 border border-white/5 p-4 space-y-3.5">
              <p className="text-xs text-gray-300 leading-normal">
                To submit an application for **{job.roleTitle}**, the following mandatory sections must be completed first:
              </p>

              <div className="space-y-2.5">
                {['Resume', 'Skills', 'About Me'].map((field) => {
                  const isMissing = missingFieldsList.includes(field);
                  return (
                    <div key={field} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-300 font-medium capitalize">{field} section</span>
                      <span className={`inline-flex items-center gap-1 font-semibold ${isMissing ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isMissing ? (
                          <>
                            <AlertTriangle size={12} /> Missing
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} /> Completed
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3.5 text-xs text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Continue browsing
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  navigate('/candidate/profile');
                }}
                className="flex-1 rounded-2xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold px-4 py-3.5 text-xs transition-colors flex items-center justify-center gap-1.5 glow-effect cursor-pointer"
              >
                Go to Profile Setup <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;
