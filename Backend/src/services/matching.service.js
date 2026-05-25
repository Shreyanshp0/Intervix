const InterviewSession = require('../models/InterviewSession');

const EXPERIENCE_ORDER = ['intern', 'junior', 'mid', 'senior', 'lead', 'executive'];
const WEIGHTS = {
  skillOverlap: 0.35,
  verifiedSkills: 0.15,
  interviewPerformance: 0.15,
  resumeAnalysis: 0.1,
  experienceLevel: 0.15,
  projectRelevance: 0.1
};

class MatchingService {
  normalizeSkills(skills = []) {
    return [...new Set(
      skills
        .filter((skill) => typeof skill === 'string')
        .map((skill) => skill.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter(Boolean)
    )];
  }

  mapExperienceLevel(level = '') {
    const normalized = String(level).trim().toLowerCase();
    return EXPERIENCE_ORDER.includes(normalized) ? normalized : 'mid';
  }

  computeExperienceYears(profile) {
    const experiences = Array.isArray(profile?.experience) ? profile.experience : [];
    const totalMonths = experiences.reduce((sum, item) => {
      if (!item?.startDate) {
        return sum;
      }

      const start = new Date(item.startDate);
      const end = item.currentlyWorking || !item.endDate ? new Date() : new Date(item.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return sum;
      }

      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return sum + Math.max(months, 1);
    }, 0);

    return Number((totalMonths / 12).toFixed(1));
  }

  getExperienceBandFromYears(years = 0) {
    if (years < 1) return 'intern';
    if (years < 3) return 'junior';
    if (years < 5) return 'mid';
    if (years < 8) return 'senior';
    if (years < 12) return 'lead';
    return 'executive';
  }

  async getInterviewPerformance(profile) {
    if (!profile?.user) {
      return 0;
    }

    const sessions = await InterviewSession.find({
      userId: profile.user,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('score technicalScore communicationScore confidenceScore');

    if (!sessions.length) {
      return 0;
    }

    const aggregate = sessions.reduce((sum, session) => {
      const blended = (
        (session.score || 0) * 0.4 +
        (session.technicalScore || 0) * 0.3 +
        (session.communicationScore || 0) * 0.15 +
        (session.confidenceScore || 0) * 0.15
      );
      return sum + blended;
    }, 0);

    return Math.round(aggregate / sessions.length);
  }

  scoreSkillOverlap(candidateSkills, requiredSkills, preferredSkills) {
    const requiredMatched = requiredSkills.filter((skill) => candidateSkills.includes(skill));
    const preferredMatched = preferredSkills.filter((skill) => candidateSkills.includes(skill));

    const requiredScore = requiredSkills.length
      ? (requiredMatched.length / requiredSkills.length) * 100
      : 100;
    const preferredScore = preferredSkills.length
      ? (preferredMatched.length / preferredSkills.length) * 100
      : 100;

    return Math.round((requiredScore * 0.75) + (preferredScore * 0.25));
  }

  scoreVerifiedSkills(verifiedSkills, requiredSkills, preferredSkills) {
    const target = [...new Set([...requiredSkills, ...preferredSkills])];
    if (!target.length) {
      return verifiedSkills.length ? 100 : 70;
    }
    const verifiedMatches = target.filter((skill) => verifiedSkills.includes(skill));
    return Math.round((verifiedMatches.length / target.length) * 100);
  }

  scoreResumeAnalysis(profile, requiredSkills, preferredSkills) {
    const resumePresent = profile?.resume ? 40 : 0;
    const aboutMePresent = profile?.aboutMe ? 20 : 0;
    const preferredRoles = Array.isArray(profile?.preferredRoles) ? profile.preferredRoles.join(' ').toLowerCase() : '';
    const roleAlignment = requiredSkills.concat(preferredSkills).some((skill) => preferredRoles.includes(skill)) ? 20 : 0;
    const completenessBonus = Math.min(profile?.completionScore || 0, 20);

    return Math.min(100, resumePresent + aboutMePresent + roleAlignment + completenessBonus);
  }

  scoreExperienceLevel(profile, targetLevel) {
    const candidateYears = this.computeExperienceYears(profile);
    const candidateBand = this.getExperienceBandFromYears(candidateYears);
    const targetIndex = EXPERIENCE_ORDER.indexOf(this.mapExperienceLevel(targetLevel));
    const candidateIndex = EXPERIENCE_ORDER.indexOf(candidateBand);

    const distance = Math.abs(targetIndex - candidateIndex);
    if (distance === 0) return 100;
    if (distance === 1) return 75;
    if (distance === 2) return 45;
    return 20;
  }

  scoreProjectRelevance(profile, targetSkills) {
    const projects = Array.isArray(profile?.projects) ? profile.projects : [];
    if (!projects.length || !targetSkills.length) {
      return 0;
    }

    const hitCount = projects.reduce((score, project) => {
      const technologies = this.normalizeSkills(project?.technologies || []);
      const overlap = targetSkills.filter((skill) => technologies.includes(skill)).length;
      return score + overlap;
    }, 0);

    return Math.min(100, Math.round((hitCount / targetSkills.length) * 100));
  }

  createBand(score) {
    if (score >= 80) return 'high';
    if (score >= 55) return 'moderate';
    return 'low';
  }

  async calculateMatchScore(profile, job) {
    const candidateSkills = this.normalizeSkills(profile?.skills?.normalized || profile?.skills?.raw || []);
    const verifiedSkills = this.normalizeSkills(profile?.skills?.verified || []);
    const requiredSkills = this.normalizeSkills(job?.requiredSkills?.normalized || job?.requiredSkills?.raw || []);
    const preferredSkills = this.normalizeSkills(job?.preferredSkills?.normalized || job?.preferredSkills?.raw || []);
    const combinedSkills = [...new Set([...requiredSkills, ...preferredSkills])];

    const breakdown = {
      skillOverlap: this.scoreSkillOverlap(candidateSkills, requiredSkills, preferredSkills),
      verifiedSkills: this.scoreVerifiedSkills(verifiedSkills, requiredSkills, preferredSkills),
      interviewPerformance: await this.getInterviewPerformance(profile),
      resumeAnalysis: this.scoreResumeAnalysis(profile, requiredSkills, preferredSkills),
      experienceLevel: this.scoreExperienceLevel(profile, job?.experienceLevel),
      projectRelevance: this.scoreProjectRelevance(profile, combinedSkills)
    };

    const score = Math.round(
      Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + ((breakdown[key] || 0) * weight), 0)
    );

    return {
      score,
      band: this.createBand(score),
      breakdown,
      matchedSkills: requiredSkills.filter((skill) => candidateSkills.includes(skill)),
      missingSkills: requiredSkills.filter((skill) => !candidateSkills.includes(skill))
    };
  }

  generateCandidateSummary(profile, job, matchResult) {
    const years = this.computeExperienceYears(profile);
    const verifiedCount = profile?.skills?.verified?.length || 0;
    const matchedSkills = matchResult?.matchedSkills?.slice(0, 5).join(', ') || 'foundational alignment';
    const gaps = matchResult?.missingSkills?.slice(0, 3).join(', ');

    const base = `${profile?.name || 'Candidate'} shows ${matchResult.score}% alignment for ${job?.roleTitle || 'this role'}, with ${years || 0} years of experience and ${verifiedCount} verified skills.`;
    const strengths = `Strongest overlap appears in ${matchedSkills}.`;
    const risks = gaps ? `Primary gaps to review: ${gaps}.` : 'No critical required-skill gaps detected.';

    return `${base} ${strengths} ${risks}`.trim();
  }

  async rankCandidates(candidates, job) {
    const ranked = await Promise.all(
      candidates.map(async (profile) => {
        const matchResult = await this.calculateMatchScore(profile, job);
        return {
          candidate: profile,
          matchScore: matchResult.score,
          matchBand: matchResult.band,
          matchBreakdown: matchResult.breakdown,
          summary: this.generateCandidateSummary(profile, job, matchResult)
        };
      })
    );

    return ranked.sort((left, right) => right.matchScore - left.matchScore);
  }
}

module.exports = new MatchingService();
