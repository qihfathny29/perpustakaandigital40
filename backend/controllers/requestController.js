const BookRequest = require('../models/BookRequest');

// Create new book request
const createRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { bookTitle, author, reason } = req.body;

        // Validation
        if (!bookTitle) {
            return res.status(400).json({
                status: 'error',
                message: 'Book title is required'
            });
        }

        // Create new request
        const newRequest = await BookRequest.create({
            userId,
            bookTitle,
            author: author || '',
            reason: reason || ''
        });

        res.status(201).json({
            status: 'success',
            message: 'Book request created successfully',
            data: {
                request: newRequest.toJSON()
            }
        });

    } catch (error) {
        console.error('Create book request error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user's book requests
const getUserRequests = async (req, res) => {
    try {
        const userId = req.user.userId;
        const requests = await BookRequest.findByUserId(userId);

        res.json({
            status: 'success',
            data: {
                requests: requests.map(request => request.toJSON())
            }
        });

    } catch (error) {
        console.error('Get user requests error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all book requests (Admin/Petugas only)
const getAllRequests = async (req, res) => {
    try {
        const requests = await BookRequest.findAll();

        res.json({
            status: 'success',
            data: {
                requests: requests
            }
        });

    } catch (error) {
        console.error('Get all requests error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update request status (Admin/Petugas only)
const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const reviewedBy = req.user.userId;

        // Validation
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        // Update request
        const updatedRequest = await BookRequest.updateStatus(id, status, reviewedBy, notes);

        if (!updatedRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'Request not found'
            });
        }

        res.json({
            status: 'success',
            message: `Request ${status} successfully`,
            data: {
                request: updatedRequest.toJSON()
            }
        });

    } catch (error) {
        console.error('Update request status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete request
const deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Check if request exists and user owns it (or is admin)
        const allRequests = await BookRequest.findAll();
        const request = allRequests.find(r => r.id == id);

        if (!request) {
            return res.status(404).json({
                status: 'error',
                message: 'Request not found'
            });
        }

        // Only request owner or admin can delete
        if (request.userId !== userId && !['admin', 'petugas'].includes(userRole)) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only delete your own requests'
            });
        }

        // Delete request
        const deleted = await BookRequest.delete(id);

        if (!deleted) {
            return res.status(404).json({
                status: 'error',
                message: 'Request not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Request deleted successfully'
        });

    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    createRequest,
    getUserRequests,
    getAllRequests,
    updateRequestStatus,
    deleteRequest
};
