const normalizeSkill = (skill = '') => skill.trim().toLowerCase().replace(/\s+/g, ' ');

const uniqueStrings = (values = []) => [...new Set(
  values
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
)];

const buildSkillPayload = (skills = {}) => {
  const raw = uniqueStrings(Array.isArray(skills.raw) ? skills.raw : []);
  const normalizedFromRaw = raw.map(normalizeSkill);
  const normalized = uniqueStrings([
    ...normalizedFromRaw,
    ...((Array.isArray(skills.normalized) ? skills.normalized : []).map(normalizeSkill))
  ]);
  const verified = uniqueStrings((Array.isArray(skills.verified) ? skills.verified : []).map(normalizeSkill))
    .filter((skill) => normalized.includes(skill));

  return { raw, normalized, verified };
};

const calculateCandidateCompletion = (profile) => {
  const checkpoints = [
    Boolean(profile.phone),
    Boolean(profile.location),
    Boolean(profile.aboutMe),
    Boolean(profile.skills?.raw?.length),
    Boolean(profile.education?.length),
    Boolean(profile.experience?.length),
    Boolean(profile.projects?.length),
    Boolean(profile.github),
    Boolean(profile.linkedin),
    Boolean(profile.portfolio),
    Boolean(profile.preferredRoles?.length),
    Boolean(profile.resume)
  ];

  const completed = checkpoints.filter(Boolean).length;
  return Math.round((completed / checkpoints.length) * 100);
};

const calculateProfileCompleteness = (profile) => {
  const missingFields = [];
  
  if (!profile.skills?.raw?.length) {
    missingFields.push('Skills');
  }
  if (!profile.aboutMe || !profile.aboutMe.trim()) {
    missingFields.push('About Me');
  }
  if (!profile.resume) {
    missingFields.push('Resume');
  }
  if (!profile.education?.length) {
    missingFields.push('Education');
  }
  if (!profile.preferredRoles?.length) {
    missingFields.push('Preferred Roles');
  }

  const totalChecks = 5;
  const completedChecks = totalChecks - missingFields.length;
  const percentage = Math.round((completedChecks / totalChecks) * 100);

  const hasResume = !!profile.resume;
  const hasSkills = !!profile.skills?.raw?.length;
  const hasAboutMe = !!profile.aboutMe && !!profile.aboutMe.trim();
  const canApply = hasResume && hasSkills && hasAboutMe;

  // structured logging
  console.log(`[ProfileCompleteness] Profile completeness calculated for candidate user ID: ${profile.user}. Percentage: ${percentage}%, missing: [${missingFields.join(', ')}], canApply: ${canApply}`);

  return {
    percentage,
    missingFields,
    canApply
  };
};

module.exports = {
  buildSkillPayload,
  calculateCandidateCompletion,
  calculateProfileCompleteness,
  uniqueStrings
};
