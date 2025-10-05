const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getReadingProgress,
  getReadingHistory,
  updateReadingProgress,
  deleteReadingProgress,
  getReadingStatistics
} = require('../controllers/readingController');

// All routes require authentication
router.use(authMiddleware);

// GET /api/reading/history - Get user's complete reading history
router.get('/history', getReadingHistory);

// GET /api/reading/statistics - Get reading statistics (admin only)
router.get('/statistics', getReadingStatistics);

// GET /api/reading/:bookId - Get reading progress for specific book
router.get('/:bookId', getReadingProgress);

// PUT /api/reading/:bookId - Update reading progress for specific book
router.put('/:bookId', updateReadingProgress);

// DELETE /api/reading/:bookId - Delete reading progress for specific book
router.delete('/:bookId', deleteReadingProgress);

module.exports = router;
