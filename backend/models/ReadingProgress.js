const { getConnection } = require('../config/database');

class ReadingProgress {
  // Get reading progress for a specific user and book
  static async getProgress(userId, bookId) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('userId', userId)
        .input('bookId', bookId)
        .query(`
          SELECT * FROM reading_progress 
          WHERE user_id = @userId AND book_id = @bookId
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      throw new Error(`Error getting reading progress: ${error.message}`);
    }
  }

  // Get all reading history for a user
  static async getUserReadingHistory(userId) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT * FROM reading_progress 
          WHERE user_id = @userId 
          ORDER BY last_read DESC
        `);
      
      return result.recordset;
    } catch (error) {
      throw new Error(`Error getting reading history: ${error.message}`);
    }
  }

  // Update or create reading progress
  static async updateProgress(userId, bookId, progressData) {
    try {
      const pool = await getConnection();
      
      // Check if record exists
      const existing = await this.getProgress(userId, bookId);
      
      if (existing) {
        // Update existing record
        const result = await pool.request()
          .input('userId', userId)
          .input('bookId', bookId)
          .input('currentPage', progressData.current_page)
          .input('totalPages', progressData.total_pages)
          .input('progress', progressData.progress)
          .input('title', progressData.title)
          .input('author', progressData.author)
          .query(`
            UPDATE reading_progress 
            SET current_page = @currentPage,
                total_pages = @totalPages,
                progress = @progress,
                title = @title,
                author = @author,
                last_read = GETDATE(),
                updated_at = GETDATE()
            WHERE user_id = @userId AND book_id = @bookId
          `);
        
        return await this.getProgress(userId, bookId);
      } else {
        // Create new record
        const result = await pool.request()
          .input('userId', userId)
          .input('bookId', bookId)
          .input('currentPage', progressData.current_page)
          .input('totalPages', progressData.total_pages)
          .input('progress', progressData.progress)
          .input('title', progressData.title)
          .input('author', progressData.author)
          .query(`
            INSERT INTO reading_progress 
            (user_id, book_id, current_page, total_pages, progress, title, author, last_read, created_at, updated_at)
            VALUES (@userId, @bookId, @currentPage, @totalPages, @progress, @title, @author, GETDATE(), GETDATE(), GETDATE())
          `);
        
        return await this.getProgress(userId, bookId);
      }
    } catch (error) {
      throw new Error(`Error updating reading progress: ${error.message}`);
    }
  }

  // Delete reading progress (if needed)
  static async deleteProgress(userId, bookId) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('userId', userId)
        .input('bookId', bookId)
        .query(`
          DELETE FROM reading_progress 
          WHERE user_id = @userId AND book_id = @bookId
        `);
      
      return result.rowsAffected[0] > 0;
    } catch (error) {
      throw new Error(`Error deleting reading progress: ${error.message}`);
    }
  }

  // Get reading statistics for admin
  static async getReadingStatistics() {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .query(`
          SELECT 
            COUNT(*) as total_readers,
            COUNT(DISTINCT user_id) as unique_readers,
            COUNT(DISTINCT book_id) as books_being_read,
            AVG(progress) as average_progress,
            MAX(last_read) as last_activity
          FROM reading_progress
        `);
      
      return result.recordset[0];
    } catch (error) {
      throw new Error(`Error getting reading statistics: ${error.message}`);
    }
  }

  // Get most read books
  static async getMostReadBooks(limit = 10) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('limit', limit)
        .query(`
          SELECT TOP(@limit)
            book_id,
            title,
            author,
            COUNT(*) as reader_count,
            AVG(progress) as average_progress
          FROM reading_progress 
          GROUP BY book_id, title, author
          ORDER BY reader_count DESC, average_progress DESC
        `);
      
      return result.recordset;
    } catch (error) {
      throw new Error(`Error getting most read books: ${error.message}`);
    }
  }
}

module.exports = ReadingProgress;
