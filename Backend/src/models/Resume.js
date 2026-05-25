const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  candidateProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CandidateProfile',
    required: true,
    unique: true,
    index: true
  },
  fileName: { type: String, required: true, trim: true },
  storageKey: { type: String, trim: true, default: '' },
  fileUrl: { type: String, trim: true, default: '' },
  mimeType: { type: String, trim: true, default: '' },
  fileSize: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  rawText: { type: String, default: '' },
  aiAnalysis: {
    recruiterSummary: { type: String, default: '' },
    resumeQualityScore: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    skillConfidence: { type: Number, default: 0 },
    strengths: [{ type: String, trim: true }],
    weakAreas: [{ type: String, trim: true }],
    certifications: [{ type: String, trim: true }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
