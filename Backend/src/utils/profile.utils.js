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

module.exports = {
  buildSkillPayload,
  calculateCandidateCompletion,
  uniqueStrings
};
