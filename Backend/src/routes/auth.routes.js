import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../validators/index.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', protect, authController.me);
router.post('/logout', protect, authController.logout);

export default router;
