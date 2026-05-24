const recruiterService = require('../services/recruiter.service');

const getRecruiterProfile = async (req, res, next) => {
  try {
    const profile = await recruiterService.getProfileByUserId(req.user._id);
    res.status(200).json({ profile, company: profile.company });
  } catch (error) {
    next(error);
  }
};

const updateRecruiterProfile = async (req, res, next) => {
  try {
    const profile = await recruiterService.updateRecruiterProfile(req.user, req.body);
    res.status(200).json({ profile, company: profile.company });
  } catch (error) {
    next(error);
  }
};

const updateCompanyProfile = async (req, res, next) => {
  try {
    const company = await recruiterService.updateCompanyProfile(req.user._id, req.body);
    res.status(200).json({ company });
  } catch (error) {
    next(error);
  }
};

const getRecruiterDashboard = async (req, res, next) => {
  try {
    const dashboard = await recruiterService.getDashboard(req.user._id);
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecruiterProfile,
  updateRecruiterProfile,
  updateCompanyProfile,
  getRecruiterDashboard
};
