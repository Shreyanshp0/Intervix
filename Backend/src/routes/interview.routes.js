const express = require('express');
const interviewController = require('../controllers/interview.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateStartSession, validateInterviewResponse } = require('../validators');

const router = express.Router();

router.use(protect); // All interview routes require auth

router.get('/dashboard', interviewController.getDashboard);
router.post('/start', validateStartSession, interviewController.startSession);
router.get('/:sessionId', interviewController.getSessionStatus);
router.get('/:sessionId/report', interviewController.getFinalReport);
router.post('/:sessionId/respond', validateInterviewResponse, interviewController.respondToQuestion);
router.post('/:sessionId/end', interviewController.endSession);

module.exports = router;
