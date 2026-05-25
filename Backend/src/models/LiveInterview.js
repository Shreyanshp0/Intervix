const mongoose = require('mongoose');

const liveInterviewSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
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
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruiterProfile',
    required: true,
    index: true
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  notepadContent: {
    type: String,
    default: ''
  },
  recruiterNotes: {
    type: String,
    default: ''
  },
  evaluation: {
    technicalScore: { type: Number, min: 0, max: 100, default: 0 },
    communicationScore: { type: Number, min: 0, max: 100, default: 0 },
    employabilityScore: { type: Number, min: 0, max: 100, default: 0 },
    feedback: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('LiveInterview', liveInterviewSchema);
