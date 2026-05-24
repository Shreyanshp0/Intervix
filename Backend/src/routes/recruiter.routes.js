const express = require('express');
const recruiterController = require('../controllers/recruiter.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');
const { validateCompanyProfile, validateRecruiterProfile } = require('../validators');

const router = express.Router();

router.use(protect, authorize('recruiter', 'admin'));

router.get('/dashboard', recruiterController.getRecruiterDashboard);
router.get('/profile/me', ensureOwnProfile('recruiter'), recruiterController.getRecruiterProfile);
router.put('/profile/me', ensureOwnProfile('recruiter'), validateRecruiterProfile, recruiterController.updateRecruiterProfile);
router.put('/company/me', ensureOwnProfile('recruiter'), validateCompanyProfile, recruiterController.updateCompanyProfile);

module.exports = router;
