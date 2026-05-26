import express from 'express';
import mongoose from 'mongoose';

import authRoutes from './auth.routes.js';
import candidateRoutes from './candidate.routes.js';
import interviewRoutes from './interview.routes.js';
import recruiterRoutes from './recruiter.routes.js';
import voiceRoutes from './voice.routes.js';
import resumeRoutes from './resume.routes.js';
import recruiterAdvancedRoutes from './recruiter-advanced.routes.js';
import codeRoutes from './code.routes.js';
import { buildRouteHealthReport } from '../utils/route-diagnostics.js';
import { buildValidationReport } from '../utils/route-validator.js';
import { generateDeploymentHealthReport } from '../utils/deployment-health.js';
import { getDiagnosticsLogger } from '../utils/request-diagnostics.js';
import { fetchWithTimeout } from '../utils/network.js';

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

/**
 * Route validation endpoint
 * Returns comprehensive route validation report
 * Detects conflicts, protection issues, and consistency problems
 */
router.get('/health/routes/validation', (req, res) => {
	try {
		const validationReport = buildValidationReport();
		const statusCode = validationReport.status === 'VALID' ? 200 : (validationReport.status === 'WARNING' ? 200 : 503);
		return res.status(statusCode).json(validationReport);
	} catch (e) {
		return res.status(500).json({ 
			error: 'Failed to generate route validation report',
			message: e.message 
		});
	}
});

/**
 * Deployment health check endpoint
 * Validates frontend/backend consistency, Docker config, and cache busting
 */
router.get('/health/deployment', (req, res) => {
	try {
		const deploymentReport = generateDeploymentHealthReport();
		const statusCode = deploymentReport.status === 'HEALTHY' ? 200 : 503;
		return res.status(statusCode).json(deploymentReport);
	} catch (e) {
		return res.status(500).json({ 
			error: 'Failed to generate deployment health report',
			message: e.message 
		});
	}
});

/**
 * Request diagnostics endpoint
 * Returns diagnostics about API usage, failures, and issues
 * Includes slow endpoints, repeated failures, and route mismatches
 */
router.get('/health/diagnostics', (req, res) => {
	try {
		const diagnosticsLogger = getDiagnosticsLogger();
		const report = diagnosticsLogger.getReport();
		return res.status(200).json(report);
	} catch (e) {
		return res.status(500).json({ 
			error: 'Failed to generate diagnostics report',
			message: e.message 
		});
	}
});

/**
 * Comprehensive health check - combines all health checks
 */
router.get('/health/full', async (req, res) => {
	try {
		const routeHealth = buildRouteHealthReport();
		const validationReport = buildValidationReport();
		const deploymentReport = generateDeploymentHealthReport();
		const diagnosticsReport = getDiagnosticsLogger().getReport();

		const allHealthy = routeHealth && validationReport.status === 'VALID' && deploymentReport.status === 'HEALTHY';

		return res.status(allHealthy ? 200 : 503).json({
			timestamp: new Date().toISOString(),
			overallStatus: allHealthy ? 'HEALTHY' : 'DEGRADED',
			routes: routeHealth,
			validation: validationReport,
			deployment: deploymentReport,
			diagnostics: diagnosticsReport
		});
	} catch (e) {
		return res.status(500).json({ 
			error: 'Failed to generate full health report',
			message: e.message 
		});
	}
});

router.use('/auth', authRoutes);
router.use('/candidate', candidateRoutes);
router.use('/interviews', interviewRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/voice', voiceRoutes);
router.use('/resume', resumeRoutes);
router.use('/recruiter/advanced', recruiterAdvancedRoutes);
router.use('/code', codeRoutes);

export default router;
