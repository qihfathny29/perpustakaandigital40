const express = require('express');
const { 
    getAllUsers, 
    getUserById, 
    deleteUser, 
    getDashboardStats,
    getProfile,
    updateProfile,
    updateProfileImage,
    upload
} = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Profile routes - accessible by all authenticated users
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/image', upload.single('profileImage'), updateProfileImage);

// Dashboard statistics - Admin/Petugas only
router.get('/stats', requireRole(['admin', 'petugas']), getDashboardStats);

// Get all users - Admin/Petugas only
router.get('/', requireRole(['admin', 'petugas']), getAllUsers);

// Get specific user by ID - Admin/Petugas only
router.get('/:id', requireRole(['admin', 'petugas']), getUserById);

// Delete user - Admin only
router.delete('/:id', requireRole(['admin']), deleteUser);

module.exports = router;
