import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Code, Star, Shield, Sparkles, AlertCircle, FileText, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import { Panel } from '../../components/jobs/JobUi';
import Button from '../../components/common/Button';
import { API_ROUTES, buildApiUrl } from '../../constants/apiRoutes';

const CandidateProfileView = () => {
  const { candidateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pdf'); // pdf | text

  useEffect(() => {
    const fetchCandidateData = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ROUTES.recruiter.candidateDetails(candidateId));
        setData(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load candidate details.');
      } finally {
        setLoading(false);
      }
    };
    void fetchCandidateData();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading recruiter cockpit...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Panel className="border-rose-500/20 bg-rose-500/5 text-center p-8 space-y-4">
          <AlertCircle className="text-rose-400 mx-auto" size={40} />
          <h3 className="text-lg font-semibold text-white">Cockpit Error</h3>
          <p className="text-sm text-rose-300">{error || 'Candidate profile not found.'}</p>
          <Link to="/recruiter/dashboard">
            <Button variant="secondary" className="mt-4 gap-2">
              <ArrowLeft size={16} /> Return to dashboard
            </Button>
          </Link>
        </Panel>
      </div>
    );
  }

  const { profile, sessions } = data;
  const resume = profile.resume;
  const verifiedSkillsMap = profile.verifiedSkills || {};

  const resumePreviewUrl = resume?._id ? buildApiUrl(API_ROUTES.resume.downloadById(resume._id)) : '';

  return (
    <div className="h-[92vh] flex flex-col overflow-hidden -mx-4 -my-6 lg:-mx-8">
      {/* Top Header Bar */}
      <div className="bg-slate-950/70 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/recruiter/dashboard">
            <button className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt={profile.name} className="w-11 h-11 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                {profile.name[0]}
              </div>
            )}
            <div className="text-left">
              <h1 className="text-lg font-semibold text-white leading-tight">{profile.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{profile.email} • {profile.phone || 'Phone pending'} • {profile.location || 'Location pending'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            Verified candidate
          </span>
        </div>
      </div>

      {/* Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Profile Analytics & Insights (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-white/5">
          {/* AI Resume Intelligence Summary */}
          {resume?.aiAnalysis ? (
            <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(37,99,235,0.15),rgba(8,47,73,0.95))] border-white/10 text-left">
              <h4 className="text-xs uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-2">
                <Sparkles size={14} /> AI Recruiter Assistant
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-slate-100">{resume.aiAnalysis.recruiterSummary}</p>
            </Panel>
          ) : (
            <Panel className="text-center text-gray-400 py-8">
              No parsed resume uploaded for this candidate yet. Contact info, skills, and projects are listed below.
            </Panel>
          )}

          {/* AI Scores Dashboard */}
          {resume?.aiAnalysis && (
            <div className="grid gap-4 grid-cols-3">
              <div className="glass-card p-4 text-left border border-white/5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1">
                  <Star size={11} /> Quality Score
                </div>
                <div className="mt-2 text-2xl font-bold text-white">{resume.aiAnalysis.resumeQualityScore}%</div>
              </div>
              <div className="glass-card p-4 text-left border border-white/5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-1">
                  <Shield size={11} /> ATS Score
                </div>
                <div className="mt-2 text-2xl font-bold text-white">{resume.aiAnalysis.atsScore}%</div>
              </div>
              <div className="glass-card p-4 text-left border border-white/5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-1">
                  <Sparkles size={11} /> Skill Match
                </div>
                <div className="mt-2 text-2xl font-bold text-white">{resume.aiAnalysis.skillConfidence}%</div>
              </div>
            </div>
          )}

          {/* Strengths & suggested weak areas */}
          {resume?.aiAnalysis && (
            <div className="grid gap-4 md:grid-cols-2 text-left">
              <div className="glass-card p-5 space-y-3 border border-white/5">
                <h5 className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-2">
                  <CheckCircle size={14} /> Peak Strengths
                </h5>
                <ul className="space-y-2 text-xs text-gray-300">
                  {resume.aiAnalysis.strengths?.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-5 space-y-3 border border-white/5">
                <h5 className="text-xs uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-2">
                  <AlertCircle size={14} /> Development Areas
                </h5>
                <ul className="space-y-2 text-xs text-gray-300">
                  {resume.aiAnalysis.weakAreas?.map((weak, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Dynamic Verified Skill Engine */}
          <div className="glass-card p-6 text-left border border-white/5 space-y-4">
            <h4 className="text-sm uppercase tracking-wider text-white font-semibold flex items-center gap-2">
              <Star size={16} className="text-cyan-300" /> Dynamic Skill Verifications
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              These percentages are dynamically computed from performance averages in live AI-administered interview sessions.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              {Object.keys(verifiedSkillsMap).length > 0 ? (
                Object.entries(verifiedSkillsMap).map(([skill, score]) => (
                  <div key={skill} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">{skill}</span>
                      <span className="font-mono text-cyan-300">{score}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-[linear-gradient(90deg,var(--color-primary),#06b6d4)] h-full" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 text-center text-xs text-gray-500 py-4">
                  No verified skill assessments completed yet. Past interview scores will populate this automatically.
                </div>
              )}
            </div>
          </div>

          {/* Resume-Aware Interview History Timeline */}
          <div className="glass-card p-6 text-left border border-white/5 space-y-4">
            <h4 className="text-sm uppercase tracking-wider text-white font-semibold flex items-center gap-2">
              <Clock size={16} className="text-cyan-300" /> Assessment History Timeline
            </h4>
            <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session._id} className="relative">
                    {/* Circle icon */}
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-950 border-2 border-primary flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-white text-sm capitalize">{session.topic} Assessment</span>
                        <span className="text-xs font-semibold text-cyan-300">{session.score || 0}% Score</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 capitalize">
                        {session.difficulty} difficulty • {session.duration} mins • Taken: {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-3 text-[10px]">
                        <span className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-gray-300">Technical: {session.technicalScore || 0}%</span>
                        <span className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-gray-300">Comm: {session.communicationScore || 0}%</span>
                        <span className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-gray-300">Confidence: {session.confidenceScore || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 py-2">
                  No interview sessions recorded. Send interview invites to populate history.
                </div>
              )}
            </div>
          </div>

          {/* Experience, Education, Projects Lists */}
          <div className="space-y-4 text-left">
            <h4 className="text-sm uppercase tracking-wider text-white font-semibold flex items-center gap-2">
              <Briefcase size={16} className="text-gray-400" /> Work History & Projects
            </h4>
            <div className="space-y-4">
              {profile.experience?.map((exp, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <h5 className="font-semibold text-white text-sm">{exp.title} • <span className="text-gray-400 font-normal">{exp.company}</span></h5>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {exp.startDate ? new Date(exp.startDate).getFullYear() : ''} - {exp.currentlyWorking ? 'Present' : exp.endDate ? new Date(exp.endDate).getFullYear() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{exp.description}</p>
                </div>
              ))}
              {(!profile.experience || profile.experience.length === 0) && (
                <div className="text-xs text-gray-500 py-2">No work history provided.</div>
              )}
            </div>
          </div>

          <div className="space-y-4 text-left">
            <h4 className="text-sm uppercase tracking-wider text-white font-semibold flex items-center gap-2">
              <Code size={16} className="text-gray-400" /> Projects Portfolio
            </h4>
            <div className="space-y-4">
              {profile.projects?.map((proj, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-2.5">
                  <div className="flex justify-between items-start gap-3">
                    <h5 className="font-semibold text-white text-sm">{proj.name} <span className="text-xs text-gray-400 font-normal">({proj.role})</span></h5>
                    {proj.repositoryUrl && (
                      <a href={proj.repositoryUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        GitHub
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{proj.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {proj.technologies?.map((tech) => (
                      <span key={tech} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {(!profile.projects || profile.projects.length === 0) && (
                <div className="text-xs text-gray-500 py-2">No projects portfolio provided.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Resume Document Viewer */}
        <div className="w-[45%] flex flex-col bg-slate-950 overflow-hidden">
          {/* Tab Selector Bar */}
          <div className="bg-slate-900 border-b border-white/5 px-4 h-12 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              <span className="text-xs text-gray-300 font-medium">CV Document Viewer</span>
            </div>
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-white/5">
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'pdf' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                PDF View
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'text' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                AI Raw Text
              </button>
            </div>
          </div>

          {/* Main Viewer Body */}
          <div className="flex-1 overflow-hidden relative">
            {resume ? (
              activeTab === 'pdf' ? (
                <iframe
                  src={`${resumePreviewUrl}#toolbar=0`}
                  title="Candidate Resume Preview"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="w-full h-full overflow-y-auto p-6 text-left space-y-4 bg-slate-900 font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap select-all">
                  {resume.rawText || 'Raw text processing incomplete.'}
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <FileText size={48} className="text-gray-600 animate-pulse" />
                <h4 className="text-lg font-semibold text-white">No Document Uploaded</h4>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  This candidate has not attached a PDF or Word CV to their recruitment portal yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileView;
