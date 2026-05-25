const services = {};
const cache = {};

const defineLazyService = (key, loader) => {
  Object.defineProperty(services, key, {
    enumerable: true,
    configurable: false,
    get: () => {
      if (!cache[key]) {
        cache[key] = loader();
      }

      return cache[key];
    }
  });
};

defineLazyService('authService', () => require('./auth.service'));
defineLazyService('candidateService', () => require('./candidate.service'));
defineLazyService('jobService', () => require('./job.service'));
defineLazyService('applicationService', () => require('./application.service'));
defineLazyService('recruiterService', () => require('./recruiter.service'));
defineLazyService('resumeParserService', () => require('./resume-parser.service'));
defineLazyService('interviewSessionService', () => require('./interview-session.service'));
defineLazyService('timerService', () => require('./timer.service'));
defineLazyService('realtimeService', () => require('./realtime.service'));
defineLazyService('voiceOrchestratorService', () => require('./voice-orchestrator.service'));
defineLazyService('copilotService', () => require('./copilot.service'));
defineLazyService('interviewPlannerService', () => require('./interview-planner.service'));
defineLazyService('analyticsService', () => require('./analytics.service'));
defineLazyService('matchingService', () => require('./matching.service'));
defineLazyService('progressTrackingService', () => require('./progress-tracking.service'));
defineLazyService('assessmentService', () => require('./assessment.service'));

module.exports = services;
