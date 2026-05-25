const CandidateProfile = require('../models/CandidateProfile');
const JobPosting = require('../models/JobPosting');
const InterviewSession = require('../models/InterviewSession');
const ApiError = require('../utils/api-error');

class InterviewPlannerService {
  async generateTailoredPlan(userId, jobId) {
    const [profile, job] = await Promise.all([
      CandidateProfile.findOne({ user: userId }).populate('resume').lean(),
      JobPosting.findById(jobId).lean()
    ]);

    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }
    if (!job) {
      throw new ApiError(404, 'Job posting not found');
    }

    const requiredSkills = job.requiredSkills?.normalized || [];
    let verifiedSkillsMap = [];
    if (profile.verifiedSkills) {
      if (profile.verifiedSkills instanceof Map) {
        verifiedSkillsMap = [...profile.verifiedSkills.keys()];
      } else {
        verifiedSkillsMap = Object.keys(profile.verifiedSkills);
      }
    }
    
    // Identify unverified required skills
    const unverifiedSkills = requiredSkills.filter(skill => !verifiedSkillsMap.includes(skill));

    // Find candidate projects matching job skills
    const jobSkillsList = [...new Set([...requiredSkills, ...(job.preferredSkills?.normalized || [])])];
    const targetProjects = (profile.projects || [])
      .map(proj => {
        const tech = (proj.technologies || []).map(t => t.toLowerCase());
        const overlap = tech.filter(t => jobSkillsList.includes(t));
        return {
          name: proj.name,
          overlap,
          overlapCount: overlap.length
        };
      })
      .filter(p => p.overlapCount > 0)
      .sort((a, b) => b.overlapCount - a.overlapCount);

    // Fetch past weakness topics
    const pastSessions = await InterviewSession.find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('weaknesses')
      .lean();

    const historicalWeaknesses = [...new Set(pastSessions.flatMap(s => s.weaknesses || []))];

    // Compile into custom AI interview prompt instruction
    let plannerDirective = '';
    if (unverifiedSkills.length > 0) {
      plannerDirective += ` DYNAMIC OBJECTIVE: Focus on verifying the following unverified candidate skills: ${unverifiedSkills.slice(0, 3).join(', ')}.`;
    }
    if (targetProjects.length > 0) {
      plannerDirective += ` PROJECT DEEP-DIVE: Ask detailed questions challenging their technical decisions and architectural choices in their project: '${targetProjects[0].name}', where they used ${targetProjects[0].overlap.join(', ')}.`;
    }
    if (historicalWeaknesses.length > 0) {
      plannerDirective += ` STRENGTHEN GAPS: Check for improvements in previously noted development areas: ${historicalWeaknesses.slice(0, 3).join(', ')}.`;
    }

    return {
      unverifiedSkills,
      matchingProjects: targetProjects.map(p => p.name),
      historicalWeaknesses,
      plannerDirective
    };
  }
}

module.exports = new InterviewPlannerService();
