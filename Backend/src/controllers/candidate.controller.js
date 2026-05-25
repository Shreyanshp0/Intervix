const candidateService = require('../services/candidate.service');
const interviewSessionService = require('../services/interview-session.service');
const jobService = require('../services/job.service');

const getProfile = async (req, res, next) => {
  try {
    const profile = await candidateService.getProfileByUserId(req.user._id);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await candidateService.upsertProfile(req.user, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const [profile, interviewDashboard] = await Promise.all([
      candidateService.getProfileByUserId(req.user._id),
      interviewSessionService.getDashboard(req.user._id)
    ]);

    res.status(200).json({
      profile,
      interview: interviewDashboard
    });
  } catch (error) {
    next(error);
  }
};

const getJobsFeed = async (req, res, next) => {
  try {
    const feed = await jobService.getCandidateJobsFeed(req.user._id, req.query);
    res.status(200).json(feed);
  } catch (error) {
    next(error);
  }
};

const getJobDetails = async (req, res, next) => {
  try {
    const job = await jobService.getCandidateJobDetails(req.user._id, req.params.jobId);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  getJobsFeed,
  getJobDetails
};
