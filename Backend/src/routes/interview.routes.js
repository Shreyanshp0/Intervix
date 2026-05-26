import express from 'express';
import * as interviewController from '../controllers/interview.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateStartSession, validateInterviewResponse } from '../validators/index.js';

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

export default router;
