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

defineLazyService('authService', async () => (await import('./auth.service.js')).default);
defineLazyService('candidateService', async () => (await import('./candidate.service.js')).default);
defineLazyService('jobService', async () => (await import('./job.service.js')).default);
defineLazyService('applicationService', async () => (await import('./application.service.js')).default);
defineLazyService('recruiterService', async () => (await import('./recruiter.service.js')).default);
defineLazyService('resumeParserService', async () => (await import('./resume-parser.service.js')).default);
defineLazyService('interviewSessionService', async () => (await import('./interview-session.service.js')).default);
defineLazyService('timerService', async () => (await import('./timer.service.js')).default);
defineLazyService('realtimeService', async () => (await import('./realtime.service.js')).default);
defineLazyService('voiceOrchestratorService', async () => (await import('./voice-orchestrator.service.js')).default);
defineLazyService('copilotService', async () => (await import('./copilot.service.js')).default);
defineLazyService('interviewPlannerService', async () => (await import('./interview-planner.service.js')).default);
defineLazyService('analyticsService', async () => (await import('./analytics.service.js')).default);
defineLazyService('matchingService', async () => (await import('./matching.service.js')).default);
defineLazyService('progressTrackingService', async () => (await import('./progress-tracking.service.js')).default);
defineLazyService('assessmentService', async () => (await import('./assessment.service.js')).default);

export default services;
