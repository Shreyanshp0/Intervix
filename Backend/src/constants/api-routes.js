const API_VERSION = 'v1';

const API_PREFIXES = Object.freeze({
  unversioned: '/api',
  versioned: `/api/${API_VERSION}`
});

const ROUTE_DEFINITIONS = Object.freeze([
  { method: 'GET', path: '/auth/me', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },
  { method: 'POST', path: '/auth/login', protected: false, roles: [], middleware: ['validateLogin'] },
  { method: 'POST', path: '/auth/register', protected: false, roles: [], middleware: ['validateRegister'] },

  { method: 'GET', path: '/candidate/dashboard', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/candidate/me', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PUT', path: '/candidate/me', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateCandidateProfile'] },
  { method: 'GET', path: '/candidate/jobs/feed', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/candidate/jobs/:jobId', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'POST', path: '/candidate/jobs/:jobId/apply', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateApplication'] },
  { method: 'GET', path: '/candidate/applications', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/candidate/applications/:applicationId', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },

  { method: 'GET', path: '/recruiter/dashboard', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'GET', path: '/recruiter/me', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PUT', path: '/recruiter/me', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateRecruiterProfile'] },
  { method: 'PUT', path: '/recruiter/company/me', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateCompanyProfile'] },
  { method: 'GET', path: '/recruiter/jobs', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'POST', path: '/recruiter/jobs', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateJobPosting'] },
  { method: 'GET', path: '/recruiter/jobs/:jobId', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PUT', path: '/recruiter/jobs/:jobId', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateJobPosting'] },
  { method: 'DELETE', path: '/recruiter/jobs/:jobId', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/recruiter/jobs/:jobId/applicants', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/recruiter/jobs/:jobId/pipeline', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PATCH', path: '/recruiter/applications/:applicationId/stage', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateApplicationStageUpdate'] },
  { method: 'PATCH', path: '/recruiter/applications/:applicationId/schedule', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateInterviewSchedule'] },
  { method: 'PATCH', path: '/recruiter/applications/:applicationId/feedback', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'validateRecruiterFeedback'] },
  { method: 'GET', path: '/recruiter/candidates/:candidateId', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'POST', path: '/recruiter/advanced/copilot', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/recruiter/advanced/analytics', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'POST', path: '/recruiter/advanced/live/schedule', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/recruiter/advanced/live', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/recruiter/advanced/live/:roomId', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'PUT', path: '/recruiter/advanced/live/:roomId/notepad', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'POST', path: '/recruiter/advanced/live/:roomId/evaluate', protected: true, roles: ['recruiter', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },

  { method: 'POST', path: '/resume/upload', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile', 'upload.single'] },
  { method: 'GET', path: '/resume/me', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/resume/me/analysis', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/resume/me/download', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'DELETE', path: '/resume/me', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'ensureOwnProfile'] },
  { method: 'GET', path: '/resume/:resumeId', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },
  { method: 'GET', path: '/resume/:resumeId/analysis', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },
  { method: 'GET', path: '/resume/:resumeId/download', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },

  { method: 'GET', path: '/interviews/dashboard', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'GET', path: '/interviews/active', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'POST', path: '/interviews/start', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'validateStartSession'] },
  { method: 'GET', path: '/interviews/:sessionId', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'GET', path: '/interviews/:sessionId/report', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'POST', path: '/interviews/:sessionId/autosave', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'POST', path: '/interviews/:sessionId/recover', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },
  { method: 'POST', path: '/interviews/:sessionId/respond', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize', 'validateInterviewResponse'] },
  { method: 'POST', path: '/interviews/:sessionId/end', protected: true, roles: ['candidate', 'admin'], middleware: ['protect', 'authorize'] },

  { method: 'POST', path: '/voice/transcribe', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect', 'upload.single'] },
  { method: 'POST', path: '/voice/speak', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect'] },
  { method: 'POST', path: '/voice/respond', protected: true, roles: ['candidate', 'recruiter', 'admin'], middleware: ['protect', 'upload.single'] },

  { method: 'GET', path: '/health', protected: false, roles: [], middleware: [] },
  { method: 'GET', path: '/health/db', protected: false, roles: [], middleware: [] },
  { method: 'GET', path: '/health/ai', protected: false, roles: [], middleware: [] },
  { method: 'GET', path: '/health/routes', protected: false, roles: [], middleware: [] }
]);

const buildQualifiedRoutes = () => (
  ROUTE_DEFINITIONS.flatMap((route) => (
    Object.values(API_PREFIXES).map((prefix) => ({
      ...route,
      fullPath: `${prefix}${route.path}`
    }))
  ))
);

module.exports = {
  API_VERSION,
  API_PREFIXES,
  ROUTE_DEFINITIONS,
  buildQualifiedRoutes
};
