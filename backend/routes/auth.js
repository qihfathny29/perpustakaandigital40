const express = require('express');
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;