import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/api-error.js';
import candidateService from '../services/candidate.service.js';

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.sub)
      .select('-password')
      .populate('candidateProfile recruiterProfile company');

    if (!req.user) {
      throw new ApiError(401, 'User account no longer exists');
    }
    next();
  } catch (error) {
    next(new ApiError(401, 'Not authorized, token failed'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `User role ${req.user.role} is not authorized`));
    }
    next();
  };
};

const ensureOwnProfile = (role) => async (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== role) {
    return next(new ApiError(403, 'You cannot access this resource'));
  }

  if (role === 'candidate' && !req.user.candidateProfile) {
    try {
      const profile = await candidateService.getOrCreateProfile(req.user._id);
      req.user.candidateProfile = profile._id;
    } catch (err) {
      return next(new ApiError(404, 'Candidate profile not found'));
    }
  }

  if (role === 'recruiter' && (!req.user.recruiterProfile || !req.user.company)) {
    return next(new ApiError(404, 'Recruiter account is not fully provisioned'));
  }

  return next();
};

export { protect, authorize, ensureOwnProfile };
