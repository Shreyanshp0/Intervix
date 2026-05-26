import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import CandidateProfile from '../models/CandidateProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import Company from '../models/Company.js';
import ApiError from '../utils/api-error.js';
import { USER_ROLES } from '../utils/roles.js';

class AuthService {
  async registerUser(userData) {
    if (await User.findOne({ email: userData.email })) {
      throw new ApiError(400, 'Email already taken');
    }
    const user = await User.create(userData);

    if (user.role === USER_ROLES.CANDIDATE) {
      const candidateProfile = await CandidateProfile.create({
        user: user._id,
        name: user.name,
        email: user.email,
        skills: { raw: [], normalized: [], verified: [] },
        education: [],
        experience: [],
        projects: [],
        preferredRoles: []
      });

      user.candidateProfile = candidateProfile._id;
      await user.save();
    }

    if (user.role === USER_ROLES.RECRUITER) {
      const company = await Company.create({
        owner: user._id,
        name: `${user.name}'s Company`,
        recruiterDetails: {
          recruiterName: user.name,
          recruiterEmail: user.email
        }
      });

      const recruiterProfile = await RecruiterProfile.create({
        user: user._id,
        company: company._id,
        fullName: user.name,
        workEmail: user.email
      });

      user.company = company._id;
      user.recruiterProfile = recruiterProfile._id;
      await user.save();
    }

    return this.getUserById(user._id);
  }

  async loginUserWithEmailAndPassword(emailOrUserId, password) {
    import mongoose from 'mongoose';
    let query = {};
    if (mongoose.Types.ObjectId.isValid(emailOrUserId)) {
      query = { $or: [{ email: emailOrUserId }, { _id: emailOrUserId }] };
    } else {
      query = { email: emailOrUserId };
    }
    const user = await User.findOne(query);
    if (!user || !(await user.isPasswordMatch(password))) {
      throw new ApiError(401, 'Unauthorized user');
    }
    return this.getUserById(user._id);
  }

  async getUserById(userId) {
    const user = await User.findById(userId)
      .select('-password')
      .populate('candidateProfile recruiterProfile company');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  generateToken(user) {
    const payload = { sub: user._id, role: user.role };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  }
}

export default new AuthService();
