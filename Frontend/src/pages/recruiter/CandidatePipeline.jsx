import { useEffect, useState } from 'react';
import { BriefcaseBusiness, MoveRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { MatchBadge, Panel, StageBadge } from '../../components/jobs/JobUi';
import api from '../../services/api';

const CandidatePipeline = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [pipeline, setPipeline] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await api.get('/jobs/recruiter');
        const nextJobs = response.data.jobs || [];
        setJobs(nextJobs);
        if (!selectedJobId && nextJobs[0]?._id) {
          setSelectedJobId(nextJobs[0]._id);
        }
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load recruiter jobs.');
      }
    };

    void loadJobs();
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) return;

    const loadPipeline = async () => {
      try {
        const response = await api.get(`/jobs/recruiter/${selectedJobId}/pipeline`);
        setPipeline(response.data.pipeline || []);
        setMessage('');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load ATS pipeline.');
      }
    };

    void loadPipeline();
  }, [selectedJobId]);

  return (
    <div className="space-y-6 pb-10">
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(249,115,22,0.18),rgba(28,25,23,0.9))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-amber-100">
              <Sparkles size={14} />
              ATS workflow
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Review the live candidate pipeline by role</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200/80">
              Each column maps directly to application stages so recruiters can see hiring momentum at a glance and drill into ranked applicants when action is needed.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label className="block text-sm font-medium text-gray-300 mb-1.5 ml-1">Select role</label>
            <select
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100"
            >
              {jobs.map((job) => <option key={job._id} value={job._id} className="bg-slate-950">{job.roleTitle}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      {message ? <Panel><div className="text-sm text-rose-300">{message}</div></Panel> : null}

      <div className="grid gap-5 xl:grid-cols-3">
        {pipeline.map((column) => (
          <Panel key={column.stage} className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(2,6,23,0.45))]">
            <div className="flex items-center justify-between gap-3">
              <StageBadge stage={column.stage} />
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">{column.count}</div>
            </div>
            <div className="mt-5 space-y-4">
              {column.applications.map((application) => (
                <div key={application._id} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{application.candidate?.name}</div>
                      <div className="mt-1 text-xs text-gray-400">{application.candidate?.location || 'Location pending'}</div>
                    </div>
                    <MatchBadge score={application.matchSnapshot?.score || 0} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(application.candidate?.skills?.normalized || []).slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">{skill}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{application.matchSnapshot?.summary}</p>
                </div>
              ))}
              {!column.applications.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-400">No candidates in this stage.</div> : null}
            </div>
          </Panel>
        ))}
      </div>

      {selectedJobId ? (
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                <BriefcaseBusiness size={20} />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">Open ranked applicant review</div>
                <div className="text-sm text-gray-400">Move from pipeline view into detailed scoring, scheduling, and recruiter feedback actions.</div>
              </div>
            </div>
            <Link to={`/recruiter/jobs/${selectedJobId}/applicants`}>
              <Button className="gap-2">
                Open applicants
                <MoveRight size={16} />
              </Button>
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
};

export default CandidatePipeline;
