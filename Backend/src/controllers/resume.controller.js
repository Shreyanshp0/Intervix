const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const CandidateProfile = require('../models/CandidateProfile');
const resumeParserService = require('../services/resume-parser.service');
const ApiError = require('../utils/api-error');
const { calculateCandidateCompletion, buildSkillPayload } = require('../utils/profile.utils');

class ResumeController {
  async getCandidateProfile(req) {
    const profile = await CandidateProfile.findOne({ user: req.user._id });
    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }
    return profile;
  }

  async getResumeForRequest(req) {
    if (req.params.resumeId) {
      const resume = await Resume.findById(req.params.resumeId);
      if (!resume) {
        throw new ApiError(404, 'Resume not found');
      }

      if (req.user.role === 'candidate') {
        const profile = await this.getCandidateProfile(req);
        if (String(resume.candidateProfile) !== String(profile._id) && req.user.role !== 'admin') {
          throw new ApiError(403, 'You cannot access this resume');
        }
      }

      return resume;
    }

    const profile = await this.getCandidateProfile(req);
    const resume = await Resume.findOne({ candidateProfile: profile._id });
    if (!resume) {
      throw new ApiError(404, 'Resume not found');
    }
    return resume;
  }

  async uploadResume(req, res, next) {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No resume file uploaded');
      }

      const profile = await CandidateProfile.findOne({ user: req.user._id });
      if (!profile) {
        // Clean up file if profile not found
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        throw new ApiError(404, 'Candidate profile not found');
      }

      // Check if candidate already has a resume
      let resume = await Resume.findOne({ candidateProfile: profile._id });
      if (resume) {
        // Clean up old file
        if (resume.storageKey && fs.existsSync(resume.storageKey)) {
          try {
            fs.unlinkSync(resume.storageKey);
          } catch (err) {
            console.error('Failed to delete old resume file:', err);
          }
        }
      }

      // Extract text from the new file
      const rawText = await resumeParserService.extractResumeText(req.file.path, req.file.mimetype);

      // Perform AI Analysis on the extracted text
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

      // Auto-populate CandidateProfile with AI parsed values
      if (parsed.skills && parsed.skills.length > 0) {
        const currentSkills = profile.skills?.raw || [];
        const uniqueRawSkills = [...new Set([...currentSkills, ...parsed.skills])];
        profile.skills = buildSkillPayload(uniqueRawSkills);
      }

      if (parsed.experience && parsed.experience.length > 0) {
        profile.experience = parsed.experience.map(exp => ({
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
        profile.education = parsed.education.map(edu => ({
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
        profile.projects = parsed.projects.map(proj => ({
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

      res.status(201).json({
        message: 'Resume uploaded and AI analyzed successfully',
        resume,
        profile
      });
    } catch (error) {
      // Cleanup uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to cleanup failed upload:', err);
        }
      }
      next(error);
    }
  }

  async deleteResume(req, res, next) {
    try {
      const profile = await this.getCandidateProfile(req);

      const resume = await Resume.findOne({ candidateProfile: profile._id });
      if (!resume) {
        throw new ApiError(404, 'No resume found to delete');
      }

      // Delete physical file
      if (resume.storageKey && fs.existsSync(resume.storageKey)) {
        try {
          fs.unlinkSync(resume.storageKey);
        } catch (err) {
          console.error('Failed to delete resume file:', err);
        }
      }

      await Resume.deleteOne({ _id: resume._id });

      profile.resume = null;
      profile.completionScore = calculateCandidateCompletion(profile);
      profile.lastProfileUpdateAt = new Date();
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Resume deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyResume(req, res, next) {
    try {
      const resume = await this.getResumeForRequest(req);
      res.status(200).json({ resume });
    } catch (error) {
      next(error);
    }
  }

  async getMyResumeAnalysis(req, res, next) {
    try {
      const resume = await this.getResumeForRequest(req);
      res.status(200).json({ resumeId: resume._id, aiAnalysis: resume.aiAnalysis, rawText: resume.rawText });
    } catch (error) {
      next(error);
    }
  }

  async downloadMyResume(req, res, next) {
    return this.previewResume(req, res, next);
  }

  async getResumeById(req, res, next) {
    try {
      const resume = await this.getResumeForRequest(req);
      res.status(200).json({ resume });
    } catch (error) {
      next(error);
    }
  }

  async getResumeAnalysisById(req, res, next) {
    try {
      const resume = await this.getResumeForRequest(req);
      res.status(200).json({ resumeId: resume._id, aiAnalysis: resume.aiAnalysis, rawText: resume.rawText });
    } catch (error) {
      next(error);
    }
  }

  async downloadResumeById(req, res, next) {
    return this.previewResume(req, res, next);
  }

  async previewResume(req, res, next) {
    try {
      const resume = await this.getResumeForRequest(req);

      if (!fs.existsSync(resume.storageKey)) {
        throw new ApiError(404, 'Resume file not found on disk');
      }

      res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${resume.fileName}"`);
      res.sendFile(path.resolve(resume.storageKey));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ResumeController();
