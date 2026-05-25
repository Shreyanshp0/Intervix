const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const candidateService = require('../services/candidate.service');
const resumeParserService = require('../services/resume-parser.service');
const ApiError = require('../utils/api-error');
const logger = require('../config/logger');
const { calculateCandidateCompletion, buildSkillPayload } = require('../utils/profile.utils');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getCandidateProfile = async (req) => {
  return candidateService.getOrCreateCandidateProfile(req.user._id);
};

const getResumeForProfile = async (profile) => {
  if (!profile?._id) {
    return null;
  }

  return Resume.findOne({ candidateProfile: profile._id });
};

const getResumeForUser = async (req, resumeId = null) => {
  const profile = await getCandidateProfile(req);

  if (resumeId) {
    if (!isValidObjectId(resumeId)) {
      return null;
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return null;
    }

    if (req.user.role === 'candidate' && String(resume.candidateProfile) !== String(profile._id)) {
      throw new ApiError(403, 'You cannot access this resume');
    }

    return resume;
  }

  return getResumeForProfile(profile);
};

const buildResumePayload = (resume = null) => {
  if (!resume) {
    return {
      success: true,
      hasResume: false,
      onboardingRequired: true,
      resume: null
    };
  }

  return {
    success: true,
    hasResume: true,
    onboardingRequired: false,
    resume
  };
};

