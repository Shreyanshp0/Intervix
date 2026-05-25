const express = require('express');
const recruiterAdvancedController = require('../controllers/recruiter-advanced.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect, authorize('recruiter', 'admin'));

router.post('/copilot', ensureOwnProfile('recruiter'), recruiterAdvancedController.queryCopilot);
router.get('/analytics', ensureOwnProfile('recruiter'), recruiterAdvancedController.getHiringAnalytics);

router.post('/live/schedule', ensureOwnProfile('recruiter'), recruiterAdvancedController.scheduleLiveInterview);
router.get('/live', ensureOwnProfile('recruiter'), recruiterAdvancedController.listLiveInterviews);

router.get('/live/:roomId', ensureOwnProfile('recruiter'), recruiterAdvancedController.getLiveInterviewRoom);
router.put('/live/:roomId/notepad', ensureOwnProfile('recruiter'), recruiterAdvancedController.saveLiveNotepad);
router.post('/live/:roomId/evaluate', ensureOwnProfile('recruiter'), recruiterAdvancedController.evaluateLiveInterview);

module.exports = router;
