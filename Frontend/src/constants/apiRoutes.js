const API_PREFIX = '/api';

export const API_ROUTES = {
  auth: {
    login: `${API_PREFIX}/auth/login`,
    register: `${API_PREFIX}/auth/register`,
    me: `${API_PREFIX}/auth/me`
  },
  candidate: {
    dashboard: `${API_PREFIX}/candidate/dashboard`,
    me: `${API_PREFIX}/candidate/me`,
    jobsFeed: `${API_PREFIX}/candidate/jobs/feed`,
    jobDetails: (jobId) => `${API_PREFIX}/candidate/jobs/${jobId}`,
    applyToJob: (jobId) => `${API_PREFIX}/candidate/jobs/${jobId}/apply`,
    applications: `${API_PREFIX}/candidate/applications`,
    applicationDetails: (applicationId) => `${API_PREFIX}/candidate/applications/${applicationId}`,
    liveInterviews: `${API_PREFIX}/candidate/live-interviews`,
    liveInterviewDetails: (roomId) => `${API_PREFIX}/candidate/live-interviews/${roomId}`
  },
  recruiter: {
    dashboard: `${API_PREFIX}/recruiter/dashboard`,
    me: `${API_PREFIX}/recruiter/me`,
    companyMe: `${API_PREFIX}/recruiter/company/me`,
    jobs: `${API_PREFIX}/recruiter/jobs`,
    jobDetails: (jobId) => `${API_PREFIX}/recruiter/jobs/${jobId}`,
    jobApplicants: (jobId) => `${API_PREFIX}/recruiter/jobs/${jobId}/applicants`,
    jobPipeline: (jobId) => `${API_PREFIX}/recruiter/jobs/${jobId}/pipeline`,
    applicationStage: (applicationId) => `${API_PREFIX}/recruiter/applications/${applicationId}/stage`,
    applicationFeedback: (applicationId) => `${API_PREFIX}/recruiter/applications/${applicationId}/feedback`,
    applicationSchedule: (applicationId) => `${API_PREFIX}/recruiter/applications/${applicationId}/schedule`,
    candidateDetails: (candidateId) => `${API_PREFIX}/recruiter/candidates/${candidateId}`,
    copilot: `${API_PREFIX}/recruiter/advanced/copilot`,
    analytics: `${API_PREFIX}/recruiter/advanced/analytics`,
    liveInterviews: `${API_PREFIX}/recruiter/advanced/live`,
    liveInterviewDetails: (roomId) => `${API_PREFIX}/recruiter/advanced/live/${roomId}`,
    liveInterviewSession: (roomId) => `${API_PREFIX}/recruiter/advanced/live/${roomId}/session`,
    liveInterviewNotepad: (roomId) => `${API_PREFIX}/recruiter/advanced/live/${roomId}/notepad`,
    liveInterviewEvaluate: (roomId) => `${API_PREFIX}/recruiter/advanced/live/${roomId}/evaluate`
  },
  resume: {
    upload: `${API_PREFIX}/resume/upload`,
    me: `${API_PREFIX}/resume/me`,
    myAnalysis: `${API_PREFIX}/resume/me/analysis`,
    myDownload: `${API_PREFIX}/resume/me/download`,
    byId: (resumeId) => `${API_PREFIX}/resume/${resumeId}`,
    analysisById: (resumeId) => `${API_PREFIX}/resume/${resumeId}/analysis`,
    downloadById: (resumeId) => `${API_PREFIX}/resume/${resumeId}/download`
  },
  interviews: {
    dashboard: `${API_PREFIX}/interviews/dashboard`,
    active: `${API_PREFIX}/interviews/active`,
    start: `${API_PREFIX}/interviews/start`,
    session: (token) => `${API_PREFIX}/interviews/session/${token}`,
    report: (sessionId) => `${API_PREFIX}/interviews/${sessionId}/report`,
    autosave: (sessionId) => `${API_PREFIX}/interviews/${sessionId}/autosave`,
    end: (sessionId) => `${API_PREFIX}/interviews/${sessionId}/end`,
    respond: (sessionId) => `${API_PREFIX}/interviews/${sessionId}/respond`
  },
  voice: {
    speak: `${API_PREFIX}/voice/speak`,
    respond: `${API_PREFIX}/voice/respond`
  },
  health: {
    routes: `${API_PREFIX}/health/routes`
  },
  webrtc: {
    config: `${API_PREFIX}/webrtc/config`
  }
};

const trimTrailingSegment = (value = '', pattern) => value.replace(pattern, '');
const normalizeOrigin = (value = '') => String(value || '').trim().replace(/\/+$/, '');
const shouldForceHttps = () => {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' || window.location.hostname === 'intervix.duckdns.org';
};

export const getApiOrigin = () => {
  const configured = normalizeOrigin(import.meta.env.VITE_API_URL || '/api');
  if (configured.startsWith('/')) {
    return '';
  }
  if (shouldForceHttps() && configured.startsWith('http://')) {
    return configured.replace(/^http:\/\//i, 'https://');
  }
  const withoutVersion = trimTrailingSegment(configured, /\/api\/v\d+\/?$/i);
  return trimTrailingSegment(withoutVersion, /\/api\/?$/i);
};

export const buildApiUrl = (route) => `${getApiOrigin()}${route}`;
