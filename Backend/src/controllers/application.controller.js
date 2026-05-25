const applicationService = require('../services/application.service');

const applyToJob = async (req, res, next) => {
  try {
    const application = await applicationService.applyToJob(req.user, req.params.jobId, req.body);
    res.status(201).json({ application });
  } catch (error) {
    next(error);
  }
};

const listCandidateApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.listCandidateApplications(req.user._id, req.query);
    res.status(200).json({ applications });
  } catch (error) {
    next(error);
  }
};

const getCandidateApplication = async (req, res, next) => {
  try {
    const application = await applicationService.getCandidateApplicationById(req.user._id, req.params.applicationId);
    res.status(200).json({ application });
  } catch (error) {
    next(error);
  }
};

const getJobApplicants = async (req, res, next) => {
  try {
    const applications = await applicationService.getJobApplicants(req.user._id, req.params.jobId, req.query);
    res.status(200).json({ applications });
  } catch (error) {
    next(error);
  }
};

const getPipeline = async (req, res, next) => {
  try {
    const pipeline = await applicationService.getPipeline(req.user._id, req.params.jobId);
    res.status(200).json({ pipeline });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStage = async (req, res, next) => {
  try {
    const application = await applicationService.updateApplicationStage(req.user._id, req.params.applicationId, req.body);
    res.status(200).json({ application });
  } catch (error) {
    next(error);
  }
};

const scheduleInterview = async (req, res, next) => {
  try {
    const application = await applicationService.scheduleInterview(req.user._id, req.params.applicationId, req.body);
    res.status(200).json({ application });
  } catch (error) {
    next(error);
  }
};

const addRecruiterFeedback = async (req, res, next) => {
  try {
    const application = await applicationService.addRecruiterFeedback(req.user._id, req.params.applicationId, req.body);
    res.status(200).json({ application });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyToJob,
  listCandidateApplications,
  getCandidateApplication,
  getJobApplicants,
  getPipeline,
  updateApplicationStage,
  scheduleInterview,
  addRecruiterFeedback
};
