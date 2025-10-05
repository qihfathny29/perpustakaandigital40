import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { readingAPI } from '../utils/api';
import { AuthContext } from './AuthContext';

export const ReadingContext = createContext();

export function ReadingProvider({ children }) {
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  // Load reading history from database
  const loadReadingHistory = useCallback(async () => {
    if (!user) return;
    
    console.log('📡 Loading reading history for user:', user.username);
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 Calling readingAPI.getHistory()...');
      const response = await readingAPI.getHistory();
      console.log('📥 API response:', response);
      
      if (response.success) {
        console.log('✅ Reading history loaded:', response.data);
        console.log('📊 Number of records:', response.data?.length || 0);
        
        // Debug each record
        response.data?.forEach((record, index) => {
          console.log(`📖 Record ${index + 1}:`, {
            book_id: record.book_id,
            title: record.title,
            author: record.author,
            current_page: record.current_page,
            total_pages: record.total_pages,
            last_read: record.last_read
          });
        });
        
        // Debug state after setting - use callback to get actual updated state
        setReadingHistory(prevState => {
          console.log('🏁 Final readingHistory state set to:', response.data);
          console.log('🔄 Previous state was:', prevState);
          return response.data || [];
        });
      } else {
        console.error('❌ Failed to load reading history:', response.message);
        setError(response.message);
      }
    } catch (error) {
      console.error('💥 Error loading reading history:', error);
      setError('Failed to load reading history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load reading history from database when user logs in
  useEffect(() => {
    console.log('🔍 ReadingContext useEffect triggered, user:', user);
    if (user) {
      console.log('✅ User found, loading reading history...');
      loadReadingHistory();
    } else {
      console.log('❌ No user, clearing reading history');
      // Clear data when user logs out
      setReadingHistory([]);
    }
  }, [user, loadReadingHistory]);

  // Update reading progress in database
  const updateReadingProgress = async (bookId, title, author, currentPage, totalPages = 100) => {
    console.log('📝 updateReadingProgress called with:', {
      bookId, title, author, currentPage, totalPages, user: user?.username
    });

    if (!user) {
      console.warn('User not authenticated, cannot save reading progress');
      return;
    }

    // Validate required parameters
    if (!bookId || !title || !author || !currentPage) {
      console.error('❌ Missing required parameters:', { bookId, title, author, currentPage });
      return;
    }

    try {
      setError(null);
      const progressData = {
        current_page: currentPage,
        total_pages: totalPages,
        title: title,
        author: author
      };

      console.log('🚀 Sending progress data:', progressData);
      const response = await readingAPI.updateProgress(bookId, progressData);
      
      if (response.success) {
        // Update local state with the new progress
        setReadingHistory(prev => {
          const existingIndex = prev.findIndex(item => item.book_id === bookId);
          
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = response.data;
            return updated;
          }

          return [...prev, response.data];
        });
        
        console.log('✅ Reading progress saved to database');
      } else {
        console.error('❌ Failed to update reading progress:', response.message);
        setError(response.message);
      }
    } catch (error) {
      console.error('💥 Error updating reading progress:', error);
      setError('Failed to save reading progress');
    }
  };

  // Get reading progress for specific book
  const getReadingProgress = async (bookId) => {
    if (!user) return null;

    // First check local state
    const localProgress = readingHistory.find(item => item.book_id === bookId);
    if (localProgress) {
      return {
        currentPage: localProgress.current_page,
        progress: localProgress.progress,
        lastRead: localProgress.last_read
      };
    }

    // If not in local state, fetch from database
    try {
      const response = await readingAPI.getProgress(bookId);
      
      if (response.success && response.data) {
        return {
          currentPage: response.data.current_page,
          progress: response.data.progress,
          lastRead: response.data.last_read
        };
      }
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    }

    return null;
  };

  // Delete reading progress
  const deleteReadingProgress = async (bookId) => {
    if (!user) return;

    try {
      const response = await readingAPI.deleteProgress(bookId);
      
      if (response.success) {
        // Remove from local state
        setReadingHistory(prev => prev.filter(item => item.book_id !== bookId));
        console.log('✅ Reading progress deleted');
      } else {
        console.error('Failed to delete reading progress:', response.message);
        setError(response.message);
      }
    } catch (error) {
      console.error('Error deleting reading progress:', error);
      setError('Failed to delete reading progress');
    }
  };

  // Refresh reading history (useful for manual refresh)
  const refreshReadingHistory = () => {
    loadReadingHistory();
  };

  return (
    <ReadingContext.Provider value={{ 
      readingHistory, 
      updateReadingProgress,
      getReadingProgress,
      deleteReadingProgress,
      refreshReadingHistory,
      loading,
      error
    }}>
      {children}
    </ReadingContext.Provider>
  );
}
