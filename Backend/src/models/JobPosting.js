import mongoose from 'mongoose';

const skillSetSchema = new mongoose.Schema({
  raw: [{ type: String, trim: true }],
  normalized: [{ type: String, trim: true, lowercase: true }]
}, { _id: false });

const salaryRangeSchema = new mongoose.Schema({
  min: { type: Number, min: 0, default: 0 },
  max: { type: Number, min: 0, default: 0 },
  currency: { type: String, trim: true, default: 'USD' },
  period: { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' }
}, { _id: false });

const jobPostingSchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruiterProfile',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  roleTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 6000
  },
  requiredSkills: {
    type: skillSetSchema,
    default: () => ({ raw: [], normalized: [] })
  },
  preferredSkills: {
    type: skillSetSchema,
    default: () => ({ raw: [], normalized: [] })
  },
  experienceLevel: {
    type: String,
    enum: ['intern', 'junior', 'mid', 'senior', 'lead', 'executive'],
    required: true,
    index: true
  },
  salaryRange: {
    type: salaryRangeSchema,
    default: () => ({ min: 0, max: 0, currency: 'USD', period: 'yearly' })
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  responsibilities: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  qualifications: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  hiringStatus: {
    type: String,
    enum: ['draft', 'open', 'on-hold', 'closed', 'filled'],
    default: 'draft',
    index: true
  },
  interviewDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  interviewStyle: {
    type: String,
    enum: ['technical', 'behavioral', 'case-study', 'system-design', 'mixed'],
    default: 'mixed'
  },
  searchText: {
    type: String,
    default: '',
    select: false
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

jobPostingSchema.index({
  roleTitle: 'text',
  description: 'text',
  location: 'text',
  searchText: 'text'
});
jobPostingSchema.index({ company: 1, hiringStatus: 1, createdAt: -1 });
jobPostingSchema.index({ 'requiredSkills.normalized': 1, experienceLevel: 1, hiringStatus: 1 });

export default mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema);
