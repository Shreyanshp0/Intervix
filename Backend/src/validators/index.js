import { z } from 'zod';
import ApiError from '../utils/api-error.js';

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
  phone: z.string().optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  aboutMe: z.string().optional().nullable(),
  skills: z.object({
    raw: z.array(z.string()).optional(),
    normalized: z.array(z.string()).optional(),
    verified: z.array(z.string()).optional()
  }).optional().nullable(),
  education: z.array(z.object({
    institution: z.string().optional().nullable(),
    degree: z.string().optional().nullable(),
    fieldOfStudy: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    grade: z.string().optional().nullable(),
    description: z.string().optional().nullable()
  })).optional().nullable(),
  experience: z.array(z.object({
    company: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    employmentType: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    currentlyWorking: z.boolean().optional().nullable(),
    description: z.string().optional().nullable(),
    highlights: z.array(z.string()).optional().nullable()
  })).optional().nullable(),
  projects: z.array(z.object({
    name: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    technologies: z.array(z.string()).optional().nullable(),
    projectUrl: z.string().optional().nullable(),
    repositoryUrl: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable()
  })).optional().nullable(),
  github: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  portfolio: z.string().optional().nullable(),
  preferredRoles: z.array(z.string()).optional().nullable(),
  resume: z.object({
    fileName: z.string().optional().nullable(),
    storageKey: z.string().optional().nullable(),
    fileUrl: z.string().optional().nullable(),
    mimeType: z.string().optional().nullable(),
    fileSize: z.number().optional().nullable()
  }).optional().nullable()
});

const recruiterProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  workEmail: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  socialLinks: z.object({
    linkedin: z.string().optional().nullable(),
    twitter: z.string().optional().nullable()
  }).optional().nullable()
});

const companyProfileSchema = z.object({
  name: z.string().min(2).optional(),
  logo: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  recruiterDetails: z.object({
    recruiterName: z.string().optional().nullable(),
    recruiterTitle: z.string().optional().nullable(),
    recruiterEmail: z.string().email().optional().nullable(),
    recruiterPhone: z.string().optional().nullable()
  }).optional().nullable(),
  socialLinks: z.object({
    linkedin: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    instagram: z.string().optional().nullable()
  }).optional().nullable()
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
  scheduledFor: z.string().min(1, 'scheduledFor is required').refine((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }, { message: 'Invalid ISO datetime' }),
  timezone: z.string().min(2),
  mode: z.enum(['phone', 'video', 'onsite', 'take-home', 'async']),
  meetingLink: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const recruiterFeedbackSchema = z.object({
  message: z.string().min(1).max(2000),
  visibility: z.enum(['candidate', 'internal']).default('candidate')
});

const validateRegister = validateRequest(registerSchema);
const validateLogin = validateRequest(loginSchema);
const validateStartSession = validateRequest(startSessionSchema);
const validateInterviewResponse = validateRequest(interviewResponseSchema);
const validateCandidateProfile = validateRequest(candidateProfileSchema);
const validateRecruiterProfile = validateRequest(recruiterProfileSchema);
const validateCompanyProfile = validateRequest(companyProfileSchema);
const validateJobPosting = validateRequest(jobPostingSchema);
const validateApplication = validateRequest(applicationSchema);
const validateApplicationStageUpdate = validateRequest(applicationStageSchema);
const validateInterviewSchedule = validateRequest(interviewScheduleSchema);
const validateRecruiterFeedback = validateRequest(recruiterFeedbackSchema);

export {
  validateRequest,
  validateRegister,
  validateLogin,
  validateStartSession,
  validateInterviewResponse,
  validateCandidateProfile,
  validateRecruiterProfile,
  validateCompanyProfile,
  validateJobPosting,
  validateApplication,
  validateApplicationStageUpdate,
  validateInterviewSchedule,
  validateRecruiterFeedback
};
