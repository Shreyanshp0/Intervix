import copilotService from '../services/copilot.service.js';
import interviewPlannerService from '../services/interview-planner.service.js';
import analyticsService from '../services/analytics.service.js';
import LiveInterview from '../models/LiveInterview.js';
import Application from '../models/Application.js';
import JobPosting from '../models/JobPosting.js';
import CandidateProfile from '../models/CandidateProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import ApiError from '../utils/api-error.js';
import logger from '../config/logger.js';
import liveInterviewService from '../services/live-interview.service.js';
import candidateService from '../services/candidate.service.js';
import recruiterService from '../services/recruiter.service.js';
import * as liveInterviewSessionServiceModule from '../services/live-interview-session.service.js';
import crypto from 'crypto';
import handleControllerError from '../utils/controller-error.js';

// Safely extract the service whether it uses named exports, an exported object, or a default export
const liveInterviewSessionService = liveInterviewSessionServiceModule.default || liveInterviewSessionServiceModule.liveInterviewSessionService || liveInterviewSessionServiceModule;

class RecruiterAdvancedController {
  async queryCopilot(req, res, next) {
    try {
      const data = await copilotService.queryCopilot(req.body.query, req.user._id);
      res.status(200).json(data);
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.queryCopilot', res, next, error);
    }
  }

