import mongoose from 'mongoose';

const socialLinksSchema = new mongoose.Schema({
  linkedin: { type: String, trim: true, default: '' },
  twitter: { type: String, trim: true, default: '' },
  facebook: { type: String, trim: true, default: '' },
  instagram: { type: String, trim: true, default: '' }
}, { _id: false });

const recruiterDetailsSchema = new mongoose.Schema({
  recruiterName: { type: String, trim: true, default: '' },
  recruiterTitle: { type: String, trim: true, default: '' },
  recruiterEmail: { type: String, trim: true, lowercase: true, default: '' },
  recruiterPhone: { type: String, trim: true, default: '' }
}, { _id: false });

const companySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true },
  logo: { type: String, trim: true, default: '' },
  industry: { type: String, trim: true, default: '' },
  companySize: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  recruiterDetails: recruiterDetailsSchema,
  socialLinks: socialLinksSchema
}, { timestamps: true });

companySchema.index({ name: 1, industry: 1 });

export default mongoose.model('Company', companySchema);
