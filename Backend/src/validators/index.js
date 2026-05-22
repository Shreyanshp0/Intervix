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
  role: z.enum(['candidate', 'recruiter', 'admin']).optional()
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

module.exports = {
  validateRegister: validateRequest(registerSchema),
  validateLogin: validateRequest(loginSchema),
  validateStartSession: validateRequest(startSessionSchema),
  validateInterviewResponse: validateRequest(interviewResponseSchema)
};
