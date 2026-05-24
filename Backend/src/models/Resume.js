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
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
