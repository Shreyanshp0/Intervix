const express = require('express');
const authRoutes = require('./auth.routes');
const candidateRoutes = require('./candidate.routes');
const interviewRoutes = require('./interview.routes');
const recruiterRoutes = require('./recruiter.routes');
const voiceRoutes = require('./voice.routes');
const resumeRoutes = require('./resume.routes');
const recruiterAdvancedRoutes = require('./recruiter-advanced.routes');
const { buildRouteHealthReport } = require('../utils/route-diagnostics');


const { fetchWithTimeout } = require('../utils/network');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

router.get('/health/db', async (req, res) => {
	try {
		const state = mongoose.connection.readyState; // 1 = connected
		const ok = state === 1;
		return res.status(ok ? 200 : 503).json({ healthy: ok, state });
	} catch (e) {
		return res.status(500).json({ healthy: false, error: e.message });
	}
});

router.get('/health/ai', async (req, res) => {
	const hfStatus = { healthy: false };
	try {
		if (!process.env.HF_TOKEN) {
			hfStatus.healthy = false;
			hfStatus.note = 'HF_TOKEN not configured';
		} else {
			const url = `https://api-inference.huggingface.co/models/${process.env.WHISPER_MODEL_ID || 'openai/whisper-large-v3'}`;
			try {
				await fetchWithTimeout(url, { method: 'GET', timeoutMs: 3000, retries: 0, headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } });
				hfStatus.healthy = true;
			} catch (err) {
				hfStatus.healthy = false;
				hfStatus.error = err.message;
			}
		}

		const groqStatus = { healthy: !!process.env.GROQ_API_KEY };

		return res.status(hfStatus.healthy && groqStatus.healthy ? 200 : 503).json({ hf: hfStatus, groq: groqStatus });
	} catch (e) {
		return res.status(500).json({ healthy: false, error: e.message });
	}
});

router.get('/health/routes', (req, res) => {
	return res.status(200).json(buildRouteHealthReport());
});

router.use('/auth', authRoutes);
router.use('/candidate', candidateRoutes);
router.use('/interviews', interviewRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/voice', voiceRoutes);
router.use('/resume', resumeRoutes);
router.use('/recruiter/advanced', recruiterAdvancedRoutes);

module.exports = router;
