const ReadingProgress = require('../models/ReadingProgress');

// Get reading progress for specific book
const getReadingProgress = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    const progress = await ReadingProgress.getProgress(userId, bookId);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Reading progress not found'
      });
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting reading progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reading progress',
      error: error.message
    });
  }
};

// Get user's complete reading history
const getReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await ReadingProgress.getUserReadingHistory(userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting reading history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reading history',
      error: error.message
    });
  }
};

// Update reading progress
const updateReadingProgress = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const { 
      current_page, 
      total_pages, 
      title, 
      author 
    } = req.body;

    // Validate required fields
    if (!current_page || !total_pages || !title || !author) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: current_page, total_pages, title, author'
      });
    }

    // Calculate progress percentage
    const progress = Math.round((current_page / total_pages) * 100 * 100) / 100; // Round to 2 decimal places

    const progressData = {
      current_page: parseInt(current_page),
      total_pages: parseInt(total_pages),
      progress: progress,
      title: title.trim(),
      author: author.trim()
    };

    const updatedProgress = await ReadingProgress.updateProgress(userId, bookId, progressData);

    res.json({
      success: true,
      message: 'Reading progress updated successfully',
      data: updatedProgress
    });
  } catch (error) {
    console.error('Error updating reading progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reading progress',
      error: error.message
    });
  }
};

// Delete reading progress
const deleteReadingProgress = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    const deleted = await ReadingProgress.deleteProgress(userId, bookId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Reading progress not found'
      });
    }

    res.json({
      success: true,
      message: 'Reading progress deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reading progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reading progress',
      error: error.message
    });
  }
};

// Get reading statistics (for admin)
const getReadingStatistics = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const statistics = await ReadingProgress.getReadingStatistics();
    const mostReadBooks = await ReadingProgress.getMostReadBooks(10);

    res.json({
      success: true,
      data: {
        statistics,
        mostReadBooks
      }
    });
  } catch (error) {
    console.error('Error getting reading statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reading statistics',
      error: error.message
    });
  }
};

module.exports = {
  getReadingProgress,
  getReadingHistory,
  updateReadingProgress,
  deleteReadingProgress,
  getReadingStatistics
};
