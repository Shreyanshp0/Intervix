import jobService from '../services/job.service.js';
import handleControllerError from '../utils/controller-error.js';

const createJob = async (req, res, next) => {
  try {
    const job = await jobService.createJob(req.user._id, req.body);
    res.status(201).json({ job });
  } catch (error) {
    return handleControllerError('job.controller.createJob', res, next, error);
  }
};

const listRecruiterJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.listRecruiterJobs(req.user._id, req.query);
    res.status(200).json({ jobs });
  } catch (error) {
    return handleControllerError('job.controller.listRecruiterJobs', res, next, error);
  }
};

const getRecruiterJob = async (req, res, next) => {
  try {
    const job = await jobService.getRecruiterJobById(req.user._id, req.params.jobId);
    res.status(200).json({ job });
  } catch (error) {
    return handleControllerError('job.controller.getRecruiterJob', res, next, error);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.user._id, req.params.jobId, req.body);
    res.status(200).json({ job });
  } catch (error) {
    return handleControllerError('job.controller.updateJob', res, next, error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const result = await jobService.deleteJob(req.user._id, req.params.jobId);
    res.status(200).json(result);
  } catch (error) {
    return handleControllerError('job.controller.deleteJob', res, next, error);
  }
};

const listCandidateJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.listCandidateJobs(req.user._id, req.query);
    res.status(200).json({ jobs });
  } catch (error) {
    return handleControllerError('job.controller.listCandidateJobs', res, next, error);
  }
};

const getCandidateJob = async (req, res, next) => {
  try {
    const job = await jobService.getCandidateJobDetails(req.user._id, req.params.jobId);
    res.status(200).json({ job });
  } catch (error) {
    return handleControllerError('job.controller.getCandidateJob', res, next, error);
  }
};

export {
  createJob,
  listRecruiterJobs,
  getRecruiterJob,
  updateJob,
  deleteJob,
  listCandidateJobs,
  getCandidateJob
};
