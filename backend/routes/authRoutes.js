const express = require('express');
const router = express.Router();
const { register, login, refreshToken, getMe, logout } = require('../controllers/authController');
const { registerValidation, loginValidation, validate } = require('../validators/authValidations');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
