import express from 'express';
import * as candidateController from '../controllers/candidate.controller.js';
import * as applicationController from '../controllers/application.controller.js';
import { protect, authorize, ensureOwnProfile } from '../middleware/auth.middleware.js';
import { validateApplication, validateCandidateProfile } from '../validators/index.js';

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

export default router;
