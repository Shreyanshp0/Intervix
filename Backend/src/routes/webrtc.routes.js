import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getRtcConfig } from '../controllers/webrtc.controller.js';

const router = express.Router();

router.get('/config', protect, getRtcConfig);

export default router;

