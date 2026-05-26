import mongoose from 'mongoose';

const topicPerformanceSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    interviewsTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    latestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    confidenceAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const recentInterviewSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    confidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    interviewsTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    latestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    topicPerformance: {
      type: [topicPerformanceSchema],
      default: [],
    },
    recentInterviews: {
      type: [recentInterviewSchema],
      default: [],
    },
    improvementMetrics: {
      scoreDelta: {
        type: Number,
        default: 0,
      },
      confidenceDelta: {
        type: Number,
        default: 0,
      },
      consistency: {
        type: Number,
        default: 0,
      },
      improving: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('UserProgress', userProgressSchema);
