import mongoose from 'mongoose';

const transcriptEntrySchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    answer: {
      type: String,
      default: '',
      trim: true,
      maxlength: 6000,
    },
    feedback: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    technicalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    difficultyAtTime: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    askedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
    },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['text', 'voice'],
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    experienceLevel: {
      type: String,
      default: 'Intermediate',
      trim: true,
    },
    interviewType: {
      type: String,
      default: 'technical',
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    duration: {
      type: Number,
      enum: [10, 15, 30],
      required: true,
      default: 15,
    },
    targetQuestionRange: {
      min: {
        type: Number,
        default: 8,
      },
      max: {
        type: Number,
        default: 12,
      },
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    answeredQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentQuestion: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    currentQuestionAskedAt: {
      type: Date,
    },
    currentAnswerDraft: {
      type: String,
      trim: true,
      default: '',
      maxlength: 6000,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    lastRecoveredAt: {
      type: Date,
    },
    transcriptVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    activePhase: {
      type: String,
      enum: ['pending', 'question_ready', 'candidate_answering', 'transcribing', 'thinking', 'speaking', 'finalizing', 'completed'],
      default: 'pending',
      index: true,
    },
    aiState: {
      type: String,
      enum: ['idle', 'listening', 'transcribing', 'thinking', 'streaming_text', 'generating_audio', 'speaking', 'recovering', 'finalizing'],
      default: 'idle',
    },
    progress: {
      currentTopic: {
        type: String,
        default: 'technical interview',
      },
      followUpDepthLevel: {
        type: Number,
        default: 0,
      },
      introductionCompleted: {
        type: Boolean,
        default: false,
      },
      fundamentalsCompleted: {
        type: Boolean,
        default: false,
      },
      questionCount: {
        type: Number,
        default: 0,
      },
      recentAverageScore: {
        type: Number,
        default: 0,
      },
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    technicalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    problemSolvingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    depthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    strengths: [{
      type: String,
      trim: true,
      maxlength: 160,
    }],
    weaknesses: [{
      type: String,
      trim: true,
      maxlength: 160,
    }],
    suggestions: [{
      type: String,
      trim: true,
      maxlength: 240,
    }],
    recommendedStudyTopics: [{
      type: String,
      trim: true,
      maxlength: 160,
    }],
    hiringReadiness: {
      type: String,
      trim: true,
      default: 'Not assessed',
    },
    finalSummary: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    transcript: {
      type: [transcriptEntrySchema],
      default: [],
    },
    reportGeneratedAt: {
      type: Date,
    },
    meta: {
      autoEnded: {
        type: Boolean,
        default: false,
      },
      finalizationInProgress: {
        type: Boolean,
        default: false,
      },
      finalizationAttemptedAt: {
        type: Date,
      },
      questionStrategy: {
        type: String,
        default: 'adaptive',
      },
      interviewerStyle: {
        type: String,
        default: 'Friendly',
      },
      lastAudioRequestId: {
        type: String,
        default: '',
      },
      activeAudioUrl: {
        type: String,
        default: '',
      },
      reconnectionCount: {
        type: Number,
        default: 0,
      },
      autosaveVersion: {
        type: Number,
        default: 0,
      },
    },
    recovery: {
      lastSocketId: {
        type: String,
        default: '',
      },
      lastClientSyncAt: {
        type: Date,
      },
      lastKnownConnectionState: {
        type: String,
        enum: ['connected', 'disconnected', 'recovering', 'unknown'],
        default: 'unknown',
      },
      lastKnownTabId: {
        type: String,
        default: '',
      },
      lastRecoveredBy: {
        type: String,
        default: '',
      },
    },
  },
  { timestamps: true }
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, topic: 1, createdAt: -1 });

export default mongoose.model('InterviewSession', interviewSessionSchema);
