import applicationService from '../services/application.service.js';
import candidateService from '../services/candidate.service.js';
import { calculateProfileCompleteness } from '../utils/profile.utils.js';
import handleControllerError from '../utils/controller-error.js';

const applyToJob = async (req, res, next) => {
  try {
    const profile = await candidateService.getOrCreateCandidateProfile(req.user._id);

    const completeness = calculateProfileCompleteness(profile);
    if (!completeness.canApply) {
      console.log(`[ApplyValidation] Application blocked. Candidate user ID: ${req.user._id} tried to apply but profile was incomplete. Missing fields: [${completeness.missingFields.join(', ')}]. Percentage completed: ${completeness.percentage}%`);
      return res.status(400).json({
        success: false,
        code: "PROFILE_INCOMPLETE",
        message: "Complete your profile before applying.",
        missingFields: completeness.missingFields
      });
    }

    const application = await applicationService.applyToJob(req.user, req.params.jobId, req.body);
    res.status(201).json({ application });
  } catch (error) {
    return handleControllerError('application.controller.applyToJob', res, next, error);
  }
};

const listCandidateApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.listCandidateApplications(req.user._id, req.query);
    res.status(200).json({ applications });
  } catch (error) {
    return handleControllerError('application.controller.listCandidateApplications', res, next, error);
  }
};

const getCandidateApplication = async (req, res, next) => {
  try {
    const application = await applicationService.getCandidateApplicationById(req.user._id, req.params.applicationId);
    res.status(200).json({ application });
  } catch (error) {
    return handleControllerError('application.controller.getCandidateApplication', res, next, error);
  }
};

const getJobApplicants = async (req, res, next) => {
  try {
    const applications = await applicationService.getJobApplicants(req.user._id, req.params.jobId, req.query);
    res.status(200).json({ applications });
  } catch (error) {
    return handleControllerError('application.controller.getJobApplicants', res, next, error);
  }
};

const getPipeline = async (req, res, next) => {
  try {
    const pipeline = await applicationService.getPipeline(req.user._id, req.params.jobId);
    res.status(200).json({ pipeline });
  } catch (error) {
    return handleControllerError('application.controller.getPipeline', res, next, error);
  }
};

const updateApplicationStage = async (req, res, next) => {
  try {
    const application = await applicationService.updateApplicationStage(req.user._id, req.params.applicationId, req.body);
    res.status(200).json({ application });
  } catch (error) {
    return handleControllerError('application.controller.updateApplicationStage', res, next, error);
  }
};

const scheduleInterview = async (req, res, next) => {
  try {
    console.log('Received schedule date:', req.body?.scheduledFor);

    const date = new Date(req.body?.scheduledFor);
    if (!req.body?.scheduledFor || Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ISO datetime'
      });
    }

    req.body.scheduledFor = date.toISOString();
    const result = await applicationService.scheduleInterview(req.user._id, req.params.applicationId, req.body);
    res.status(200).json({
      application: result.application,
      liveInterview: result.liveInterview
    });
  } catch (error) {
    if (error?.name === 'LiveInterviewSaveError') {
      return res.status(500).json({
        success: false,
        message: error.message,
        stack: error.stack
      });
    }
    return handleControllerError('application.controller.scheduleInterview', res, next, error);
  }
};

const addRecruiterFeedback = async (req, res, next) => {
  try {
    const application = await applicationService.addRecruiterFeedback(req.user._id, req.params.applicationId, req.body);
    res.status(200).json({ application });
  } catch (error) {
    return handleControllerError('application.controller.addRecruiterFeedback', res, next, error);
  }
};

export {
  applyToJob,
  listCandidateApplications,
  getCandidateApplication,
  getJobApplicants,
  getPipeline,
  updateApplicationStage,
  scheduleInterview,
  addRecruiterFeedback
};
