import { createContext, useState, useEffect } from 'react';

export const ReadingContext = createContext();

export function ReadingProvider({ children }) {
  const [readingHistory, setReadingHistory] = useState(() => {
    const saved = localStorage.getItem('readingHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const updateReadingProgress = (bookId, title, author, currentPage, totalPages = 100) => {
    const now = new Date().toISOString();
    const progress = Math.round((currentPage / totalPages) * 100);

    // Save to localStorage immediately
    localStorage.setItem(`readingProgress_${bookId}`, JSON.stringify({
      currentPage,
      lastRead: now,
      progress
    }));

    setReadingHistory(prev => {
      const existingIndex = prev.findIndex(item => item.bookId === bookId);
      
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          currentPage,
          lastRead: now,
          progress,
          title,
          author,
          totalPages
        };
        return updated;
      }

      return [...prev, {
        bookId,
        title,
        author,
        currentPage,
        totalPages,
        lastRead: now,
        progress
      }];
    });
  };

  // Add function to get reading progress
  const getReadingProgress = (bookId) => {
    const saved = localStorage.getItem(`readingProgress_${bookId}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  };

  // Save to localStorage whenever reading history changes
  useEffect(() => {
    if (readingHistory.length > 0) {
      localStorage.setItem('readingHistory', JSON.stringify(readingHistory));
    }
  }, [readingHistory]);

  return (
    <ReadingContext.Provider value={{ 
      readingHistory, 
      updateReadingProgress,
      getReadingProgress 
    }}>
      {children}
    </ReadingContext.Provider>
  );
}
