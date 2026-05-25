const express = require('express');
const recruiterController = require('../controllers/recruiter.controller');
const applicationController = require('../controllers/application.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');
const { validateCompanyProfile, validateRecruiterProfile } = require('../validators');

const router = express.Router();

router.use(protect, authorize('recruiter', 'admin'));

router.get('/dashboard', recruiterController.getRecruiterDashboard);
router.get('/profile/me', ensureOwnProfile('recruiter'), recruiterController.getRecruiterProfile);
router.put('/profile/me', ensureOwnProfile('recruiter'), validateRecruiterProfile, recruiterController.updateRecruiterProfile);
router.put('/company/me', ensureOwnProfile('recruiter'), validateCompanyProfile, recruiterController.updateCompanyProfile);
router.get('/jobs/:jobId/pipeline', ensureOwnProfile('recruiter'), applicationController.getPipeline);
router.get('/jobs/:jobId/applicants', ensureOwnProfile('recruiter'), applicationController.getJobApplicants);
router.get('/candidates/:candidateId', ensureOwnProfile('recruiter'), recruiterController.getCandidateProfileForRecruiter);

module.exports = router;