  async getHiringAnalytics(req, res, next) {
    try {
      const recruiter = await RecruiterProfile.findOne({ user: req.user._id });
      if (!recruiter) {
        logger.warn({
          tag: 'NULL_FALLBACK',
          message: 'Recruiter analytics fallback generated for missing recruiter profile',
          userId: req.user._id
        });
        return res.status(200).json({
          success: true,
          onboardingRequired: true,
          funnel: {
            Applied: 0,
            Shortlisted: 0,
            'Interview Scheduled': 0,
            Passed: 0,
            Rejected: 0,
            Hired: 0
          },
          activeJobsCount: 0,
          averageQualityScore: 0,
          averageAtsScore: 0,
          topCandidates: []
        });
      }

      const companyId = recruiter.company;

      const [jobsCount, stageStats, rawCandidates] = await Promise.all([
        JobPosting.countDocuments({ company: companyId, archivedAt: null, hiringStatus: 'open' }),
        Application.aggregate([
          { $match: { company: companyId } },
          {
            $group: {
              _id: '$stage',
              count: { $sum: 1 }
            }
          }
        ]),
        CandidateProfile.find({}).populate('resume').lean()
      ]);

      const funnel = {
        Applied: 0,
        Shortlisted: 0,
        'Interview Scheduled': 0,
        Passed: 0,
        Rejected: 0,
        Hired: 0
      };

      stageStats.forEach(stat => {
        if (stat._id in funnel) {
          funnel[stat._id] = stat.count;
        }
      });

      // Calculate candidate quality metrics
      const validQualityScores = rawCandidates
        .map((c) => c.resume?.aiAnalysis?.resumeQualityScore)
        .filter((score) => typeof score === 'number');

      const validAtsScores = rawCandidates
        .map((c) => c.resume?.aiAnalysis?.atsScore)
        .filter((score) => typeof score === 'number');

      const averageQualityScore = validQualityScores.length
        ? Math.round(validQualityScores.reduce((sum, val) => sum + val, 0) / validQualityScores.length)
        : 65;

      const averageAtsScore = validAtsScores.length
        ? Math.round(validAtsScores.reduce((sum, val) => sum + val, 0) / validAtsScores.length)
        : 60;

      // Extract top matched candidates
      const topCandidates = rawCandidates
        .map((c) => ({
          id: String(c._id),
          name: c.name,
          preferredRoles: c.preferredRoles || [],
          location: c.location || 'Remote',
          skillsCount: c.skills?.raw?.length || 0,
          qualityScore: c.resume?.aiAnalysis?.resumeQualityScore || 0,
          atsScore: c.resume?.aiAnalysis?.atsScore || 0
        }))
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 5);

      res.status(200).json({
        success: true,
        onboardingRequired: false,
        funnel,
        activeJobsCount: jobsCount,
        averageQualityScore,
        averageAtsScore,
        topCandidates
      });
    } catch (error) {
      logger.warn({
        tag: 'NULL_FALLBACK',
        message: `Recruiter analytics fallback generated: ${error.message}`,
        userId: req.user._id
      });

      res.status(200).json({
        success: true,
        onboardingRequired: true,
        funnel: {
          Applied: 0,
          Shortlisted: 0,
          'Interview Scheduled': 0,
          Passed: 0,
          Rejected: 0,
          Hired: 0
        },
        activeJobsCount: 0,
        averageQualityScore: 0,
        averageAtsScore: 0,
        topCandidates: []
      });
    }
  }

  async scheduleLiveInterview(req, res, next) {
    try {
      const { applicationId, scheduledAt } = req.body;
      if (!applicationId || !scheduledAt) {
        throw new ApiError(400, 'applicationId and scheduledAt are required');
      }

      const application = await Application.findById(applicationId).populate('job candidate candidateUser');
      if (!application) {
        throw new ApiError(404, 'Application record not found');
      }

      if (!application.job) {
        throw new ApiError(404, 'Job posting not found for this application');
      }

      if (!application.candidate) {
        throw new ApiError(404, 'Candidate profile not found for this application');
      }

      const recruiterProfile = await recruiterService.getOrCreateRecruiterProfile(req.user._id);
      if (!recruiterProfile?._id) {
        throw new ApiError(404, 'Recruiter profile not found');
      }

      const candidateProfile = await candidateService.getOrCreateCandidateProfile(
        application.candidateUser?._id || application.candidate?.user || req.user._id
      );

      if (!candidateProfile?._id) {
        throw new ApiError(404, 'Candidate profile not found for this application');
      }

      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        throw new ApiError(400, 'Invalid ISO datetime');
      }

      // Generate AI-planner tailoring directive
      const plan = await interviewPlannerService.generateTailoredPlan(
        application.candidateUser,
        application.job._id
      );

      const roomId = crypto.randomUUID();
      console.log('APPLICATION:', application?._id);
      console.log('JOB:', application?.job);
      console.log('CANDIDATE:', candidateProfile?._id);
      console.log('RECRUITER:', recruiterProfile?._id);
      console.log('SCHEDULED AT:', scheduledDate);
      console.log('ROOM ID:', roomId);

      if (!roomId) {
        throw new ApiError(500, 'Failed to generate room ID');
      }

      let liveInterview;
      try {
        console.log('Persisting LiveInterview document...');
        liveInterview = new LiveInterview({
          application: application._id,
          job: application.job._id,
          candidate: candidateProfile._id,
          recruiter: recruiterProfile._id,
          roomId,
          scheduledAt: scheduledDate,
          status: 'scheduled',
          lifecycleState: 'created',
          expiresAt: new Date(scheduledDate.getTime() + (2 * 60 * 60 * 1000)),
          problem: {
            title: `${application.job.roleTitle || 'Technical'} Live Challenge`,
            description: plan.plannerDirective || 'Evaluate problem solving, coding fluency, communication, and debugging tradeoffs.',
            difficulty: 'Medium',
            testCases: [
              { name: 'Case 1', input: 'Default input', expectedOutput: 'Expected output' }
            ]
          },
          codeState: {
            code: `function solution(input) {\n  // Explain your approach as you code.\n  return input;\n}\n\nconsole.log(solution('Default input'));`,
            language: 'javascript'
          },
          notepadContent: `// Dynamic Interview Plan:\n// ${plan.plannerDirective || 'Verify tech skills and core projects.'}\n\nfunction verifyTechnicalArchitect() {\n  // Code collaborative технічний round\n}\n`,
          recruiterNotes: `AI planner unverified gaps found: ${(plan.unverifiedSkills || []).join(', ') || 'None'}`
        });

        await liveInterview.save();
        console.log('LiveInterview saved successfully');

        if (!liveInterview) {
          throw new Error("Failed to persist LiveInterview");
        }
        console.log("LiveInterview created successfully:", liveInterview);
      } catch (error) {
        console.error('LIVE INTERVIEW SAVE ERROR:');
        console.error(error);

        return res.status(500).json({
          success: false,
          message: error.message,
          stack: error.stack
        });
      }

      const candidateSession = liveInterviewSessionService.issueJoinToken({
        roomId,
        role: 'candidate',
        userId: application.candidateUser?._id || candidateProfile.user || req.user._id,
        ttlMinutes: 120
      });

      // Update Application Schedule
      application.stage = 'Interview Scheduled';
      application.interviewSchedule = {
        scheduledFor: new Date(scheduledAt),
        timezone: 'GMT',
        mode: 'video',
        roomId,
        meetingLink: candidateSession.sessionUrl,
        sessionToken: candidateSession.token,
        sessionUrl: candidateSession.sessionUrl,
        sessionTokenExpiresAt: candidateSession.expiresAt,
        notes: plan.plannerDirective || 'Technical notepad assessments scheduled.'
      };
      await application.save();
      console.log("Application updated with meeting link successfully.");

      res.status(201).json({
        message: 'Live assessment scheduled and AI tailored plan generated successfully.',
        liveInterview,
        tailoredPlan: plan
      });
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.scheduleLiveInterview', res, next, error);
    }
  }

  async getLiveInterviewSession(req, res, next) {
    try {
      const { roomId } = req.params;
      const access = await liveInterviewService.assertRoomAccess(roomId, req.user, 'open');
      const tokenRole = access.role === 'admin' ? 'recruiter' : access.role;
      const session = liveInterviewSessionService.issueJoinToken({
        roomId,
        role: tokenRole,
        userId: req.user._id,
        ttlMinutes: 120
      });

      res.status(200).json({
        success: true,
        roomId,
        sessionToken: session.token,
        sessionUrl: session.sessionUrl,
        expiresAt: session.expiresAt
      });
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.getLiveInterviewSession', res, next, error);
    }
  }

  async listLiveInterviews(req, res, next) {
    try {
      const recruiter = await RecruiterProfile.findOne({ user: req.user._id });
      if (!recruiter) {
        throw new ApiError(404, 'Recruiter profile not found');
      }

      const list = await LiveInterview.find({ recruiter: recruiter._id })
        .populate([
          { path: 'candidate', select: 'name email phone location profilePhoto' },
          { path: 'job', select: 'roleTitle requiredSkills' },
          { path: 'application', select: 'stage interviewSchedule' }
        ])
        .sort({ scheduledAt: -1 });

      res.status(200).json({ interviews: list });
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.listLiveInterviews', res, next, error);
    }
  }

  async getLiveInterviewRoom(req, res, next) {
    try {
      console.log("Searching roomId:", req.params.roomId);
      const access = await liveInterviewService.assertRoomAccess(req.params.roomId, req.user, 'view');
      res.status(200).json({
        success: true,
        ...liveInterviewService.buildRoomPayload(access.room, access.role)
      });
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.getLiveInterviewRoom', res, next, error);
    }
  }

  async saveLiveNotepad(req, res, next) {
    try {
      const { roomId } = req.params;
      console.log("Searching roomId for notepad save:", roomId);
      const room = await LiveInterview.findOne({ roomId });
      if (!room) {
        throw new ApiError(404, 'Live Room session not found');
      }

      room.notepadContent = req.body.notepadContent ?? room.notepadContent;
      room.recruiterNotes = req.body.recruiterNotes ?? room.recruiterNotes;
      await room.save();

      res.status(200).json({ success: true, room });
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.saveLiveNotepad', res, next, error);
    }
  }

  async evaluateLiveInterview(req, res, next) {
    try {
      const { technicalScore, communicationScore, feedback } = req.body;
      const { roomId } = req.params;
      console.log("Searching roomId for evaluation:", roomId);
      const room = await LiveInterview.findOne({ roomId });
      if (!room) {
        throw new ApiError(404, 'Live Room session not found');
      }

      const employabilityScore = Math.round((Number(technicalScore) * 0.6) + (Number(communicationScore) * 0.4));

      room.status = 'completed';
      room.evaluation = {
        technicalScore: Number(technicalScore),
        communicationScore: Number(communicationScore),
        employabilityScore,
        feedback: feedback || ''
      };
      await room.save();

      // Dynamically verify this skill in Candidate Profile
      const profile = await CandidateProfile.findById(room.candidate);
      if (profile) {
        if (!profile.verifiedSkills) {
          profile.verifiedSkills = new Map();
        }

        const job = await JobPosting.findById(room.job);
        const topic = job?.roleTitle || 'Full Stack';

        const currentScore = profile.verifiedSkills.get
          ? profile.verifiedSkills.get(topic)
          : profile.verifiedSkills[topic];

        const nextScore = Math.max(currentScore || 0, Number(technicalScore));

        if (profile.verifiedSkills.set) {
          profile.verifiedSkills.set(topic, nextScore);
        } else {
          profile.verifiedSkills[topic] = nextScore;
        }

        const normalizedTopic = topic.trim().toLowerCase();
        if (!Array.isArray(profile.skills?.verified)) {
          profile.skills = profile.skills || {};
          profile.skills.verified = [];
        }

        if (!profile.skills.verified.includes(normalizedTopic)) {
          profile.skills.verified.push(normalizedTopic);
        }
        await profile.save();
      }

      res.status(200).json({ message: 'Live round evaluated successfully and skills verified in candidate profile.', room });
    } catch (error) {
      return handleControllerError('recruiter-advanced.controller.evaluateLiveInterview', res, next, error);
    }
  }
}

export default new RecruiterAdvancedController();
