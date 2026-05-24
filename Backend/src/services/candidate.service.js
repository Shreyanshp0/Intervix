const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const ApiError = require('../utils/api-error');
const { buildSkillPayload, calculateCandidateCompletion, uniqueStrings } = require('../utils/profile.utils');

const candidatePopulate = [
  { path: 'resume', select: 'fileName fileUrl mimeType fileSize uploadedAt' }
];

class CandidateService {
  async getProfileByUserId(userId) {
    const profile = await CandidateProfile.findOne({ user: userId }).populate(candidatePopulate);
    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }
    return profile;
  }

  async upsertProfile(user, payload) {
    const profile = await CandidateProfile.findOne({ user: user._id });
    if (!profile) {
      throw new ApiError(404, 'Candidate profile not found');
    }

    profile.name = payload.name ?? profile.name;
    profile.email = payload.email ?? profile.email;
    profile.phone = payload.phone ?? profile.phone;
    profile.profilePhoto = payload.profilePhoto ?? profile.profilePhoto;
    profile.location = payload.location ?? profile.location;
    profile.aboutMe = payload.aboutMe ?? profile.aboutMe;
    profile.skills = payload.skills ? buildSkillPayload(payload.skills) : profile.skills;
    profile.education = payload.education ?? profile.education;
    profile.experience = payload.experience ?? profile.experience;
    profile.projects = payload.projects ?? profile.projects;
    profile.github = payload.github ?? profile.github;
    profile.linkedin = payload.linkedin ?? profile.linkedin;
    profile.portfolio = payload.portfolio ?? profile.portfolio;
    profile.preferredRoles = payload.preferredRoles ? uniqueStrings(payload.preferredRoles) : profile.preferredRoles;

    if (payload.resume) {
      let resume = await Resume.findOne({ candidateProfile: profile._id });
      if (!resume) {
        resume = await Resume.create({
          user: user._id,
          candidateProfile: profile._id,
          ...payload.resume
        });
      } else {
        Object.assign(resume, payload.resume);
        await resume.save();
      }
      profile.resume = resume._id;
    }

    profile.completionScore = calculateCandidateCompletion(profile);
    profile.lastProfileUpdateAt = new Date();

    await profile.save();

    if ((payload.name && payload.name !== user.name) || (payload.email && payload.email !== user.email)) {
      user.name = payload.name ?? user.name;
      user.email = payload.email ?? user.email;
    }
    user.onboardingCompleted = true;
    await user.save();

    return this.getProfileByUserId(user._id);
  }
}

module.exports = new CandidateService();
