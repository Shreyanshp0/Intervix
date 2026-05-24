const express = require('express');
const interviewController = require('../controllers/interview.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateStartSession, validateInterviewResponse } = require('../validators');

const router = express.Router();

router.use(protect);
router.use(authorize('candidate', 'admin'));

router.get('/dashboard', interviewController.getDashboard);
router.get('/active', interviewController.getActiveSession);
router.post('/start', validateStartSession, interviewController.startSession);
router.get('/:sessionId', interviewController.getSessionStatus);
router.get('/:sessionId/report', interviewController.getFinalReport);
router.post('/:sessionId/autosave', interviewController.autosaveSession);
router.post('/:sessionId/recover', interviewController.recoverSession);
router.post('/:sessionId/respond', validateInterviewResponse, interviewController.respondToQuestion);
router.post('/:sessionId/end', interviewController.endSession);

module.exports = router;
