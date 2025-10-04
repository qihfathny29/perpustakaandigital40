const Testimonial = require('../models/Testimonial');
const multer = require('multer');
const path = require('path');

// Configure multer for testimonial photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/testimonials/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'testimonial-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Create new testimonial
const createTestimonial = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { text, rating, bookId, bookTitle } = req.body;

        console.log('📝 Creating testimonial with data:', {
            userId,
            text,
            rating,
            bookId,
            bookTitle,
            hasFile: !!req.file
        });

        // Validation
        if (!text || !rating) {
            return res.status(400).json({
                status: 'error',
                message: 'Text and rating are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }

        // Prepare testimonial data
        const testimonialData = {
            userId,
            content: text,
            rating: parseInt(rating)
        };

        // Add optional book info
        if (bookId) {
            testimonialData.bookId = parseInt(bookId);
        }
        if (bookTitle) {
            testimonialData.bookTitle = bookTitle;
        }

        // Add photo path if uploaded
        if (req.file) {
            testimonialData.photoPath = req.file.filename;
        }

        // Create testimonial
        const newTestimonial = await Testimonial.create(testimonialData);

        res.status(201).json({
            status: 'success',
            message: 'Testimonial created successfully',
            data: {
                testimonial: newTestimonial.toJSON()
            }
        });

    } catch (error) {
        console.error('Create testimonial error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get approved testimonials (public)
const getApprovedTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.findApproved();
        console.log('🔍 Raw testimonials from DB:', testimonials);
        
        const formattedTestimonials = testimonials.map(t => {
            const json = t.toJSON ? t.toJSON() : t;
            console.log('🔍 Testimonial after toJSON():', json);
            return json;
        });

        res.json({
            status: 'success',
            data: {
                testimonials: formattedTestimonials
            }
        });

    } catch (error) {
        console.error('Get approved testimonials error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all testimonials (admin only)
const getAllTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.findAll();

        res.json({
            status: 'success',
            data: {
                testimonials: testimonials.map(t => t.toJSON ? t.toJSON() : t)
            }
        });

    } catch (error) {
        console.error('Get all testimonials error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user's testimonials
const getUserTestimonials = async (req, res) => {
    try {
        const userId = req.user.userId;
        const testimonials = await Testimonial.findByUserId(userId);

        res.json({
            status: 'success',
            data: {
                testimonials: testimonials.map(t => t.toJSON())
            }
        });

    } catch (error) {
        console.error('Get user testimonials error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update testimonial status (admin only)
const updateTestimonialStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validation
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        // Update testimonial
        const updatedTestimonial = await Testimonial.updateStatus(id, status);

        if (!updatedTestimonial) {
            return res.status(404).json({
                status: 'error',
                message: 'Testimonial not found'
            });
        }

        res.json({
            status: 'success',
            message: `Testimonial ${status} successfully`,
            data: {
                testimonial: updatedTestimonial.toJSON()
            }
        });

    } catch (error) {
        console.error('Update testimonial status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete testimonial
const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Check if testimonial exists and user owns it (or is admin)
        const allTestimonials = await Testimonial.findAll();
        const testimonial = allTestimonials.find(t => t.id == id);

        if (!testimonial) {
            return res.status(404).json({
                status: 'error',
                message: 'Testimonial not found'
            });
        }

        // Check ownership (unless admin)
        if (userRole !== 'admin' && testimonial.userId !== userId) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only delete your own testimonials'
            });
        }

        // Delete testimonial
        const deleted = await Testimonial.delete(id);

        if (!deleted) {
            return res.status(404).json({
                status: 'error',
                message: 'Testimonial not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Testimonial deleted successfully'
        });

    } catch (error) {
        console.error('Delete testimonial error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    createTestimonial,
    getApprovedTestimonials,
    getAllTestimonials,
    getUserTestimonials,
    updateTestimonialStatus,
    deleteTestimonial,
    upload
};