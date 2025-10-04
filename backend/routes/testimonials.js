const express = require('express');
const { 
    createTestimonial,
    getApprovedTestimonials,
    getAllTestimonials,
    getUserTestimonials,
    updateTestimonialStatus,
    deleteTestimonial,
    upload
} = require('../controllers/testimonialController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/approved', getApprovedTestimonials); // Get approved testimonials (public)

// All other routes require authentication
router.use(authMiddleware);

// Student routes
router.post('/', upload.single('photo'), createTestimonial); // Create testimonial with photo
router.get('/my-testimonials', getUserTestimonials); // Get user's testimonials
router.delete('/:id', deleteTestimonial); // Delete own testimonial

// Admin routes
router.get('/', requireRole(['admin']), getAllTestimonials); // Get all testimonials
router.put('/:id/status', requireRole(['admin']), updateTestimonialStatus); // Approve/reject testimonial

module.exports = router;