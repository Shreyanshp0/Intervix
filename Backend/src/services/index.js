import authService from './auth.service.js';
import candidateService from './candidate.service.js';
import jobService from './job.service.js';
import applicationService from './application.service.js';
import recruiterService from './recruiter.service.js';
import resumeParserService from './resume-parser.service.js';
import interviewSessionService from './interview-session.service.js';
import timerService from './timer.service.js';
import realtimeService from './realtime.service.js';
import voiceOrchestratorService from './voice-orchestrator.service.js';
import copilotService from './copilot.service.js';
import interviewPlannerService from './interview-planner.service.js';
import analyticsService from './analytics.service.js';
import matchingService from './matching.service.js';
import progressTrackingService from './progress-tracking.service.js';
import assessmentService from './assessment.service.js';

const services = {
  authService,
  candidateService,
  jobService,
  applicationService,
  recruiterService,
  resumeParserService,
  interviewSessionService,
  timerService,
  realtimeService,
  voiceOrchestratorService,
  copilotService,
  interviewPlannerService,
  analyticsService,
  matchingService,
  progressTrackingService,
  assessmentService,
};

export default services;
