import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { MatchBadge, Panel, StageBadge, StatPill } from '../../components/jobs/JobUi';
import api from '../../services/api';

const EXPERIENCE_LEVELS = ['', 'intern', 'junior', 'mid', 'senior', 'lead', 'executive'];

const JobFeed = () => {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ search: '', location: '', experienceLevel: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const response = await api.get('/jobs/candidate', { params: filters });
        setJobs(response.data.jobs || []);
        setError('');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load job recommendations.');
      } finally {
        setLoading(false);
      }
    };

    void loadJobs();
  }, [filters]);

  const insights = useMemo(() => {
    const high = jobs.filter((job) => job.matchScore >= 80).length;
    const moderate = jobs.filter((job) => job.matchScore >= 55 && job.matchScore < 80).length;
    const applied = jobs.filter((job) => job.application).length;
    return { high, moderate, applied };
  }, [jobs]);

  return (
    <div className="space-y-6 pb-10">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(37,99,235,0.18),rgba(8,47,73,0.92))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-sky-200">
              <Sparkles size={14} />
              Smart job feed
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Recommended roles ranked by actual fit signals</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200/80">
              The feed prioritizes skill overlap, verified capability, interview performance, resume readiness, experience alignment, and project relevance so the strongest roles surface first.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill label="High Match" value={insights.high} tone="success" />
            <StatPill label="Moderate" value={insights.moderate} tone="accent" />
            <StatPill label="Applied" value={insights.applied} tone="warning" />
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-gray-500">
          <SlidersHorizontal size={16} />
          Filters
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr_0.7fr]">
          <Input
            label="Search"
            icon={Search}
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Frontend, Node, AI recruiter"
          />
          <Input
            label="Location"
            icon={MapPin}
            value={filters.location}
            onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
            placeholder="Bangalore, Remote"
          />
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Experience Level</label>
            <select
              value={filters.experienceLevel}
              onChange={(event) => setFilters((current) => ({ ...current, experienceLevel: event.target.value }))}
              className="h-10 w-full rounded-xl border border-white/10 bg-surface/50 px-3 text-sm text-gray-100 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level || 'all'} value={level} className="bg-slate-950">
                  {level ? level[0].toUpperCase() + level.slice(1) : 'All levels'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5">
        {loading ? <Panel><div className="text-sm text-gray-400">Loading ranked jobs...</div></Panel> : null}
        {!loading && error ? <Panel><div className="text-sm text-rose-300">{error}</div></Panel> : null}
        {!loading && !error && !jobs.length ? (
          <Panel><div className="text-sm text-gray-400">No roles match the current filters yet.</div></Panel>
        ) : null}

        {!loading && !error ? jobs.map((job) => (
          <Panel key={job._id} className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(2,6,23,0.45))]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <MatchBadge score={job.matchScore || 0} />
                  {job.application ? <StageBadge stage={job.application.stage} /> : null}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{job.roleTitle}</h2>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2"><BriefcaseBusiness size={16} /> {job.company?.name}</span>
                  <span className="inline-flex items-center gap-2"><MapPin size={16} /> {job.location}</span>
                  <span className="capitalize">{job.experienceLevel}</span>
                  <span>{job.salaryRange?.currency} {job.salaryRange?.min?.toLocaleString?.() || 0} - {job.salaryRange?.max?.toLocaleString?.() || 0}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-300">{job.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(job.requiredSkills?.raw || []).slice(0, 8).map((skill) => (
                    <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full xl:max-w-sm">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-gray-500">Why this role ranks here</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Object.entries(job.matchBreakdown || {}).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{key.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="mt-2 text-lg font-semibold text-white">{value}%</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-400">{job.candidateSummary}</p>
                  <Link to={`/candidate/jobs/${job._id}`} className="mt-5 block">
                    <Button className="w-full gap-2">
                      View details
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Panel>
        )) : null}
      </div>
    </div>
  );
};

export default JobFeed;
