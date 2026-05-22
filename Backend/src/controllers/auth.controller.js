const authService = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    const token = authService.generateToken(user._id);
    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const token = authService.generateToken(user._id);
    res.send({ user, token });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
