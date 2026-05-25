import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Panel, StageBadge, TextareaField, StatPill } from '../../components/jobs/JobUi';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { safeArray } from '../../utils/safety';

const emptyForm = {
  roleTitle: '',
  description: '',
  requiredSkills: '',
  preferredSkills: '',
  experienceLevel: 'mid',
  salaryMin: 0,
  salaryMax: 0,
  salaryCurrency: 'USD',
  salaryPeriod: 'yearly',
  location: '',
  responsibilities: '',
  qualifications: '',
  hiringStatus: 'draft',
  interviewDifficulty: 'medium',
  interviewStyle: 'mixed'
};

const splitCsv = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const splitLines = (value = '') => value.split('\n').map((item) => item.trim()).filter(Boolean);

const mapJobToForm = (job) => ({
  roleTitle: job?.roleTitle || '',
  description: job?.description || '',
  requiredSkills: job?.requiredSkills?.raw?.join(', ') || '',
  preferredSkills: job?.preferredSkills?.raw?.join(', ') || '',
  experienceLevel: job?.experienceLevel || 'mid',
  salaryMin: job?.salaryRange?.min || 0,
  salaryMax: job?.salaryRange?.max || 0,
  salaryCurrency: job?.salaryRange?.currency || 'USD',
  salaryPeriod: job?.salaryRange?.period || 'yearly',
  location: job?.location || '',
  responsibilities: (job?.responsibilities || []).join('\n'),
  qualifications: (job?.qualifications || []).join('\n'),
  hiringStatus: job?.hiringStatus || 'draft',
  interviewDifficulty: job?.interviewDifficulty || 'medium',
  interviewStyle: job?.interviewStyle || 'mixed'
});

