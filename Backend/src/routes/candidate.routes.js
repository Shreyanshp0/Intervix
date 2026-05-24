const express = require('express');
const candidateController = require('../controllers/candidate.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');
const { validateCandidateProfile } = require('../validators');

const router = express.Router();

router.use(protect, authorize('candidate', 'admin'));

router.get('/dashboard', candidateController.getDashboard);
router.get('/profile/me', ensureOwnProfile('candidate'), candidateController.getProfile);
router.put('/profile/me', ensureOwnProfile('candidate'), validateCandidateProfile, candidateController.updateProfile);

module.exports = router;
