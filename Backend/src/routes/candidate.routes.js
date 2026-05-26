const express = require('express');
const candidateController = require('../controllers/candidate.controller');
const applicationController = require('../controllers/application.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');
const { validateApplication, validateCandidateProfile } = require('../validators');

const router = express.Router();

router.use(protect, authorize('candidate', 'admin'));

router.get('/dashboard', candidateController.getDashboard);
router.get('/jobs/feed', ensureOwnProfile('candidate'), candidateController.getJobsFeed);
router.get('/jobs/:jobId', ensureOwnProfile('candidate'), candidateController.getJobDetails);
router.post('/jobs/:jobId/apply', ensureOwnProfile('candidate'), validateApplication, applicationController.applyToJob);
router.get('/profile/me', ensureOwnProfile('candidate'), candidateController.getProfile);
router.put('/profile/me', ensureOwnProfile('candidate'), validateCandidateProfile, candidateController.updateProfile);
router.get('/me', ensureOwnProfile('candidate'), candidateController.getProfile);
router.put('/me', ensureOwnProfile('candidate'), validateCandidateProfile, candidateController.updateProfile);
router.get('/applications', ensureOwnProfile('candidate'), applicationController.listCandidateApplications);
router.get('/applications/:applicationId', ensureOwnProfile('candidate'), applicationController.getCandidateApplication);
router.get('/live-interviews', ensureOwnProfile('candidate'), candidateController.listLiveInterviews);
router.get('/live-interviews/:roomId', ensureOwnProfile('candidate'), candidateController.getLiveInterviewRoom);

module.exports = router;
