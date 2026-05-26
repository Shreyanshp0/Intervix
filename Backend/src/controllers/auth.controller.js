import authService from '../services/auth.service.js';
import handleControllerError from '../utils/controller-error.js';

const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    const token = authService.generateToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    return handleControllerError('auth.controller.register', res, next, error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const token = authService.generateToken(user);
    res.send({ user, token });
  } catch (error) {
    return handleControllerError('auth.controller.login', res, next, error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user._id);
    res.status(200).json({ user });
  } catch (error) {
    return handleControllerError('auth.controller.me', res, next, error);
  }
};

const logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export {
  register,
  login,
  me,
  logout
};
