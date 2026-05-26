const copilotService = require('../services/copilot.service');
const interviewPlannerService = require('../services/interview-planner.service');
const analyticsService = require('../services/analytics.service');
const LiveInterview = require('../models/LiveInterview');
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const ApiError = require('../utils/api-error');
const logger = require('../config/logger');
const liveInterviewService = require('../services/live-interview.service');
const crypto = require('crypto');

class RecruiterAdvancedController {
  async queryCopilot(req, res, next) {
    try {
      const data = await copilotService.queryCopilot(req.body.query, req.user._id);
      res.status(200).json(data);
    } catch (error) {
      next(error);
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

      const application = await Application.findById(applicationId).populate('job candidate');
      if (!application) {
        throw new ApiError(404, 'Application record not found');
      }

      const recruiter = await RecruiterProfile.findOne({ user: req.user._id });
      if (!recruiter) {
        throw new ApiError(404, 'Recruiter profile not found');
      }

      // Generate AI-planner tailoring directive
      const plan = await interviewPlannerService.generateTailoredPlan(
        application.candidateUser,
        application.job._id
      );

      const liveInterview = await LiveInterview.create({
        application: application._id,
        job: application.job._id,
        candidate: application.candidate._id,
        recruiter: recruiter._id,
        roomId: crypto.randomBytes(8).toString('hex'),
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled',
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

      // Update Application Schedule
      application.stage = 'Interview Scheduled';
      application.interviewSchedule = {
        scheduledFor: new Date(scheduledAt),
        timezone: 'GMT',
        mode: 'video',
        meetingLink: `/room/${liveInterview.roomId}`,
        notes: plan.plannerDirective || 'Technical notepad assessments scheduled.'
      };
      await application.save();

      res.status(201).json({
        message: 'Live assessment scheduled and AI tailored plan generated successfully.',
        liveInterview,
        tailoredPlan: plan
      });
    } catch (error) {
      next(error);
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
          { path: 'job', select: 'roleTitle requiredSkills' }
        ])
        .sort({ scheduledAt: -1 });

      res.status(200).json({ interviews: list });
    } catch (error) {
      next(error);
    }
  }

  async getLiveInterviewRoom(req, res, next) {
    try {
      const access = await liveInterviewService.assertRoomAccess(req.params.roomId, req.user, 'view');
      res.status(200).json({
        success: true,
        ...liveInterviewService.buildRoomPayload(access.room, access.role)
      });
    } catch (error) {
      next(error);
    }
  }

  async saveLiveNotepad(req, res, next) {
    try {
      const roomId = String(req.params.roomId || '');
      console.log('Searching roomId:', roomId);
      const room = await LiveInterview.findOne({ roomId });
      if (!room) {
        throw new ApiError(404, 'Live Room session not found');
      }

      room.notepadContent = req.body.notepadContent ?? room.notepadContent;
      room.recruiterNotes = req.body.recruiterNotes ?? room.recruiterNotes;
      await room.save();

      res.status(200).json({ success: true, room });
    } catch (error) {
      next(error);
    }
  }

  async evaluateLiveInterview(req, res, next) {
    try {
      const { technicalScore, communicationScore, feedback } = req.body;
      const roomId = String(req.params.roomId || '');
      console.log('Searching roomId:', roomId);
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
      const CandidateProfile = require('../models/CandidateProfile');
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
      next(error);
    }
  }
}

module.exports = new RecruiterAdvancedController();
