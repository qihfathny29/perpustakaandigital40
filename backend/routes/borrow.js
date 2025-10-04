const express = require('express');
const { 
    createBorrowRequest,
    getUserBorrows,
    getAllBorrows,
    approveBorrowRequest,
    rejectBorrowRequest,
    returnBook
} = require('../controllers/borrowController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Student routes
router.post('/', createBorrowRequest); // Create borrow request
router.get('/my-borrows', getUserBorrows); // Get user's borrow history
router.put('/:id/return', returnBook); // Return book - students can return their own books

// Admin/Petugas routes
router.get('/', requireRole(['admin', 'petugas']), getAllBorrows); // Get all borrow requests
router.put('/:id/approve', requireRole(['admin', 'petugas']), approveBorrowRequest); // Approve borrow
router.put('/:id/reject', requireRole(['admin', 'petugas']), rejectBorrowRequest); // Reject borrow

module.exports = router;