import candidateService from '../services/candidate.service.js';
import interviewSessionService from '../services/interview-session.service.js';
import jobService from '../services/job.service.js';
import LiveInterview from '../models/LiveInterview.js';
import liveInterviewService from '../services/live-interview.service.js';
import applicationService from '../services/application.service.js';
import handleControllerError from '../utils/controller-error.js';

const getProfile = async (req, res, next) => {
  try {
    const profile = await candidateService.getOrCreateCandidateProfile(req.user._id);
    res.status(200).json({ profile });
  } catch (error) {
    return handleControllerError('candidate.controller.getProfile', res, next, error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await candidateService.upsertProfile(req.user, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    return handleControllerError('candidate.controller.updateProfile', res, next, error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const [profile, interviewDashboard] = await Promise.all([
      candidateService.getOrCreateCandidateProfile(req.user._id),
      interviewSessionService.getDashboard(req.user._id)
    ]);

    const onboardingRequired = !profile?.resume || !profile?.skills?.raw?.length;

    res.status(200).json({
      success: true,
      onboardingRequired,
      hasResume: !!profile?.resume,
      data: {
        profile,
        interview: interviewDashboard
      },
      profile,
      interview: interviewDashboard
    });
  } catch (error) {
    return handleControllerError('candidate.controller.getDashboard', res, next, error);
  }
};

const getJobsFeed = async (req, res, next) => {
  try {
    const feed = await jobService.getCandidateJobsFeed(req.user._id, req.query);
    res.status(200).json(feed);
  } catch (error) {
    return handleControllerError('candidate.controller.getJobsFeed', res, next, error);
  }
};

const getJobDetails = async (req, res, next) => {
  try {
    const job = await jobService.getCandidateJobDetails(req.user._id, req.params.jobId);
    res.status(200).json({ job });
  } catch (error) {
    return handleControllerError('candidate.controller.getJobDetails', res, next, error);
  }
};

const listLiveInterviews = async (req, res, next) => {
  try {
    const profile = await candidateService.getOrCreateCandidateProfile(req.user._id);
    const interviews = await LiveInterview.find({ candidate: profile._id })
      .populate([
        { path: 'recruiter', select: 'name email title' },
        { path: 'job', select: 'roleTitle requiredSkills' },
        { path: 'application', select: 'stage interviewSchedule' }
      ])
      .sort({ scheduledAt: -1 });

    const hydratedInterviews = await Promise.all(
      interviews.map(async (interview) => {
        const interviewObj = interview.toObject ? interview.toObject() : interview;
        if (interviewObj.application) {
          interviewObj.application = await applicationService.hydrateApplicationInterviewStatus(
            interviewObj.application,
            req.user._id
          );
        }
        return interviewObj;
      })
    );

    res.status(200).json({ success: true, interviews: hydratedInterviews });
  } catch (error) {
    return handleControllerError('candidate.controller.listLiveInterviews', res, next, error);
  }
};

const getLiveInterviewRoom = async (req, res, next) => {
  try {
    const access = await liveInterviewService.assertRoomAccess(req.params.roomId, req.user, 'view');
    res.status(200).json({
      success: true,
      ...liveInterviewService.buildRoomPayload(access.room, access.role)
    });
  } catch (error) {
    return handleControllerError('candidate.controller.getLiveInterviewRoom', res, next, error);
  }
};

export {
  getProfile,
  updateProfile,
  getDashboard,
  getJobsFeed,
  getJobDetails,
  listLiveInterviews,
  getLiveInterviewRoom
};
