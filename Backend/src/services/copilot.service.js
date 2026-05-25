const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const JobPosting = require('../models/JobPosting');
const groqService = require('../ai/groq.service');
const ApiError = require('../utils/api-error');

class CopilotService {
  async queryCopilot(query, userId) {
    if (!query || !query.trim()) {
      throw new ApiError(400, 'Query cannot be empty');
    }

    const recruiter = await RecruiterProfile.findOne({ user: userId });
    if (!recruiter) {
      throw new ApiError(404, 'Recruiter profile not found');
    }

    // Load candidates with populated resumes
    const [candidates, jobs] = await Promise.all([
      CandidateProfile.find({}).populate('resume').lean(),
      JobPosting.find({ company: recruiter.company, archivedAt: null }).lean()
    ]);

    const candidatesContext = candidates.map(c => {
      let verifiedMap = {};
      if (c.verifiedSkills) {
        if (c.verifiedSkills instanceof Map) {
          verifiedMap = Object.fromEntries(c.verifiedSkills);
        } else {
          verifiedMap = c.verifiedSkills;
        }
      }

      return {
        id: String(c._id),
        name: c.name,
        location: c.location || 'N/A',
        skills: c.skills?.raw || [],
        verifiedSkills: verifiedMap,
        resumeSummary: c.resume?.aiAnalysis?.recruiterSummary || 'No resume uploaded',
        atsScore: c.resume?.aiAnalysis?.atsScore || 0,
        qualityScore: c.resume?.aiAnalysis?.resumeQualityScore || 0,
        experienceCount: c.experience?.length || 0,
        projectsCount: c.projects?.length || 0
      };
    });

    const jobsContext = jobs.map(j => ({
      id: String(j._id),
      roleTitle: j.roleTitle,
      requiredSkills: j.requiredSkills?.raw || [],
      preferredSkills: j.preferredSkills?.raw || [],
      experienceLevel: j.experienceLevel
    }));

    const systemPrompt = [
      'You are an elite AI Recruiter Copilot for the Intervix platform.',
      'Your job is to answer recruiters questions, rank candidates based on their requirements, explain fit metrics, and suggest best matches.',
      'Analyse the provided Candidate Database context and Active Jobs list.',
      'Always respond in a professional, recruiter-appropriate tone.',
      'Use GitHub Flavored Markdown (bulleted lists, bold highlights, comparison tables) to make your response extremely readable and easy to scan.',
      'Whenever mentioning a candidate, reference their name and list their key matching credentials.',
      'Do not invent candidates; only use candidates from the provided list.',
    ].join(' ');

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          `Recruiter Query: "${query}"`,
          '',
          `Active Job Openings:\n${JSON.stringify(jobsContext)}`,
          '',
          `Candidate Database Context:\n${JSON.stringify(candidatesContext)}`
        ].join('\n'),
      }
    ];

    try {
      const explanation = await groqService.generateWithFallback({
        task: 'recruiter-copilot',
        messages,
        options: {
          temperature: 0.3,
          maxCompletionTokens: 2000,
        }
      });

      return {
        query,
        explanation
      };
    } catch (error) {
      throw new ApiError(502, `AI Copilot analysis failed: ${error.message}`);
    }
  }
}

module.exports = new CopilotService();
