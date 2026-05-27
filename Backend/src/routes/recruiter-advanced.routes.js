import express from 'express';
import recruiterAdvancedController from '../controllers/recruiter-advanced.controller.js';
import { protect, authorize, ensureOwnProfile } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect, authorize('recruiter', 'admin'));

router.post('/copilot', ensureOwnProfile('recruiter'), recruiterAdvancedController.queryCopilot);
router.get('/analytics', ensureOwnProfile('recruiter'), recruiterAdvancedController.getHiringAnalytics);

router.post('/live/schedule', ensureOwnProfile('recruiter'), recruiterAdvancedController.scheduleLiveInterview);
router.get('/live', ensureOwnProfile('recruiter'), recruiterAdvancedController.listLiveInterviews);

router.get('/live/:roomId/session', ensureOwnProfile('recruiter'), recruiterAdvancedController.getLiveInterviewSession);
router.get('/live/:roomId', ensureOwnProfile('recruiter'), recruiterAdvancedController.getLiveInterviewRoom);
router.put('/live/:roomId/notepad', ensureOwnProfile('recruiter'), recruiterAdvancedController.saveLiveNotepad);
router.post('/live/:roomId/evaluate', ensureOwnProfile('recruiter'), recruiterAdvancedController.evaluateLiveInterview);

export default router;
