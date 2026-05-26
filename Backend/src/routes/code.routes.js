import express from 'express';
import * as codeController from '../controllers/code.controller.js';
import * as roomController from '../controllers/room.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce auth middleware for all collaborative coding routes
router.use(protect);

router.post('/run', codeController.runCode);
router.post('/room', roomController.createRoom);
router.get('/room/:roomId', roomController.validateRoom);

export default router;
