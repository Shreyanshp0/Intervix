const { z } = require('zod');
const ApiError = require('../utils/api-error');

const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(new ApiError(400, error.issues?.[0]?.message || 'Invalid request payload'));
  }
};

const difficultySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.toLowerCase();
}, z.enum(['easy', 'medium', 'hard']));

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(['candidate', 'recruiter'])
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required")
});

const startSessionSchema = z.object({
  mode: z.enum(['text', 'voice']),
  topic: z.string().min(2, "Topic is required"),
  difficulty: difficultySchema.optional(),
  experienceLevel: z.string().min(1).optional(),
  interviewType: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
  duration: z.union([z.literal(10), z.literal(15), z.literal(30)]).optional(),
});

const interviewResponseSchema = z.object({
  answer: z.string().min(1, "Answer is required")
});

const candidateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  profilePhoto: z.string().optional(),
  location: z.string().optional(),
  aboutMe: z.string().optional(),
  skills: z.object({
    raw: z.array(z.string()).optional(),
    normalized: z.array(z.string()).optional(),
    verified: z.array(z.string()).optional()
  }).optional(),
  education: z.array(z.object({
    institution: z.string().optional(),
    degree: z.string().optional(),
    fieldOfStudy: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    grade: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  experience: z.array(z.object({
    company: z.string().optional(),
    title: z.string().optional(),
    employmentType: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    currentlyWorking: z.boolean().optional(),
    description: z.string().optional(),
    highlights: z.array(z.string()).optional()
  })).optional(),
  projects: z.array(z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    description: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    projectUrl: z.string().optional(),
    repositoryUrl: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })).optional(),
  github: z.string().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),
  preferredRoles: z.array(z.string()).optional(),
  resume: z.object({
    fileName: z.string(),
    storageKey: z.string().optional(),
    fileUrl: z.string().optional(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional()
  }).optional()
});

const recruiterProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  workEmail: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  profilePhoto: z.string().optional(),
  bio: z.string().optional(),
  socialLinks: z.object({
    linkedin: z.string().optional(),
    twitter: z.string().optional()
  }).optional()
});

const companyProfileSchema = z.object({
  name: z.string().min(2).optional(),
  logo: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  recruiterDetails: z.object({
    recruiterName: z.string().optional(),
    recruiterTitle: z.string().optional(),
    recruiterEmail: z.string().email().optional(),
    recruiterPhone: z.string().optional()
  }).optional(),
  socialLinks: z.object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional()
  }).optional()
});

const experienceLevelSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.toLowerCase();
}, z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'executive']));

const hiringStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.toLowerCase();
}, z.enum(['draft', 'open', 'on-hold', 'closed', 'filled']));

const interviewStyleSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.toLowerCase();
}, z.enum(['technical', 'behavioral', 'case-study', 'system-design', 'mixed']));

const jobPostingSchema = z.object({
  roleTitle: z.string().min(2),
  description: z.string().min(20),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  experienceLevel: experienceLevelSchema,
  salaryRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().min(3).max(8).default('USD'),
    period: z.enum(['hourly', 'monthly', 'yearly']).default('yearly')
  }),
  location: z.string().min(2),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  hiringStatus: hiringStatusSchema.default('draft'),
  interviewDifficulty: difficultySchema.default('medium'),
  interviewStyle: interviewStyleSchema.default('mixed')
}).refine((payload) => payload.salaryRange.max >= payload.salaryRange.min, {
  message: 'Salary max must be greater than or equal to salary min',
  path: ['salaryRange', 'max']
});

const applicationSchema = z.object({
  coverLetter: z.string().max(4000).optional().default('')
});

const applicationStageSchema = z.object({
  stage: z.enum(['Applied', 'Shortlisted', 'Interview Scheduled', 'Passed', 'Rejected', 'Hired']),
  note: z.string().max(500).optional()
});

const interviewScheduleSchema = z.object({
  scheduledFor: z.string().datetime(),
  timezone: z.string().min(2),
  mode: z.enum(['phone', 'video', 'onsite', 'take-home', 'async']),
  meetingLink: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const recruiterFeedbackSchema = z.object({
  message: z.string().min(1).max(2000),
  visibility: z.enum(['candidate', 'internal']).default('candidate')
});

module.exports = {
  validateRegister: validateRequest(registerSchema),
  validateLogin: validateRequest(loginSchema),
  validateStartSession: validateRequest(startSessionSchema),
  validateInterviewResponse: validateRequest(interviewResponseSchema),
  validateCandidateProfile: validateRequest(candidateProfileSchema),
  validateRecruiterProfile: validateRequest(recruiterProfileSchema),
  validateCompanyProfile: validateRequest(companyProfileSchema),
  validateJobPosting: validateRequest(jobPostingSchema),
  validateApplication: validateRequest(applicationSchema),
  validateApplicationStageUpdate: validateRequest(applicationStageSchema),
  validateInterviewSchedule: validateRequest(interviewScheduleSchema),
  validateRecruiterFeedback: validateRequest(recruiterFeedbackSchema)
};
