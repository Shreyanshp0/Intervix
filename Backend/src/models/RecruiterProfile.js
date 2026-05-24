const mongoose = require('mongoose');

const recruiterProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  fullName: { type: String, required: true, trim: true },
  workEmail: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: '' },
  title: { type: String, trim: true, default: '' },
  profilePhoto: { type: String, trim: true, default: '' },
  bio: { type: String, trim: true, default: '' },
  socialLinks: {
    linkedin: { type: String, trim: true, default: '' },
    twitter: { type: String, trim: true, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('RecruiterProfile', recruiterProfileSchema);