const buildPayload = (form) => ({
  roleTitle: form.roleTitle,
  description: form.description,
  requiredSkills: splitCsv(form.requiredSkills),
  preferredSkills: splitCsv(form.preferredSkills),
  experienceLevel: form.experienceLevel,
  salaryRange: {
    min: Number(form.salaryMin || 0),
    max: Number(form.salaryMax || 0),
    currency: form.salaryCurrency,
    period: form.salaryPeriod
  },
  location: form.location,
  responsibilities: splitLines(form.responsibilities),
  qualifications: splitLines(form.qualifications),
  hiringStatus: form.hiringStatus,
  interviewDifficulty: form.interviewDifficulty,
  interviewStyle: form.interviewStyle
});

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.recruiter.jobs);
        const nextJobs = safeArray(response.data?.jobs, 'recruiter jobs');
        setJobs(nextJobs);
        setMessage('');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load jobs.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const loadJobs = async (searchValue = '') => {
    setLoading(true);
    try {
      const response = await api.get(API_ROUTES.recruiter.jobs, { params: searchValue ? { search: searchValue } : {} });
      const nextJobs = safeArray(response.data?.jobs, 'recruiter jobs');
      setJobs(nextJobs);
      if (selectedJobId) {
        const selected = nextJobs.find((job) => job._id === selectedJobId);
        if (selected) {
          setForm(mapJobToForm(selected));
        }
      }
      setMessage('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    active: safeArray(jobs, 'recruiter jobs stats').filter((job) => ['open', 'on-hold'].includes(job.hiringStatus)).length,
    draft: safeArray(jobs, 'recruiter jobs stats').filter((job) => job.hiringStatus === 'draft').length,
    applicants: safeArray(jobs, 'recruiter jobs stats').reduce((sum, job) => sum + (job.applicantStats?.totalApplicants || 0), 0)
  }), [jobs]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (selectedJobId) {
        await api.put(API_ROUTES.recruiter.jobDetails(selectedJobId), buildPayload(form));
        setMessage('Job updated successfully.');
      } else {
        const response = await api.post(API_ROUTES.recruiter.jobs, buildPayload(form));
        setSelectedJobId(response.data.job._id);
        setMessage('Job created successfully.');
      }
      await loadJobs(search);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save job.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedJobId) return;
    setSaving(true);
    try {
      await api.delete(API_ROUTES.recruiter.jobDetails(selectedJobId));
      setSelectedJobId(null);
      setForm(emptyForm);
      setMessage('Job archived successfully.');
      await loadJobs(search);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to archive job.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Panel className="bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(14,165,233,0.22),rgba(20,184,166,0.18))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
              <Sparkles size={14} />
              Job architecture
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Create and operate multiple hiring roles</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200/80">
              This workspace manages the full lifecycle of each role, from draft creation to applicant volume and ATS stage movement.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill label="Active Jobs" value={stats.active} tone="accent" />
            <StatPill label="Drafts" value={stats.draft} tone="warning" />
            <StatPill label="Applicants" value={stats.applicants} tone="success" />
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-gray-500">Role list</div>
              <h2 className="mt-2 text-xl font-semibold text-white">Current openings</h2>
            </div>
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => { setSelectedJobId(null); setForm(emptyForm); }}>
              <Plus size={16} />
              New role
            </Button>
          </div>
          <div className="mt-4">
            <Input
              icon={Search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles"
            />
            <Button variant="outline" className="mt-3 w-full" onClick={() => void loadJobs(search)}>Refresh results</Button>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? <div className="text-sm text-gray-400">Loading jobs...</div> : null}
            {!loading && !jobs.length ? <div className="text-sm text-gray-400">No job postings yet.</div> : null}
            {!loading ? jobs.map((job) => (
              <button
                key={job._id}
                type="button"
                onClick={() => { setSelectedJobId(job._id); setForm(mapJobToForm(job)); }}
                className={`w-full rounded-[24px] border px-5 py-5 text-left transition ${selectedJobId === job._id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StageBadge stage={job.hiringStatus === 'open' ? 'Applied' : job.hiringStatus === 'filled' ? 'Hired' : 'Shortlisted'} />
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">{job.hiringStatus}</div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{job.roleTitle}</h3>
                    <div className="mt-2 text-sm text-gray-400">{job.location} • {job.experienceLevel}</div>
                  </div>
                  <div className="text-right text-sm text-gray-300">
                    <div>{job.applicantStats?.totalApplicants || 0} applicants</div>
                    <div className="mt-1 text-xs text-gray-500">{job.company?.name}</div>
                  </div>
                </div>
              </button>
            )) : null}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-gray-500">Role editor</div>
              <h2 className="mt-2 text-xl font-semibold text-white">{selectedJobId ? 'Update selected role' : 'Create a new role'}</h2>
            </div>
            {selectedJobId ? (
              <Button variant="danger" size="sm" className="gap-2" onClick={handleDelete} isLoading={saving}>
                <Trash2 size={16} />
                Archive
              </Button>
            ) : null}
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">{message}</div> : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Role title" name="roleTitle" value={form.roleTitle} onChange={handleChange} />
              <Input label="Location" name="location" value={form.location} onChange={handleChange} />
              <div className="md:col-span-2">
                <TextareaField label="Description" name="description" value={form.description} onChange={handleChange} />
              </div>
              <TextareaField label="Required skills" name="requiredSkills" value={form.requiredSkills} onChange={handleChange} placeholder="React, Node.js, MongoDB" />
              <TextareaField label="Preferred skills" name="preferredSkills" value={form.preferredSkills} onChange={handleChange} placeholder="AWS, GraphQL, Redis" />
              <TextareaField label="Responsibilities" name="responsibilities" value={form.responsibilities} onChange={handleChange} placeholder={'Own API architecture\nMentor engineers'} />
              <TextareaField label="Qualifications" name="qualifications" value={form.qualifications} onChange={handleChange} placeholder={'3+ years in MERN\nStrong system design fundamentals'} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Experience</label>
                <select name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100">
                  {['intern', 'junior', 'mid', 'senior', 'lead', 'executive'].map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Hiring status</label>
                <select name="hiringStatus" value={form.hiringStatus} onChange={handleChange} className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100">
                  {['draft', 'open', 'on-hold', 'closed', 'filled'].map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Interview difficulty</label>
                <select name="interviewDifficulty" value={form.interviewDifficulty} onChange={handleChange} className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100">
                  {['easy', 'medium', 'hard'].map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}
                </select>
              </div>
              <Input label="Salary min" name="salaryMin" type="number" value={form.salaryMin} onChange={handleChange} />
              <Input label="Salary max" name="salaryMax" type="number" value={form.salaryMax} onChange={handleChange} />
              <Input label="Currency" name="salaryCurrency" value={form.salaryCurrency} onChange={handleChange} />
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Salary period</label>
                <select name="salaryPeriod" value={form.salaryPeriod} onChange={handleChange} className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100">
                  {['hourly', 'monthly', 'yearly'].map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Interview style</label>
                <select name="interviewStyle" value={form.interviewStyle} onChange={handleChange} className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100">
                  {['technical', 'behavioral', 'case-study', 'system-design', 'mixed'].map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}
                </select>
              </div>
            </div>

            <Button type="submit" className="gap-2" isLoading={saving}>
              <Save size={16} />
              {selectedJobId ? 'Update role' : 'Create role'}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
};

export default JobManagement;
