const CandidateProfile = require('../models/CandidateProfile');
const Company = require('../models/Company');
const RecruiterProfile = require('../models/RecruiterProfile');
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const ApiError = require('../utils/api-error');

const recruiterPopulate = [
  { path: 'company' }
];

class RecruiterService {
  async getProfileByUserId(userId) {
    const profile = await RecruiterProfile.findOne({ user: userId }).populate(recruiterPopulate);
    if (!profile) {
      throw new ApiError(404, 'Recruiter profile not found');
    }
    return profile;
  }

  async updateRecruiterProfile(user, payload) {
    const profile = await RecruiterProfile.findOne({ user: user._id }).populate(recruiterPopulate);
    if (!profile) {
      throw new ApiError(404, 'Recruiter profile not found');
    }

    profile.fullName = payload.fullName ?? profile.fullName;
    profile.workEmail = payload.workEmail ?? profile.workEmail;
    profile.phone = payload.phone ?? profile.phone;
    profile.title = payload.title ?? profile.title;
    profile.profilePhoto = payload.profilePhoto ?? profile.profilePhoto;
    profile.bio = payload.bio ?? profile.bio;
    profile.socialLinks = payload.socialLinks ?? profile.socialLinks;

    await profile.save();

    user.name = payload.fullName ?? user.name;
    user.email = payload.workEmail ?? user.email;
    user.onboardingCompleted = true;
    await user.save();

    return this.getProfileByUserId(user._id);
  }

  async updateCompanyProfile(userId, payload) {
    const profile = await RecruiterProfile.findOne({ user: userId });
    if (!profile) {
      throw new ApiError(404, 'Recruiter profile not found');
    }

    const company = await Company.findById(profile.company);
    if (!company) {
      throw new ApiError(404, 'Company profile not found');
    }

    company.name = payload.name ?? company.name;
    company.logo = payload.logo ?? company.logo;
    company.industry = payload.industry ?? company.industry;
    company.companySize = payload.companySize ?? company.companySize;
    company.website = payload.website ?? company.website;
    company.description = payload.description ?? company.description;
    company.recruiterDetails = payload.recruiterDetails ?? company.recruiterDetails;
    company.socialLinks = payload.socialLinks ?? company.socialLinks;

    await company.save();
    await User.findByIdAndUpdate(userId, { onboardingCompleted: true });
    return company;
  }

  async getDashboard(userId) {
    const recruiterProfile = await RecruiterProfile.findOne({ user: userId }).populate(recruiterPopulate);
    if (!recruiterProfile) {
      throw new ApiError(404, 'Recruiter profile not found');
    }

    const [totalCandidates, interviewMetrics, recentCandidates, activeJobs, applicationsByStage] = await Promise.all([
      CandidateProfile.countDocuments(),
      InterviewSession.aggregate([
        { $match: { status: { $in: ['completed', 'active'] } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      CandidateProfile.find({})
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name preferredRoles location skills completionScore updatedAt'),
      JobPosting.countDocuments({
        company: recruiterProfile.company._id,
        archivedAt: null,
        hiringStatus: { $in: ['open', 'on-hold'] }
      }),
      Application.aggregate([
        { $match: { company: recruiterProfile.company._id } },
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const metricMap = interviewMetrics.reduce((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, {});

    const stageMap = applicationsByStage.reduce((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, {});

    return {
      recruiterProfile,
      company: recruiterProfile.company,
      pipelineStats: {
        totalCandidates,
        activeJobs,
        totalApplications: Object.values(stageMap).reduce((sum, value) => sum + value, 0),
        interviewing: metricMap.active || 0,
        completedAssessments: metricMap.completed || 0,
        shortlisted: stageMap.Shortlisted || 0,
        hired: stageMap.Hired || 0
      },
      recentCandidates
    };
  }

  async getCandidateProfileForRecruiter(candidateId) {
    const profile = await CandidateProfile.findById(candidateId)
      .populate('resume')
      .lean();

    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }

    const sessions = await InterviewSession.find({
      userId: profile.user,
      status: { $in: ['completed', 'expired'] }
    })
      .sort({ createdAt: -1 })
      .select('topic difficulty duration score technicalScore communicationScore confidenceScore reportGeneratedAt createdAt')
      .lean();

    return {
      profile,
      sessions
    };
  }
}

module.exports = new RecruiterService();
