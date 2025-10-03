const express = require('express');
const { 
    getAllBooks, 
    getBookById, 
    createBook, 
    updateBook, 
    deleteBook, 
    getBooksStats,
    getDashboardStats
} = require('../controllers/bookController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes (untuk student bisa lihat katalog)
router.get('/', getAllBooks);
router.get('/stats', getBooksStats);
router.get('/dashboard-stats', getDashboardStats); // New endpoint for admin dashboard
router.get('/:id', getBookById);

// Protected routes - Admin/Petugas only
router.use(authMiddleware);

// Create new book - Admin/Petugas only
router.post('/', requireRole(['admin', 'petugas']), createBook);

// Update book - Admin/Petugas only
router.put('/:id', requireRole(['admin', 'petugas']), updateBook);

// Delete book - Admin only
router.delete('/:id', requireRole(['admin']), deleteBook);

module.exports = router;