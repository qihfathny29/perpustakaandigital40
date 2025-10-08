const express = require('express');
const { 
    createBorrowRequest,
    getUserBorrows,
    getAllBorrows,
    approveBorrowRequest,
    rejectBorrowRequest,
    confirmPickup,
    returnBook,
    getBorrowStats,
    getBorrowStatusStats,
    getReturnTrendStats,
    createDirectBorrow,
    deleteBorrowRecord,
    clearMyHistory,
    bulkDeleteRecords
} = require('../controllers/borrowController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Student routes
router.post('/', createBorrowRequest); // Create borrow request
router.get('/my-borrows', getUserBorrows); // Get user's borrow history
router.put('/:id/return', returnBook); // Return book - students can return their own books

// Delete routes - PERBAIKI BAGIAN INI
router.delete('/record/:id', deleteBorrowRecord);        // ✅ Hapus auth & borrowController
router.delete('/clear/history', clearMyHistory);         // ✅ Hapus auth & borrowController  
router.post('/bulk-delete', bulkDeleteRecords);          // ✅ Hapus auth & borrowController

// Admin/Petugas routes
router.get('/', requireRole(['admin', 'petugas']), getAllBorrows); // Get all borrow requests
router.get('/stats', requireRole(['admin', 'petugas']), getBorrowStats); // Get borrow statistics
router.get('/status-stats', requireRole(['admin', 'petugas']), getBorrowStatusStats); // Get status statistics
router.get('/trend-stats', requireRole(['admin', 'petugas']), getReturnTrendStats); // Get trend statistics
router.put('/:id/approve', requireRole(['petugas']), approveBorrowRequest); // Approve borrow - ONLY PETUGAS
router.put('/:id/reject', requireRole(['petugas']), rejectBorrowRequest); // Reject borrow - ONLY PETUGAS
router.put('/:id/pickup', requireRole(['petugas']), confirmPickup); // Confirm pickup - ONLY PETUGAS
router.post('/direct', requireRole(['admin', 'petugas']), createDirectBorrow); // Direct borrow by petugas

module.exports = router;