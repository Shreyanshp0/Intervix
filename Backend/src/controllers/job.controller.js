const jobService = require('../services/job.service');

const createJob = async (req, res, next) => {
  try {
    const job = await jobService.createJob(req.user._id, req.body);
    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
};

const listRecruiterJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.listRecruiterJobs(req.user._id, req.query);
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
};

const getRecruiterJob = async (req, res, next) => {
  try {
    const job = await jobService.getRecruiterJobById(req.user._id, req.params.jobId);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.user._id, req.params.jobId, req.body);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const result = await jobService.deleteJob(req.user._id, req.params.jobId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listCandidateJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.listCandidateJobs(req.user._id, req.query);
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
};

const getCandidateJob = async (req, res, next) => {
  try {
    const job = await jobService.getCandidateJobDetails(req.user._id, req.params.jobId);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJob,
  listRecruiterJobs,
  getRecruiterJob,
  updateJob,
  deleteJob,
  listCandidateJobs,
  getCandidateJob
};
