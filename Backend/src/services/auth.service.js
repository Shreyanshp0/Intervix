const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/api-error');

class AuthService {
  async registerUser(userData) {
    if (await User.findOne({ email: userData.email })) {
      throw new ApiError(400, 'Email already taken');
    }
    const user = await User.create(userData);
    return user;
  }

  async loginUserWithEmailAndPassword(email, password) {
    const user = await User.findOne({ email });
    if (!user || !(await user.isPasswordMatch(password))) {
      throw new ApiError(401, 'Incorrect email or password');
    }
    return user;
  }

  generateToken(userId) {
    const payload = { sub: userId };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  }
}

module.exports = new AuthService();
