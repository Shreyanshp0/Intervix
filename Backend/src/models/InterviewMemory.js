const mongoose = require('mongoose');

const interviewMemorySchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    unique: true
  },
  mentionedTechnologies: [{
    type: String
  }],
  candidateClaims: [{
    type: String
  }],
  previousQuestions: [{
    type: String
  }],
  candidateAnswers: [{
    type: String
  }],
  discussedTopics: [{
    type: String
  }],
  conversationHistory: [{
    role: {
      type: String,
      enum: ['user', 'interviewer', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  strongAreas: [{
    type: String
  }],
  weakAreas: [{
    type: String
  }],
  confidenceTrends: [{
    score: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  currentTopicDepth: {
    type: Number,
    default: 1
  },
  flowState: {
    introductionCompleted: {
      type: Boolean,
      default: false
    },
    fundamentalsCompleted: {
      type: Boolean,
      default: false
    },
    followUpDepthLevel: {
      type: Number,
      default: 0
    },
    currentTopic: {
      type: String,
      default: 'technical interview'
    },
    currentDifficulty: {
      type: String,
      default: 'medium'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('InterviewMemory', interviewMemorySchema);
