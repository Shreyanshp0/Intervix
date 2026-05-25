const API_BASE = '/api';

const API_ROUTES = Object.freeze({
  auth: Object.freeze({
    login: `${API_BASE}/auth/login`,
    register: `${API_BASE}/auth/register`,
    me: `${API_BASE}/auth/me`,
    logout: `${API_BASE}/auth/logout`
  }),
  candidate: Object.freeze({
    me: `${API_BASE}/candidate/me`,
    dashboard: `${API_BASE}/candidate/dashboard`,
    jobsFeed: `${API_BASE}/candidate/jobs/feed`,
    applications: `${API_BASE}/candidate/applications`,
    jobDetails: (jobId) => `${API_BASE}/candidate/jobs/${jobId}`,
    applyToJob: (jobId) => `${API_BASE}/candidate/jobs/${jobId}/apply`,
    applicationDetails: (applicationId) => `${API_BASE}/candidate/applications/${applicationId}`
  }),
  recruiter: Object.freeze({
    me: `${API_BASE}/recruiter/me`,
    dashboard: `${API_BASE}/recruiter/dashboard`,
    jobs: `${API_BASE}/recruiter/jobs`,
    candidates: `${API_BASE}/recruiter/candidates`,
    jobDetails: (jobId) => `${API_BASE}/recruiter/jobs/${jobId}`,
    jobApplicants: (jobId) => `${API_BASE}/recruiter/jobs/${jobId}/applicants`,
    jobPipeline: (jobId) => `${API_BASE}/recruiter/jobs/${jobId}/pipeline`,
    applicationStage: (applicationId) => `${API_BASE}/recruiter/applications/${applicationId}/stage`,
    applicationFeedback: (applicationId) => `${API_BASE}/recruiter/applications/${applicationId}/feedback`,
    applicationSchedule: (applicationId) => `${API_BASE}/recruiter/applications/${applicationId}/schedule`,
    candidateDetails: (candidateId) => `${API_BASE}/recruiter/candidates/${candidateId}`,
    copilot: `${API_BASE}/recruiter/advanced/copilot`,
    analytics: `${API_BASE}/recruiter/advanced/analytics`,
    liveInterviews: `${API_BASE}/recruiter/advanced/live`,
    liveInterviewNotepad: (roomId) => `${API_BASE}/recruiter/advanced/live/${roomId}/notepad`,
    liveInterviewEvaluate: (roomId) => `${API_BASE}/recruiter/advanced/live/${roomId}/evaluate`
  }),
  jobs: Object.freeze({
    candidateFeed: `${API_BASE}/jobs/candidate`,
    candidateJobDetails: (jobId) => `${API_BASE}/jobs/candidate/${jobId}`,
    candidateApply: (jobId) => `${API_BASE}/jobs/candidate/${jobId}/apply`,
    recruiterJobs: `${API_BASE}/jobs/recruiter`,
    recruiterJobDetails: (jobId) => `${API_BASE}/jobs/recruiter/${jobId}`,
    recruiterPipeline: (jobId) => `${API_BASE}/jobs/recruiter/${jobId}/pipeline`,
    recruiterApplicants: (jobId) => `${API_BASE}/jobs/recruiter/${jobId}/applicants`
  }),
  resume: Object.freeze({
    upload: `${API_BASE}/resume/upload`,
    me: `${API_BASE}/resume/me`,
    analysis: `${API_BASE}/resume/me/analysis`,
    download: `${API_BASE}/resume/me/download`,
    byId: (resumeId) => `${API_BASE}/resume/${resumeId}`,
    analysisById: (resumeId) => `${API_BASE}/resume/${resumeId}/analysis`,
    downloadById: (resumeId) => `${API_BASE}/resume/${resumeId}/download`
  }),
  interviews: Object.freeze({
    dashboard: `${API_BASE}/interviews/dashboard`,
    active: `${API_BASE}/interviews/active`,
    start: `${API_BASE}/interviews/start`,
    report: (sessionId) => `${API_BASE}/interviews/${sessionId}/report`,
    autosave: (sessionId) => `${API_BASE}/interviews/${sessionId}/autosave`,
    end: (sessionId) => `${API_BASE}/interviews/${sessionId}/end`,
    respond: (sessionId) => `${API_BASE}/interviews/${sessionId}/respond`
  }),
  voice: Object.freeze({
    speak: `${API_BASE}/voice/speak`,
    respond: `${API_BASE}/voice/respond`,
    transcribe: `${API_BASE}/voice/transcribe`
  }),
  health: Object.freeze({
    api: `${API_BASE}/health/routes`,
    routes: '/health/routes',
    root: '/health'
  })
});

const ROUTE_DEFINITIONS = Object.freeze([
  { method: 'GET', path: API_ROUTES.auth.me, protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },
  { method: 'POST', path: API_ROUTES.auth.logout, protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },
  { method: 'POST', path: API_ROUTES.auth.login, protected: false, roles: [], middleware: ['validateLogin'] },
  { method: 'POST', path: API_ROUTES.auth.register, protected: false, roles: [], middleware: ['validateRegister'] },

  { method: 'GET', path: API_ROUTES.candidate.dashboard, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: API_ROUTES.candidate.me, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PUT', path: API_ROUTES.candidate.me, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateCandidateProfile'] },
  { method: 'GET', path: API_ROUTES.candidate.jobsFeed, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: API_ROUTES.candidate.applications, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },

  { method: 'GET', path: API_ROUTES.recruiter.dashboard, protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'GET', path: API_ROUTES.recruiter.me, protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PUT', path: API_ROUTES.recruiter.me, protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateRecruiterProfile'] },
  { method: 'GET', path: API_ROUTES.recruiter.candidates, protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: API_ROUTES.recruiter.jobs, protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'POST', path: API_ROUTES.recruiter.jobs, protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateJobPosting'] },

  { method: 'POST', path: API_ROUTES.resume.upload, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: API_ROUTES.resume.me, protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: API_ROUTES.health.api, protected: false, roles: [], middleware: [] },
  { method: 'GET', path: API_ROUTES.health.root, protected: false, roles: [], middleware: [] }
]);

const buildQualifiedRoutes = () => ROUTE_DEFINITIONS.map((route) => ({
  ...route,
  fullPath: route.path
}));

const getAllApiRoutes = () => ROUTE_DEFINITIONS.map((route) => route.path);

module.exports = {
  API_BASE,
  API_ROUTES,
  ROUTE_DEFINITIONS,
  buildQualifiedRoutes,
  getAllApiRoutes
};
