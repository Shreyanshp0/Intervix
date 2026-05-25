const express = require('express');
const jobController = require('../controllers/job.controller');
const applicationController = require('../controllers/application.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');
const {
  validateApplication,
  validateJobPosting,
  validateApplicationStageUpdate,
  validateInterviewSchedule,
  validateRecruiterFeedback
} = require('../validators');

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

module.exports = router;
