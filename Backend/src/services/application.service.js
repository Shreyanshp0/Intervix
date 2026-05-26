import Application from '../models/Application.js';
import JobPosting from '../models/JobPosting.js';
import CandidateProfile from '../models/CandidateProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import LiveInterview from '../models/LiveInterview.js';
import crypto from 'crypto';
import matchingService from './matching.service.js';
import candidateService from './candidate.service.js';
import recruiterService from './recruiter.service.js';
import ApiError from '../utils/api-error.js';

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

    const job = application.job?._id ? application.job : await JobPosting.findById(application.job);
    if (!job) {
      throw new ApiError(404, 'Job posting not found for this application');
    }

    const candidateProfile = application.candidate?._id
      ? application.candidate
      : await candidateService.getOrCreateCandidateProfile(application.candidateUser || application.candidate?.user || userId);

    if (!candidateProfile?._id) {
      throw new ApiError(404, 'Candidate profile not found for this application');
    }

    const recruiterProfile = await recruiterService.getOrCreateRecruiterProfile(userId);
    if (!recruiterProfile?._id) {
      throw new ApiError(404, 'Recruiter profile not found');
    }

    let liveInterview = await LiveInterview.findOne({ application: application._id });

    const roomId = crypto.randomUUID();
    console.log('APPLICATION:', application?._id);
    console.log('JOB:', application?.job);
    console.log('CANDIDATE:', candidateProfile?._id);
    console.log('RECRUITER:', recruiterProfile?._id);
    console.log('SCHEDULED AT:', scheduledFor);
    console.log('ROOM ID:', roomId);

    if (!roomId) {
      throw new ApiError(500, 'Failed to generate room ID');
    }

    if (liveInterview) {
      liveInterview.scheduledAt = scheduledFor;
      liveInterview.status = 'scheduled';
      liveInterview.roomId = liveInterview.roomId || roomId;
      liveInterview.application = application._id;
      liveInterview.job = job._id || job;
      liveInterview.candidate = candidateProfile._id;
      liveInterview.recruiter = recruiterProfile._id;
      try {
        await liveInterview.save();
      } catch (error) {
        if (error?.name === 'ValidationError') {
          console.error('LiveInterview validation failed while updating existing record:', error.errors);
          throw new ApiError(422, 'LiveInterview validation failed');
        }
        throw error;
      }
    } else {
      console.log("Persisting LiveInterview...");
      try {
        liveInterview = new LiveInterview({
          application: application._id,
          job: job._id || job,
          candidate: candidateProfile._id,
          recruiter: recruiterProfile._id,
          scheduledAt: scheduledFor,
          status: 'scheduled',
          roomId
        });
        await liveInterview.save();
        console.log('LiveInterview saved successfully');
      } catch (error) {
        console.error('LIVE INTERVIEW SAVE ERROR:');
        console.error(error);

        const saveError = new Error(error.message);
        saveError.name = 'LiveInterviewSaveError';
        saveError.stack = error.stack;
        saveError.details = error.errors;
        throw saveError;
      }
      console.log("LiveInterview created:", liveInterview);

      if (!liveInterview) {
        throw new ApiError(500, "Failed to persist LiveInterview");
      }
    }

    const roomIdentifier = liveInterview.roomId;

    console.log("Updating application...");
    application.interviewSchedule = {
      scheduledFor,
      timezone: payload.timezone,
      mode: payload.mode,
      roomId: roomIdentifier,
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

export default new ApplicationService();
