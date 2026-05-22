const mongoose = require('mongoose');

const interviewMessageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'interviewer', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  audioUrl: {
    type: String, // Used if mode is voice
    default: null
  },
  metadata: {
    // any extra data extracted (e.g. keywords from this specific answer)
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('InterviewMessage', interviewMessageSchema);
