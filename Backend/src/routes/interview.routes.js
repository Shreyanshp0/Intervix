import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/api-error.js';
import * as interviewController from '../controllers/interview.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateStartSession, validateInterviewResponse } from '../validators/index.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = express.Router();

// Custom 403-based session authorization guard to prevent global 401 Axios logout redirect loops
const protectSession = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(403, 'Session authorization token is required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.sub)
      .select('-password')
      .populate('candidateProfile recruiterProfile company');

    if (!req.user) {
      throw new ApiError(403, 'User account no longer exists');
    }
    next();
  } catch (error) {
    next(new ApiError(403, 'Session authorization failed: token is invalid or expired'));
  }
};

router.get('/session/:token', protectSession, authorize('candidate', 'recruiter', 'admin'), asyncHandler(interviewController.resolveLiveSession));

router.use(protect);

router.get('/dashboard', asyncHandler(interviewController.getDashboard));
router.get('/active', asyncHandler(interviewController.getActiveSession));
router.post('/start', validateStartSession, asyncHandler(interviewController.startSession));
router.get('/:sessionId', asyncHandler(interviewController.getSessionStatus));
router.get('/:sessionId/report', asyncHandler(interviewController.getFinalReport));
router.post('/:sessionId/autosave', asyncHandler(interviewController.autosaveSession));
router.post('/:sessionId/recover', asyncHandler(interviewController.recoverSession));
router.post('/:sessionId/respond', validateInterviewResponse, asyncHandler(interviewController.respondToQuestion));
router.post('/:sessionId/end', asyncHandler(interviewController.endSession));

export default router;
