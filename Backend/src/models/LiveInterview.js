import mongoose from 'mongoose';

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
    enum: ['scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  problem: {
    title: { type: String, trim: true, default: 'Live Coding Challenge' },
    description: { type: String, default: 'Solve the problem collaboratively while explaining your approach.' },
    difficulty: { type: String, trim: true, default: 'Medium' },
    testCases: [{
      name: { type: String, trim: true, default: '' },
      input: { type: String, default: '' },
      expectedOutput: { type: String, default: '' }
    }]
  },
  codeState: {
    code: { type: String, default: '' },
    language: { type: String, default: 'javascript' },
    cursor: {
      userId: { type: String, default: '' },
      role: { type: String, default: '' },
      lineNumber: { type: Number, default: 1 },
      column: { type: Number, default: 1 }
    },
    version: { type: Number, default: 0 },
    updatedAt: { type: Date, default: null }
  },
  mediaState: {
    candidateScreenSharing: { type: Boolean, default: false },
    candidateAudioEnabled: { type: Boolean, default: true },
    candidateVideoEnabled: { type: Boolean, default: true },
    recruiterAudioEnabled: { type: Boolean, default: true },
    recruiterVideoEnabled: { type: Boolean, default: true },
    connectionQuality: { type: String, enum: ['unknown', 'good', 'fair', 'poor'], default: 'unknown' },
    screenShareStartedAt: { type: Date, default: null },
    totalScreenShareSeconds: { type: Number, default: 0 }
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['candidate', 'recruiter', 'admin', 'spectator'], required: true },
    socketId: { type: String, default: '' },
    name: { type: String, default: '' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    connected: { type: Boolean, default: true }
  }],
  controls: {
    editorLocked: { type: Boolean, default: false },
    paused: { type: Boolean, default: false },
    requestedScreenShare: { type: Boolean, default: false },
    endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    endedAt: { type: Date, default: null }
  },
  analytics: {
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    codeChangeCount: { type: Number, default: 0 },
    cursorEventCount: { type: Number, default: 0 },
    languageChangeCount: { type: Number, default: 0 },
    runCount: { type: Number, default: 0 },
    reconnectCount: { type: Number, default: 0 },
    mediaToggleCount: { type: Number, default: 0 },
    screenShareSessions: [{
      startedAt: { type: Date, default: Date.now },
      endedAt: { type: Date, default: null },
      durationSeconds: { type: Number, default: 0 }
    }]
  },
  executionHistory: [{
    language: { type: String, default: 'javascript' },
    code: { type: String, default: '' },
    input: { type: String, default: '' },
    success: { type: Boolean, default: false },
    output: { type: String, default: '' },
    error: { type: String, default: '' },
    status: { type: String, default: 'completed' },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executedAt: { type: Date, default: Date.now }
  }],
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

liveInterviewSchema.pre('validate', function ensureRoomId() {
  if (!this.roomId) {
    return next(new Error('roomId is required'));
  }

  
});

export default mongoose.models.LiveInterview || mongoose.model('LiveInterview', liveInterviewSchema);
