const express = require('express');
const authRoutes = require('./auth.routes');
const interviewRoutes = require('./interview.routes');
const voiceRoutes = require('./voice.routes');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/interviews', interviewRoutes);
router.use('/voice', voiceRoutes);

module.exports = router;
