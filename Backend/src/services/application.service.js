import Application from '../models/Application.js';
import JobPosting from '../models/JobPosting.js';
import CandidateProfile from '../models/CandidateProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import LiveInterview from '../models/LiveInterview.js';
import crypto from 'crypto';
import matchingService from './matching.service.js';
import candidateService from './candidate.service.js';
import recruiterService from './recruiter.service.js';
import { issueJoinToken } from './live-interview-session.service.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/api-error.js';
import logger from '../config/logger.js';

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

  async hydrateApplicationInterviewStatus(application, userId) {
    if (!application) return application;
    
    // Convert to plain JS object so we can mutate freely
    const appObj = application.toObject ? application.toObject() : application;
    
    if (!appObj.interviewSchedule || !appObj.interviewSchedule.roomId) {
      return appObj;
    }
    
    try {
      const liveInterview = await LiveInterview.findOne({ application: appObj._id });
      if (liveInterview) {
        const now = Date.now();
        const startTime = new Date(liveInterview.scheduledAt).getTime();
        const endTime = startTime + (60 * 60 * 1000); // 60 minutes window
        
        let status = 'scheduled';
        
        if (liveInterview.status === 'completed' || liveInterview.lifecycleState === 'ended') {
          status = 'completed';
        } else if (liveInterview.status === 'cancelled') {
          status = 'cancelled';
        } else if (now >= startTime && now <= endTime) {
          status = 'active';
        } else if (now > endTime) {
          status = 'expired';
        }
        
        appObj.interviewSchedule.status = status;
        
        // Auto-generate candidate join token if active
        if (status === 'active') {
          const tokenData = issueJoinToken({
            roomId: liveInterview.roomId,
            role: 'candidate',
            userId: userId,
            ttlMinutes: 60
          });
          
          appObj.interviewSchedule.sessionToken = tokenData.token;
          appObj.interviewSchedule.sessionUrl = tokenData.sessionUrl;
          appObj.interviewSchedule.sessionTokenExpiresAt = new Date(tokenData.expiresAt);
        }
      } else {
        // Fallback if LiveInterview record is missing
        appObj.interviewSchedule.status = 'scheduled';
      }
    } catch (err) {
      console.error('[ApplicationService] Error hydrating interview status:', err);
    }
    
    return appObj;
  }

  async listCandidateApplications(userId, query = {}) {
    const filter = { candidateUser: userId };
    if (query.stage) {
      filter.stage = query.stage;
    }

    const applications = await Application.find(filter)
      .populate(applicationPopulate)
      .sort({ updatedAt: -1 });

    const filtered = applications.filter((application) => application.job);
    const hydrated = await Promise.all(
      filtered.map((app) => this.hydrateApplicationInterviewStatus(app, userId))
    );

    return hydrated.map((application) => {
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

    const hydrated = await this.hydrateApplicationInterviewStatus(application, userId);
    hydrated.recruiterFeedback = (hydrated.recruiterFeedback || []).filter((item) => item.visibility === 'candidate');
    return hydrated;
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

    try {
      const candidateUserId = application.candidateUser?._id || application.candidateUser;
      if (candidateUserId) {
        await notificationService.createNotification({
          userId: candidateUserId,
          type: 'INTERVIEW_UPDATED',
          title: 'Application Updated',
          message: `Your application stage for ${application.job?.title || 'the job'} has been updated to "${payload.stage}".`,
          metadata: {
            applicationId: String(application._id),
            stage: payload.stage
          }
        });
      }
    } catch (err) {
      logger.error(`[ApplicationService] Notification trigger in updateApplicationStage failed: ${err.message}`);
    }

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
    const roomId = liveInterview?.roomId || crypto.randomUUID();

    logger.info({
      tag: 'INTERVIEW_SCHEDULE_REQUEST',
      applicationId: String(application._id),
      jobId: String(job._id || job),
      candidateProfileId: String(candidateProfile._id),
      recruiterProfileId: String(recruiterProfile._id),
      scheduledFor: scheduledFor.toISOString(),
      roomId
    });

    if (liveInterview) {
      liveInterview.scheduledAt = scheduledFor;
      liveInterview.status = 'scheduled';
      liveInterview.roomId = roomId;
      liveInterview.application = application._id;
      liveInterview.job = job._id || job;
      liveInterview.candidate = candidateProfile._id;
      liveInterview.recruiter = recruiterProfile._id;
      try {
        await liveInterview.save();
      } catch (error) {
        if (error?.name === 'ValidationError') {
          logger.error({ tag: 'LIVE_INTERVIEW_VALIDATION_FAILED', action: 'update', roomId, errors: error.errors });
          throw new ApiError(422, 'LiveInterview validation failed', true, error.stack);
        }
        throw new ApiError(error?.statusCode || 500, error?.message || 'Failed to update LiveInterview', false, error.stack);
      }
    } else {
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
      } catch (error) {
        if (error?.name === 'ValidationError') {
          logger.error({ tag: 'LIVE_INTERVIEW_VALIDATION_FAILED', action: 'create', roomId, errors: error.errors });
          throw new ApiError(422, 'LiveInterview validation failed', true, error.stack);
        }

        if (error?.code === 11000) {
          logger.warn({ tag: 'LIVE_INTERVIEW_DUPLICATE_ROOM', roomId, applicationId: String(application._id) });
          throw new ApiError(409, 'An interview room already exists for this application', true, error.stack);
        }

        logger.error({ tag: 'LIVE_INTERVIEW_SAVE_FAILED', action: 'create', roomId, message: error?.message, stack: error?.stack });
        throw new ApiError(500, error?.message || 'Failed to persist LiveInterview', false, error.stack);
      }
    }

    const roomIdentifier = liveInterview.roomId;

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
    try {
      await application.save();
    } catch (error) {
      if (error?.name === 'ValidationError') {
        logger.error({ tag: 'APPLICATION_SAVE_VALIDATION_FAILED', applicationId: String(application._id), errors: error.errors });
        throw new ApiError(422, 'Application validation failed', true, error.stack);
      }

      throw new ApiError(error?.statusCode || 500, error?.message || 'Failed to update application', false, error.stack);
    }
    const updatedApplication = await Application.findById(applicationId).populate(applicationPopulate);
    logger.info({
      tag: 'INTERVIEW_SCHEDULED',
      applicationId: String(application._id),
      roomId: roomIdentifier,
      status: updatedApplication?.stage || 'Interview Scheduled'
    });

    try {
      const candidateUserId = application.candidateUser?._id || application.candidateUser;
      if (candidateUserId) {
        await notificationService.createNotification({
          userId: candidateUserId,
          type: 'INTERVIEW_SCHEDULED',
          title: 'Interview Scheduled',
          message: `You have an upcoming interview scheduled for ${job.title || 'the job'} on ${scheduledFor.toLocaleDateString()} at ${scheduledFor.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          metadata: {
            roomId: roomIdentifier,
            applicationId: String(application._id)
          }
        });
      }
    } catch (err) {
      logger.error(`[ApplicationService] Notification trigger in scheduleInterview failed: ${err.message}`);
    }

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

    if (payload.visibility === 'candidate') {
      try {
        const candidateUserId = application.candidateUser?._id || application.candidateUser;
        if (candidateUserId) {
          await notificationService.createNotification({
            userId: candidateUserId,
            type: 'FEEDBACK_RECEIVED',
            title: 'New Recruiter Feedback',
            message: `A recruiter left feedback on your application for ${application.job?.title || 'the job'}.`,
            metadata: {
              applicationId: String(application._id)
            }
          });
        }
      } catch (err) {
        logger.error(`[ApplicationService] Notification trigger in addRecruiterFeedback failed: ${err.message}`);
      }
    }

    return Application.findById(applicationId).populate(applicationPopulate);
  }
}

export default new ApplicationService();
