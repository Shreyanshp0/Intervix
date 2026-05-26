import express from 'express';
import * as recruiterController from '../controllers/recruiter.controller.js';
import * as applicationController from '../controllers/application.controller.js';
import * as jobController from '../controllers/job.controller.js';
import { protect, authorize, ensureOwnProfile } from '../middleware/auth.middleware.js';
import {
  validateApplicationStageUpdate,
  validateCompanyProfile,
  validateInterviewSchedule,
  validateJobPosting,
  validateRecruiterFeedback,
  validateRecruiterProfile
} from '../validators/index.js';

const router = express.Router();

router.use(protect, authorize('recruiter', 'admin'));

router.get('/dashboard', recruiterController.getRecruiterDashboard);
router.get('/me', ensureOwnProfile('recruiter'), recruiterController.getRecruiterProfile);
router.put('/me', ensureOwnProfile('recruiter'), validateRecruiterProfile, recruiterController.updateRecruiterProfile);
router.put('/company/me', ensureOwnProfile('recruiter'), validateCompanyProfile, recruiterController.updateCompanyProfile);
router.get('/jobs', ensureOwnProfile('recruiter'), jobController.listRecruiterJobs);
router.post('/jobs', ensureOwnProfile('recruiter'), validateJobPosting, jobController.createJob);
router.get('/jobs/:jobId', ensureOwnProfile('recruiter'), jobController.getRecruiterJob);
router.put('/jobs/:jobId', ensureOwnProfile('recruiter'), validateJobPosting, jobController.updateJob);
router.delete('/jobs/:jobId', ensureOwnProfile('recruiter'), jobController.deleteJob);
router.get('/jobs/:jobId/pipeline', ensureOwnProfile('recruiter'), applicationController.getPipeline);
router.get('/jobs/:jobId/applicants', ensureOwnProfile('recruiter'), applicationController.getJobApplicants);
router.patch('/applications/:applicationId/stage', ensureOwnProfile('recruiter'), validateApplicationStageUpdate, applicationController.updateApplicationStage);
router.patch('/applications/:applicationId/schedule', ensureOwnProfile('recruiter'), validateInterviewSchedule, applicationController.scheduleInterview);
router.patch('/applications/:applicationId/feedback', ensureOwnProfile('recruiter'), validateRecruiterFeedback, applicationController.addRecruiterFeedback);
router.get('/candidates/:candidateId', ensureOwnProfile('recruiter'), recruiterController.getCandidateProfileForRecruiter);

export default router;
