import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema({
  institution: { type: String, trim: true },
  degree: { type: String, trim: true },
  fieldOfStudy: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  grade: { type: String, trim: true },
  description: { type: String, trim: true }
}, { _id: true });

const experienceSchema = new mongoose.Schema({
  company: { type: String, trim: true },
  title: { type: String, trim: true },
  employmentType: { type: String, trim: true },
  location: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  currentlyWorking: { type: Boolean, default: false },
  description: { type: String, trim: true },
  highlights: [{ type: String, trim: true }]
}, { _id: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  role: { type: String, trim: true },
  description: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
  projectUrl: { type: String, trim: true },
  repositoryUrl: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date }
}, { _id: true });

const candidateProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: '' },
  profilePhoto: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  aboutMe: { type: String, trim: true, default: '' },
  skills: {
    raw: [{ type: String, trim: true }],
    normalized: [{ type: String, trim: true, lowercase: true, index: true }],
    verified: [{ type: String, trim: true, lowercase: true }]
  },
  verifiedSkills: {
    type: Map,
    of: Number,
    default: () => ({})
  },
  education: [educationSchema],
  experience: [experienceSchema],
  projects: [projectSchema],
  github: { type: String, trim: true, default: '' },
  linkedin: { type: String, trim: true, default: '' },
  portfolio: { type: String, trim: true, default: '' },
  preferredRoles: [{ type: String, trim: true }],
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    default: null
  },
  completionScore: { type: Number, default: 0 },
  lastProfileUpdateAt: { type: Date, default: null }
}, { timestamps: true });

candidateProfileSchema.index({ 'skills.normalized': 1, location: 1 });

export default mongoose.models.CandidateProfile || mongoose.model('CandidateProfile', candidateProfileSchema);
