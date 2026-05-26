import recruiterService from '../services/recruiter.service.js';

const getRecruiterProfile = async (req, res, next) => {
  try {
    const profile = await recruiterService.getProfileByUserId(req.user._id);
    res.status(200).json({
      success: true,
      onboardingRequired: false,
      data: { profile, company: profile.company },
      profile,
      company: profile.company
    });
  } catch (error) {
    next(error);
  }
};

const updateRecruiterProfile = async (req, res, next) => {
  try {
    const profile = await recruiterService.updateRecruiterProfile(req.user, req.body);
    res.status(200).json({
      success: true,
      onboardingRequired: false,
      data: { profile, company: profile.company },
      profile,
      company: profile.company
    });
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
    res.status(200).json({
      success: true,
      onboardingRequired: Boolean(dashboard.onboardingRequired),
      data: dashboard,
      ...dashboard
    });
  } catch (error) {
    next(error);
  }
};

const getCandidateProfileForRecruiter = async (req, res, next) => {
  try {
    const data = await recruiterService.getCandidateProfileForRecruiter(req.params.candidateId);
    res.status(200).json({
      success: true,
      onboardingRequired: !data.profile,
      data,
      ...data
    });
  } catch (error) {
    next(error);
  }
};

export {
  getRecruiterProfile,
  updateRecruiterProfile,
  updateCompanyProfile,
  getRecruiterDashboard,
  getCandidateProfileForRecruiter
};
