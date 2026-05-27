import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_UPDATED',
      'INTERVIEW_CANCELLED',
      'RECRUITER_MESSAGE',
      'ROOM_READY',
      'INTERVIEW_STARTING',
      'FEEDBACK_RECEIVED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
