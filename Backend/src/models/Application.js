import mongoose from 'mongoose';

const stageHistorySchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['Applied', 'Shortlisted', 'Interview Scheduled', 'Passed', 'Rejected', 'Hired'],
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true });

const interviewScheduleSchema = new mongoose.Schema({
  scheduledFor: { type: Date, default: null },
  timezone: { type: String, trim: true, default: '' },
  mode: {
    type: String,
    enum: ['phone', 'video', 'onsite', 'take-home', 'async'],
    default: 'video'
  },
  roomId: { type: String, trim: true, default: '' },
  meetingLink: { type: String, trim: true, default: '' },
  sessionToken: { type: String, trim: true, default: '' },
  sessionUrl: { type: String, trim: true, default: '' },
  sessionTokenExpiresAt: { type: Date, default: null },
  notes: { type: String, trim: true, default: '' }
}, { _id: false });

const feedbackEntrySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  visibility: {
    type: String,
    enum: ['candidate', 'internal'],
    default: 'candidate'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPosting',
    required: true,
    index: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CandidateProfile',
    required: true,
    index: true
  },
  candidateUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
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
  stage: {
    type: String,
    enum: ['Applied', 'Shortlisted', 'Interview Scheduled', 'Passed', 'Rejected', 'Hired'],
    default: 'Applied',
    index: true
  },
  coverLetter: {
    type: String,
    trim: true,
    maxlength: 4000,
    default: ''
  },
  recruiterFeedback: {
    type: [feedbackEntrySchema],
    default: []
  },
  interviewSchedule: {
    type: interviewScheduleSchema,
    default: () => ({})
  },
  matchSnapshot: {
    score: { type: Number, min: 0, max: 100, default: 0 },
    band: { type: String, enum: ['high', 'moderate', 'low'], default: 'low' },
    breakdown: {
      skillOverlap: { type: Number, min: 0, max: 100, default: 0 },
      verifiedSkills: { type: Number, min: 0, max: 100, default: 0 },
      interviewPerformance: { type: Number, min: 0, max: 100, default: 0 },
      resumeAnalysis: { type: Number, min: 0, max: 100, default: 0 },
      experienceLevel: { type: Number, min: 0, max: 100, default: 0 },
      projectRelevance: { type: Number, min: 0, max: 100, default: 0 }
    },
    summary: { type: String, trim: true, default: '' }
  },
  stageHistory: {
    type: [stageHistorySchema],
    default: []
  }
}, { timestamps: true });

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ recruiter: 1, stage: 1, updatedAt: -1 });
applicationSchema.index({ candidateUser: 1, updatedAt: -1 });

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);
