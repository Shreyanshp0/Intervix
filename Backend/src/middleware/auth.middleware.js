const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/api-error');

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
    req.user = await User.findById(decoded.sub).select('-password');
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

module.exports = { protect, authorize };
