import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, MapPin, Search, SlidersHorizontal, Sparkles, Bot, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { MatchBadge, Panel, StageBadge, StatPill } from '../../components/jobs/JobUi';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { safeArray, safeObject } from '../../utils/safety';

const EXPERIENCE_LEVELS = ['', 'intern', 'junior', 'mid', 'senior', 'lead', 'executive'];

const JobFeed = () => {
  const [jobs, setJobs] = useState([]);
  const [feedMode, setFeedMode] = useState('generic');
  const [showBanner, setShowBanner] = useState(false);
  const [completeness, setCompleteness] = useState(null);
  const [filters, setFilters] = useState({ search: '', location: '', experienceLevel: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalJobs: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.candidate.jobsFeed, { 
          params: { 
            ...filters, 
            page: currentPage, 
            limit: pagination.limit 
          } 
        });

        const payload = safeObject(response.data, 'job feed');
        setJobs(safeArray(payload.jobs, 'candidate jobs feed'));
        setFeedMode(payload.feedMode || 'generic');
        setShowBanner(payload.onboardingBanner || false);
        setCompleteness(safeObject(payload.profileCompleteness, 'job feed completeness'));
        
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        setError('');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load job recommendations.');
      } finally {
        setLoading(false);
      }
    };

    void loadJobs();
  }, [filters, currentPage, pagination.limit]);

  const insights = useMemo(() => {
    const safeJobs = safeArray(jobs, 'candidate jobs feed');
    const high = safeJobs.filter((job) => job.matchScore >= 80).length;
    const moderate = safeJobs.filter((job) => job.matchScore >= 55 && job.matchScore < 80).length;
    const applied = safeJobs.filter((job) => job.application).length;
    return { high, moderate, applied };
  }, [jobs]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getModeLabelAndColor = () => {
    switch (feedMode) {
      case 'ai-personalized':
        return { label: 'AI Personalized Feed', color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' };
      case 'skill-based':
        return { label: 'Skill-Based Recommendations', color: 'border-sky-500/20 bg-sky-500/10 text-sky-300' };
      default:
        return { label: 'Generic Open Roles', color: 'border-amber-500/20 bg-amber-500/10 text-amber-300' };
    }
  };

  const feedBadge = getModeLabelAndColor();

  return (
    <div className="space-y-6 pb-10 text-left">
      {/* Dynamic Profile Completeness Banner / Onboarding CTA */}
      {showBanner && completeness && (
        <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(245,158,11,0.1),rgba(28,25,23,0.95))] border-amber-500/20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <AlertTriangle size={18} />
                <span>Onboarding Checklist: Complete your profile to unlock applications!</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                You are currently browsing the generic/filtered jobs feed. To unlock the full **AI Personalized Matching Engine** and be allowed to **Apply for roles**, you must finish the mandatory setup steps.
              </p>
              
              {/* Checklist visualizer */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                {['Resume', 'Skills', 'About Me'].map(field => {
                  const isMissing = safeArray(completeness.missingFields, 'job feed completeness missing fields').includes(field);
                  return (
                    <span 
                      key={field} 
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        isMissing 
                          ? 'bg-rose-500/5 border border-rose-500/20 text-rose-300' 
                          : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      <CheckCircle2 size={12} className={isMissing ? 'text-rose-400 opacity-40' : 'text-emerald-400'} />
                      {field} {isMissing ? '(Required)' : '(Done)'}
                    </span>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="pt-2 max-w-sm">
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span>Profile Progress</span>
                  <span>{completeness.percentage || 0}%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${completeness.percentage || 0}%` }} />
                </div>
              </div>
            </div>

            <Link to="/candidate/profile" className="shrink-0">
              <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 glow-effect font-semibold">
                Setup profile <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Panel>
      )}

      {/* Main Title Hub */}
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(37,99,235,0.18),rgba(8,47,73,0.92))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-sky-200">
                <Sparkles size={14} />
                Smart job feed
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${feedBadge.color}`}>
                <Bot size={13} /> {feedBadge.label}
              </span>
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

      {/* Search & Filters */}
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
            onChange={(event) => {
              setCurrentPage(1);
              setFilters((current) => ({ ...current, search: event.target.value }));
            }}
            placeholder="Frontend, Node, AI recruiter"
          />
          <Input
            label="Location"
            icon={MapPin}
            value={filters.location}
            onChange={(event) => {
              setCurrentPage(1);
              setFilters((current) => ({ ...current, location: event.target.value }));
            }}
            placeholder="Bangalore, Remote"
          />
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Experience Level</label>
            <select
              value={filters.experienceLevel}
              onChange={(event) => {
                setCurrentPage(1);
                setFilters((current) => ({ ...current, experienceLevel: event.target.value }));
              }}
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

      {/* Feed list container */}
      <div className="grid gap-5">
        {loading ? (
          <Panel>
            <div className="text-sm text-gray-400 animate-pulse flex items-center gap-2">
              <Bot size={16} className="animate-spin text-primary" />
              Assembling personalized job feed...
            </div>
          </Panel>
        ) : null}
        
        {!loading && error ? (
          <Panel>
            <div className="text-sm text-rose-300">{error}</div>
          </Panel>
        ) : null}

        {/* Empty state protection */}
        {!loading && !error && !jobs.length ? (
          <Panel className="text-center py-10 border border-white/5 bg-slate-900/30">
            <AlertTriangle className="text-amber-400 mx-auto mb-4" size={36} />
            <h3 className="text-base font-semibold text-white">No matching postings available right now</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
              We couldn't find any job openings matching your search criteria. Try expanding your location filters or update your claimed skill list!
            </p>
            {completeness && completeness.percentage < 100 && (
              <div className="mt-6 inline-flex flex-col items-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recommended Setup step</span>
                <Link to="/candidate/profile">
                  <Button className="gap-2">
                    Complete your onboarding profile <Award size={14} />
                  </Button>
                </Link>
              </div>
            )}
          </Panel>
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

      {/* Pagination Controls */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-10 w-10 rounded-xl border border-white/10 bg-surface flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="text-xs text-gray-400 font-mono">
            Page {currentPage} of {pagination.totalPages} ({pagination.totalJobs} jobs)
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
            className="h-10 w-10 rounded-xl border border-white/10 bg-surface flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default JobFeed;
