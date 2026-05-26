import express from 'express';
import * as jobController from '../controllers/job.controller.js';
import * as applicationController from '../controllers/application.controller.js';
import { protect, authorize, ensureOwnProfile } from '../middleware/auth.middleware.js';
import {
  validateApplication,
  validateJobPosting,
  validateApplicationStageUpdate,
  validateInterviewSchedule,
  validateRecruiterFeedback
} from '../validators/index.js';

const router = express.Router();

router.use(protect);

router.get('/candidate', authorize('candidate', 'admin'), ensureOwnProfile('candidate'), jobController.listCandidateJobs);
router.get('/candidate/:jobId', authorize('candidate', 'admin'), ensureOwnProfile('candidate'), jobController.getCandidateJob);
router.post('/candidate/:jobId/apply', authorize('candidate', 'admin'), ensureOwnProfile('candidate'), validateApplication, applicationController.applyToJob);

router.get('/recruiter', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), jobController.listRecruiterJobs);
router.post('/recruiter', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), validateJobPosting, jobController.createJob);
router.get('/recruiter/:jobId', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), jobController.getRecruiterJob);
router.put('/recruiter/:jobId', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), validateJobPosting, jobController.updateJob);
router.delete('/recruiter/:jobId', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), jobController.deleteJob);
router.get('/recruiter/:jobId/applicants', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), applicationController.getJobApplicants);
router.get('/recruiter/:jobId/pipeline', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), applicationController.getPipeline);

router.patch('/applications/:applicationId/stage', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), validateApplicationStageUpdate, applicationController.updateApplicationStage);
router.patch('/applications/:applicationId/schedule', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), validateInterviewSchedule, applicationController.scheduleInterview);
router.patch('/applications/:applicationId/feedback', authorize('recruiter', 'admin'), ensureOwnProfile('recruiter'), validateRecruiterFeedback, applicationController.addRecruiterFeedback);

export default router;
