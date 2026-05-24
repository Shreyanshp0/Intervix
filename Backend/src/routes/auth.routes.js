const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../validators');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', protect, authController.me);

module.exports = router;
