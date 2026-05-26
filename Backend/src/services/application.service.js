const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const LiveInterview = require('../models/LiveInterview');
const matchingService = require('./matching.service');
const ApiError = require('../utils/api-error');

const applicationPopulate = [
  {
    path: 'job',
    match: { archivedAt: null },
    populate: [
      { path: 'company', select: 'name logo industry website' },
      { path: 'recruiter', select: 'fullName title workEmail' }
    ]
  },
  {
    path: 'candidate',
    populate: [{ path: 'resume', select: 'fileName fileUrl' }]
  },
  { path: 'candidateUser', select: 'name email' },
  { path: 'recruiter', select: 'fullName workEmail title' },
  { path: 'company', select: 'name logo industry website' }
];

class ApplicationService {
  async getRecruiterProfile(userId) {
    const recruiter = await RecruiterProfile.findOne({ user: userId });
    if (!recruiter) {
      throw new ApiError(404, 'Recruiter profile not found');
    }
    return recruiter;
  }

  buildStageHistory(stage, userId, note = '') {
    return {
      stage,
      changedBy: userId,
      note
    };
  }

  async applyToJob(user, jobId, payload) {
    const candidateService = require('./candidate.service');
    const [profile, job] = await Promise.all([
      candidateService.getOrCreateCandidateProfile(user._id),
      JobPosting.findOne({ _id: jobId, archivedAt: null }).populate('company recruiter')
    ]);

    if (!job || job.hiringStatus !== 'open') {
      throw new ApiError(400, 'This job is not accepting applications');
    }

    const existingApplication = await Application.findOne({
      job: job._id,
      candidate: profile._id
    });

    if (existingApplication) {
      throw new ApiError(409, 'You have already applied to this job');
    }

    const profileDoc = profile.toObject ? profile.toObject() : profile;
    const jobDoc = job.toObject ? job.toObject() : job;
    const match = await matchingService.calculateMatchScore(profileDoc, jobDoc);
    const summary = matchingService.generateCandidateSummary(profileDoc, jobDoc, match);

    const application = await Application.create({
      job: job._id,
      candidate: profile._id,
      candidateUser: user._id,
      recruiter: job.recruiter._id || job.recruiter,
      company: job.company._id || job.company,
      stage: 'Applied',
      coverLetter: payload.coverLetter || '',
      matchSnapshot: {
        score: match.score,
        band: match.band,
        breakdown: match.breakdown,
        summary
      },
      stageHistory: [this.buildStageHistory('Applied', user._id, 'Application submitted')]
    });

    return Application.findById(application._id).populate(applicationPopulate);
  }

  async listCandidateApplications(userId, query = {}) {
    const filter = { candidateUser: userId };
    if (query.stage) {
      filter.stage = query.stage;
    }

    const applications = await Application.find(filter)
      .populate(applicationPopulate)
      .sort({ updatedAt: -1 });

    return applications
      .filter((application) => application.job)
      .map((application) => {
        application.recruiterFeedback = (application.recruiterFeedback || []).filter((item) => item.visibility === 'candidate');
        return application;
      });
  }

  async getCandidateApplicationById(userId, applicationId) {
    const application = await Application.findOne({
      _id: applicationId,
      candidateUser: userId
    }).populate(applicationPopulate);

    if (!application || !application.job) {
      throw new ApiError(404, 'Application not found');
    }

    application.recruiterFeedback = (application.recruiterFeedback || []).filter((item) => item.visibility === 'candidate');
    return application;
  }

  async getJobApplicants(userId, jobId, query = {}) {
    const recruiter = await this.getRecruiterProfile(userId);
    const job = await JobPosting.findOne({
      _id: jobId,
      recruiter: recruiter._id,
      archivedAt: null
    }).lean();

    if (!job) {
      throw new ApiError(404, 'Job posting not found');
    }

    const filter = { job: job._id };
    if (query.stage) {
      filter.stage = query.stage;
    }

    const applications = await Application.find(filter)
      .populate(applicationPopulate)
      .sort({ updatedAt: -1 });

    const hydrated = applications.filter((application) => application.candidate && application.job);

    const reranked = await Promise.all(
      hydrated.map(async (application) => {
        const profile = application.candidate.toObject ? application.candidate.toObject() : application.candidate;
        const match = await matchingService.calculateMatchScore(profile, job);
        const summary = matchingService.generateCandidateSummary(profile, job, match);

        application.matchSnapshot = {
          score: match.score,
          band: match.band,
          breakdown: match.breakdown,
          summary
        };
        await application.save();

        return application;
      })
    );

    return reranked.sort((left, right) => right.matchSnapshot.score - left.matchSnapshot.score);
  }

  async getPipeline(userId, jobId) {
    const applications = await this.getJobApplicants(userId, jobId);

    const columns = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Passed', 'Rejected', 'Hired']
      .map((stage) => ({
        stage,
        count: applications.filter((application) => application.stage === stage).length,
        applications: applications.filter((application) => application.stage === stage)
      }));

    return columns;
  }

  async ensureRecruiterOwnsApplication(userId, applicationId) {
    const recruiter = await this.getRecruiterProfile(userId);
    const application = await Application.findOne({
      _id: applicationId,
      recruiter: recruiter._id
    }).populate(applicationPopulate);

    if (!application || !application.job) {
      throw new ApiError(404, 'Application not found');
    }

    return application;
  }

  async updateApplicationStage(userId, applicationId, payload) {
    const application = await this.ensureRecruiterOwnsApplication(userId, applicationId);
    application.stage = payload.stage;
    application.stageHistory.push(this.buildStageHistory(payload.stage, userId, payload.note || 'Stage updated'));
    await application.save();
    return Application.findById(applicationId).populate(applicationPopulate);
  }

  async scheduleInterview(userId, applicationId, payload) {
    const application = await this.ensureRecruiterOwnsApplication(userId, applicationId);
    const scheduledFor = new Date(payload.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      throw new ApiError(400, 'Invalid ISO datetime');
    }

    const recruiter = await this.getRecruiterProfile(userId);
    let liveInterview = await LiveInterview.findOne({ application: application._id });

    if (liveInterview) {
      liveInterview.scheduledAt = scheduledFor;
      liveInterview.status = 'scheduled';
      await liveInterview.save();
    } else {
      liveInterview = await LiveInterview.create({
        application: application._id,
        job: application.job?._id || application.job,
        candidate: application.candidate?._id || application.candidate,
        recruiter: recruiter._id,
        scheduledAt: scheduledFor,
        status: 'scheduled'
      });
      console.log('Created Live Interview:', liveInterview);
    }

    const roomIdentifier = liveInterview.roomId || String(liveInterview._id);

    application.interviewSchedule = {
      scheduledFor,
      timezone: payload.timezone,
      mode: payload.mode,
      meetingLink: `/room/${roomIdentifier}`,
      notes: payload.notes
    };
    application.stage = 'Interview Scheduled';
    application.stageHistory.push(this.buildStageHistory('Interview Scheduled', userId, payload.notes || 'Interview scheduled'));
    await application.save();
    const updatedApplication = await Application.findById(applicationId).populate(applicationPopulate);
    return {
      application: updatedApplication,
      liveInterview
    };
  }

  async addRecruiterFeedback(userId, applicationId, payload) {
    const application = await this.ensureRecruiterOwnsApplication(userId, applicationId);
    application.recruiterFeedback.push({
      author: userId,
      message: payload.message,
      visibility: payload.visibility
    });
    await application.save();
    return Application.findById(applicationId).populate(applicationPopulate);
  }
}

module.exports = new ApplicationService();