const resumeController = {
  async uploadResume(req, res, next) {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No resume file uploaded');
      }

      const profile = await getCandidateProfile(req);
      let resume = await getResumeForProfile(profile);

      if (resume?.storageKey && fs.existsSync(resume.storageKey)) {
        try {
          fs.unlinkSync(resume.storageKey);
        } catch (err) {
          logger.warn({ tag: 'ResumeFallback', message: `Failed to delete old resume file: ${err.message}` });
        }
      }

      const rawText = await resumeParserService.extractResumeText(req.file.path, req.file.mimetype);
      const parsed = await resumeParserService.parseResumeContent(rawText);
      const fileUrl = `/uploads/resumes/${req.file.filename}`;

      const resumeData = {
        user: req.user._id,
        candidateProfile: profile._id,
        fileName: req.file.originalname,
        storageKey: req.file.path,
        fileUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedAt: new Date(),
        rawText,
        aiAnalysis: {
          recruiterSummary: parsed.recruiterSummary || '',
          resumeQualityScore: parsed.resumeQualityScore || 0,
          atsScore: parsed.atsScore || 0,
          skillConfidence: parsed.skillConfidence || 0,
          strengths: parsed.strengths || [],
          weakAreas: parsed.weakAreas || [],
          certifications: parsed.certifications || []
        }
      };

      if (!resume) {
        resume = await Resume.create(resumeData);
      } else {
        Object.assign(resume, resumeData);
        await resume.save();
      }

      if (parsed.skills && parsed.skills.length > 0) {
        const currentSkills = profile.skills?.raw || [];
        const uniqueRawSkills = [...new Set([...currentSkills, ...parsed.skills])];
        profile.skills = buildSkillPayload(uniqueRawSkills);
      }

      if (parsed.experience && parsed.experience.length > 0) {
        profile.experience = parsed.experience.map((exp) => ({
          company: exp.company || '',
          title: exp.title || '',
          employmentType: exp.employmentType || 'full-time',
          location: exp.location || '',
          startDate: exp.startDate ? new Date(exp.startDate) : null,
          endDate: exp.endDate ? new Date(exp.endDate) : null,
          currentlyWorking: exp.currentlyWorking || false,
          description: exp.description || '',
          highlights: exp.highlights || []
        }));
      }

      if (parsed.education && parsed.education.length > 0) {
        profile.education = parsed.education.map((edu) => ({
          institution: edu.institution || '',
          degree: edu.degree || '',
          fieldOfStudy: edu.fieldOfStudy || '',
          startDate: edu.startDate ? new Date(edu.startDate) : null,
          endDate: edu.endDate ? new Date(edu.endDate) : null,
          grade: edu.grade || '',
          description: edu.description || ''
        }));
      }

      if (parsed.projects && parsed.projects.length > 0) {
        profile.projects = parsed.projects.map((proj) => ({
          name: proj.name || '',
          role: proj.role || '',
          description: proj.description || '',
          technologies: proj.technologies || [],
          projectUrl: proj.projectUrl || '',
          repositoryUrl: proj.repositoryUrl || '',
          startDate: proj.startDate ? new Date(proj.startDate) : null,
          endDate: proj.endDate ? new Date(proj.endDate) : null
        }));
      }

      profile.resume = resume._id;
      profile.completionScore = calculateCandidateCompletion(profile);
      profile.lastProfileUpdateAt = new Date();
      await profile.save();

      logger.info({
        tag: 'ResumeAPI',
        message: `Resume uploaded for user ${req.user._id}`,
        resumeId: resume._id
      });

      res.status(201).json({
        success: true,
        message: 'Resume uploaded and AI analyzed successfully',
        hasResume: true,
        onboardingRequired: false,
        resume,
        profile
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          logger.warn({ tag: 'ResumeFallback', message: `Failed to cleanup failed upload: ${err.message}` });
        }
      }

      next(error);
    }
  },

  async deleteResume(req, res, next) {
    try {
      const profile = await getCandidateProfile(req);
      const resume = await getResumeForProfile(profile);

      if (!resume) {
        logger.info({
          tag: 'ResumeFallback',
          message: `No resume found for user ${req.user._id} -> returning onboarding-safe delete response`
        });
        return res.status(200).json({
          success: true,
          hasResume: false,
          onboardingRequired: true,
          resume: null,
          message: 'No resume found to delete'
        });
      }

      if (resume.storageKey && fs.existsSync(resume.storageKey)) {
        try {
          fs.unlinkSync(resume.storageKey);
        } catch (err) {
          logger.warn({ tag: 'ResumeFallback', message: `Failed to delete resume file: ${err.message}` });
        }
      }

      await Resume.deleteOne({ _id: resume._id });

      profile.resume = null;
      profile.completionScore = calculateCandidateCompletion(profile);
      profile.lastProfileUpdateAt = new Date();
      await profile.save();

      res.status(200).json({
        success: true,
        hasResume: false,
        onboardingRequired: true,
        resume: null,
        message: 'Resume deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyResume(req, res, next) {
    try {
      const resume = await getResumeForUser(req);

      if (!resume) {
        logger.info({
          tag: 'ResumeAPI',
          message: `No resume found for user ${req.user._id} -> returning onboarding state`
        });
        return res.status(200).json(buildResumePayload(null));
      }

      res.status(200).json(buildResumePayload(resume));
    } catch (error) {
      next(error);
    }
  },

  async getMyResumeAnalysis(req, res, next) {
    try {
      const resume = await getResumeForUser(req);

      if (!resume) {
        return res.status(200).json({
          success: true,
          hasResume: false,
          onboardingRequired: true,
          resume: null,
          aiAnalysis: null,
          rawText: ''
        });
      }

      res.status(200).json({
        success: true,
        hasResume: true,
        onboardingRequired: false,
        resumeId: resume._id,
        aiAnalysis: resume.aiAnalysis || null,
        rawText: resume.rawText || ''
      });
    } catch (error) {
      next(error);
    }
  },

  async downloadMyResume(req, res, next) {
    return previewResume(req, res, next);
  },

  async getResumeById(req, res, next) {
    try {
      const resume = await getResumeForUser(req, req.params.resumeId);
      if (!resume) {
        return res.status(404).json({ success: false, message: 'Resume not found' });
      }

      res.status(200).json(buildResumePayload(resume));
    } catch (error) {
      next(error);
    }
  },

  async getResumeAnalysisById(req, res, next) {
    try {
      const resume = await getResumeForUser(req, req.params.resumeId);
      if (!resume) {
        return res.status(404).json({ success: false, message: 'Resume not found' });
      }

      res.status(200).json({
        success: true,
        hasResume: true,
        onboardingRequired: false,
        resumeId: resume._id,
        aiAnalysis: resume.aiAnalysis || null,
        rawText: resume.rawText || ''
      });
    } catch (error) {
      next(error);
    }
  },

  async downloadResumeById(req, res, next) {
    return previewResume(req, res, next);
  },
};

async function previewResume(req, res, next) {
  try {
    const resume = req.params.resumeId
      ? await getResumeForUser(req, req.params.resumeId)
      : await getResumeForUser(req);

    if (!resume) {
      return res.status(404).json({
        success: false,
        hasResume: false,
        onboardingRequired: true,
        resume: null,
        message: 'Resume not found'
      });
    }

    if (!resume.storageKey || !fs.existsSync(resume.storageKey)) {
      logger.warn({
        tag: 'ResumeFallback',
        message: `Resume file missing or corrupted for user ${req.user._id} / resume ${resume._id}`
      });
      return res.status(200).json({
        success: true,
        hasResume: false,
        onboardingRequired: true,
        resume: null,
        message: 'Resume file not available'
      });
    }

    res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.fileName}"`);
    res.sendFile(path.resolve(resume.storageKey));
  } catch (error) {
    next(error);
  }
}

module.exports = resumeController;
