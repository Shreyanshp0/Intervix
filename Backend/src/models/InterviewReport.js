const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    unique: true
  },
  technicalScore: {
    type: Number,
    min: 0,
    max: 10
  },
  communicationScore: {
    type: Number,
    min: 0,
    max: 10
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 10
  },
  detectedSkills: [{
    type: String
  }],
  strengths: [{
    type: String
  }],
  weaknesses: [{
    type: String
  }],
  summary: {
    type: String
  },
  improvementRecommendations: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
