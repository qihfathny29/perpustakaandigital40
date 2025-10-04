const express = require('express');
const {
    createRequest,
    getUserRequests,
    getAllRequests,
    updateRequestStatus,
    deleteRequest
} = require('../controllers/requestController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Student routes
router.post('/', createRequest);              // POST /api/requests - Create new request
router.get('/my-requests', getUserRequests);   // GET /api/requests/my-requests - Get user's requests

// Admin/Petugas routes
router.get('/', requireRole(['admin', 'petugas']), getAllRequests);                    // GET /api/requests - Get all requests
router.put('/:id/status', requireRole(['admin', 'petugas']), updateRequestStatus);     // PUT /api/requests/:id/status - Update status

// Delete routes (user can delete own, admin can delete any)
router.delete('/:id', deleteRequest);          // DELETE /api/requests/:id - Delete request

module.exports = router;
