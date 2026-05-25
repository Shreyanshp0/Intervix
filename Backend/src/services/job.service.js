const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const RecruiterProfile = require('../models/RecruiterProfile');
const CandidateProfile = require('../models/CandidateProfile');
const matchingService = require('./matching.service');
const ApiError = require('../utils/api-error');

const baseJobPopulate = [
  { path: 'company', select: 'name logo industry website description' },
  { path: 'recruiter', select: 'fullName workEmail title' }
];

class JobService {
  normalizeSkills(skills = []) {
    return matchingService.normalizeSkills(skills);
  }

  buildSkillSet(skills = []) {
    const raw = [...new Set(
      skills
        .filter((skill) => typeof skill === 'string')
        .map((skill) => skill.trim())
        .filter(Boolean)
    )];

    return {
      raw,
      normalized: this.normalizeSkills(raw)
    };
  }

  buildSearchText(payload) {
    return [
      payload.roleTitle,
      payload.description,
      payload.location,
      ...(payload.requiredSkills?.raw || []),
      ...(payload.preferredSkills?.raw || []),
      ...(payload.responsibilities || []),
      ...(payload.qualifications || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  async getRecruiterProfile(userId) {
    const recruiter = await RecruiterProfile.findOne({ user: userId });
    if (!recruiter) {
      throw new ApiError(404, 'Recruiter profile not found');
    }
    return recruiter;
  }

  async createJob(userId, payload) {
    const recruiter = await this.getRecruiterProfile(userId);
    const job = await JobPosting.create({
      recruiter: recruiter._id,
      company: recruiter.company,
      roleTitle: payload.roleTitle,
      description: payload.description,
      requiredSkills: this.buildSkillSet(payload.requiredSkills),
      preferredSkills: this.buildSkillSet(payload.preferredSkills),
      experienceLevel: payload.experienceLevel,
      salaryRange: payload.salaryRange,
      location: payload.location,
      responsibilities: payload.responsibilities,
      qualifications: payload.qualifications,
      hiringStatus: payload.hiringStatus,
      interviewDifficulty: payload.interviewDifficulty,
      interviewStyle: payload.interviewStyle,
      searchText: ''
    });

    job.searchText = this.buildSearchText(job);
    await job.save();
    return JobPosting.findById(job._id).populate(baseJobPopulate);
  }

  async ensureRecruiterOwnsJob(userId, jobId) {
    const recruiter = await this.getRecruiterProfile(userId);
    const job = await JobPosting.findOne({
      _id: jobId,
      recruiter: recruiter._id,
      archivedAt: null
    }).populate(baseJobPopulate);

    if (!job) {
      throw new ApiError(404, 'Job posting not found');
    }

    return { recruiter, job };
  }

  async listRecruiterJobs(userId, query = {}) {
    const recruiter = await this.getRecruiterProfile(userId);
    const filter = {
      recruiter: recruiter._id,
      archivedAt: null
    };

    if (query.status) {
      filter.hiringStatus = query.status;
    }

    if (query.search) {
      filter.$or = [
        { roleTitle: { $regex: query.search, $options: 'i' } },
        { location: { $regex: query.search, $options: 'i' } },
        { searchText: { $regex: query.search, $options: 'i' } }
      ];
    }

    const jobs = await JobPosting.find(filter)
      .sort({ updatedAt: -1 })
      .populate(baseJobPopulate)
      .lean();

    const jobIds = jobs.map((job) => job._id);
    const stats = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: { job: '$job', stage: '$stage' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statMap = stats.reduce((acc, item) => {
      const key = String(item._id.job);
      acc[key] = acc[key] || {
        totalApplicants: 0,
        stages: {}
      };
      acc[key].totalApplicants += item.count;
      acc[key].stages[item._id.stage] = item.count;
      return acc;
    }, {});

    return jobs.map((job) => ({
      ...job,
      applicantStats: statMap[String(job._id)] || { totalApplicants: 0, stages: {} }
    }));
  }

  async getRecruiterJobById(userId, jobId) {
    const { job } = await this.ensureRecruiterOwnsJob(userId, jobId);
    return job;
  }

  async updateJob(userId, jobId, payload) {
    const { job } = await this.ensureRecruiterOwnsJob(userId, jobId);

    job.roleTitle = payload.roleTitle ?? job.roleTitle;
    job.description = payload.description ?? job.description;
    job.requiredSkills = payload.requiredSkills ? this.buildSkillSet(payload.requiredSkills) : job.requiredSkills;
    job.preferredSkills = payload.preferredSkills ? this.buildSkillSet(payload.preferredSkills) : job.preferredSkills;
    job.experienceLevel = payload.experienceLevel ?? job.experienceLevel;
    job.salaryRange = payload.salaryRange ?? job.salaryRange;
    job.location = payload.location ?? job.location;
    job.responsibilities = payload.responsibilities ?? job.responsibilities;
    job.qualifications = payload.qualifications ?? job.qualifications;
    job.hiringStatus = payload.hiringStatus ?? job.hiringStatus;
    job.interviewDifficulty = payload.interviewDifficulty ?? job.interviewDifficulty;
    job.interviewStyle = payload.interviewStyle ?? job.interviewStyle;
    job.searchText = this.buildSearchText(job);

    await job.save();
    return JobPosting.findById(job._id).populate(baseJobPopulate);
  }

  async deleteJob(userId, jobId) {
    const { job } = await this.ensureRecruiterOwnsJob(userId, jobId);
    job.archivedAt = new Date();
    job.hiringStatus = 'closed';
    await job.save();
    return { success: true };
  }

  async listCandidateJobs(userId, query = {}) {
    const profile = await CandidateProfile.findOne({ user: userId })
      .populate('resume')
      .lean();

    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }

    const filter = {
      archivedAt: null,
      hiringStatus: { $in: ['open', 'on-hold'] }
    };

    if (query.experienceLevel) {
      filter.experienceLevel = query.experienceLevel;
    }

    if (query.location) {
      filter.location = { $regex: query.location, $options: 'i' };
    }

    if (query.search) {
      filter.$or = [
        { roleTitle: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { searchText: { $regex: query.search, $options: 'i' } }
      ];
    }

    const jobs = await JobPosting.find(filter)
      .sort({ createdAt: -1 })
      .populate(baseJobPopulate)
      .lean();

    const applications = await Application.find({
      candidateUser: userId,
      job: { $in: jobs.map((job) => job._id) }
    }).select('job stage');

    const applicationMap = applications.reduce((acc, item) => {
      acc[String(item.job)] = item;
      return acc;
    }, {});

    const ranked = await Promise.all(
      jobs.map(async (job) => {
        const match = await matchingService.calculateMatchScore(profile, job);
        return {
          ...job,
          matchScore: match.score,
          matchBand: match.band,
          matchBreakdown: match.breakdown,
          candidateSummary: matchingService.generateCandidateSummary(profile, job, match),
          application: applicationMap[String(job._id)] || null
        };
      })
    );

    return ranked.sort((left, right) => right.matchScore - left.matchScore);
  }

  async getCandidateJobDetails(userId, jobId) {
    const profile = await CandidateProfile.findOne({ user: userId })
      .populate('resume')
      .lean();

    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }

    const job = await JobPosting.findOne({
      _id: jobId,
      archivedAt: null
    }).populate(baseJobPopulate).lean();

    if (!job || !['open', 'on-hold'].includes(job.hiringStatus)) {
      throw new ApiError(404, 'Job posting not found');
    }

    const match = await matchingService.calculateMatchScore(profile, job);
    const application = await Application.findOne({
      candidateUser: userId,
      job: jobId
    }).select('stage interviewSchedule recruiterFeedback updatedAt');

    if (application) {
      application.recruiterFeedback = application.recruiterFeedback.filter((item) => item.visibility === 'candidate');
    }

    return {
      ...job,
      matchScore: match.score,
      matchBand: match.band,
      matchBreakdown: match.breakdown,
      candidateSummary: matchingService.generateCandidateSummary(profile, job, match),
      application
    };
  }
}

module.exports = new JobService();
