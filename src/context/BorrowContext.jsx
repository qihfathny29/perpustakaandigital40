import React, { createContext, useContext, useState, useEffect } from 'react';
import { borrowAPI } from '../utils/api';
import { useAuth } from './AuthContext';

export const BorrowContext = createContext();

export const useBorrow = () => {
  const context = useContext(BorrowContext);
  if (!context) {
    throw new Error('useBorrow must be used within a BorrowProvider');
  }
  return context;
};

export const BorrowProvider = ({ children }) => {
  const { user } = useAuth();
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch borrowed books for current user
  const fetchBorrowedBooks = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('Fetching borrowed books for user:', user.id);
      
      const response = await borrowAPI.getBorrowedBooks();
      console.log('BorrowContext - getBorrowedBooks response:', response);
      
      // Parse data dengan benar - backend mengirim data.borrows
      const booksData = response.data?.borrows || [];
      console.log('BorrowContext - Setting borrowedBooks to:', booksData);
      setBorrowedBooks(booksData);
    } catch (error) {
      console.error('Error fetching borrowed books:', error);
      // Set ke empty array jika ada error
      setBorrowedBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all borrow requests (for admin and petugas)
  const fetchBorrowRequests = async () => {
    if (!user || !['admin', 'petugas'].includes(user.role)) return;
    
    try {
      setIsLoading(true);
      console.log('Fetching borrow requests for admin...');
      const response = await borrowAPI.getAllBorrowRequests();
      console.log('BorrowContext - getAllBorrowRequests response:', response);
      
      // Parse data dengan benar - backend mengirim data.borrows untuk admin
      const requestsData = response.data?.borrows || [];
      console.log('BorrowContext - Setting borrowRequests to:', requestsData);
      setBorrowRequests(requestsData);
    } catch (error) {
      console.error('Error fetching borrow requests:', error);
      // Set ke empty array jika ada error
      setBorrowRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      fetchBorrowedBooks();
      if (user.role === 'admin') {
        fetchBorrowRequests();
      }
    } else {
      setBorrowedBooks([]);
      setBorrowRequests([]);
    }
  }, [user]);

  // Borrow a book
  const borrowBook = async (borrowData) => {
    if (!user) {
      throw new Error('Please login to borrow books');
    }

    try {
      setIsLoading(true);
      console.log('Attempting to borrow book:', borrowData);
      
      const response = await borrowAPI.borrowBook(borrowData);
      console.log('Borrow response:', response);
      
      // Refresh borrowed books list
      await fetchBorrowedBooks();
      
      return {
        status: 'success',
        success: true,
        message: 'Peminjaman berhasil! Menunggu persetujuan petugas.'
      };
    } catch (error) {
      console.error('Error borrowing book:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Return a book
  const returnBook = async (borrowId) => {
    try {
      setIsLoading(true);
      console.log('Attempting to return book:', borrowId);
      
      const response = await borrowAPI.returnBook(borrowId);
      console.log('Return response:', response);
      
      // Refresh borrowed books list
      await fetchBorrowedBooks();
      
      return {
        success: true,
        message: 'Book returned successfully!'
      };
    } catch (error) {
      console.error('Error returning book:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Approve borrow request (petugas only)
  const approveBorrow = async (borrowId) => {
    if (!user || user.role !== 'petugas') {
      throw new Error('Only petugas can approve borrow requests');
    }

    try {
      setIsLoading(true);
      console.log('Approving borrow request:', borrowId);
      
      const response = await borrowAPI.approveBorrow(borrowId);
      console.log('Approve response:', response);
      
      // Refresh borrow requests list
      await fetchBorrowRequests();
      
      return {
        success: true,
        message: 'Borrow request approved successfully!'
      };
    } catch (error) {
      console.error('Error approving borrow request:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reject borrow request (petugas only)
  const rejectBorrow = async (borrowId) => {
    if (!user || user.role !== 'petugas') {
      throw new Error('Only petugas can reject borrow requests');
    }

    try {
      setIsLoading(true);
      console.log('Rejecting borrow request:', borrowId);
      
      const response = await borrowAPI.rejectBorrow(borrowId);
      console.log('Reject response:', response);
      
      // Refresh borrow requests list
      await fetchBorrowRequests();
      
      return {
        success: true,
        message: 'Borrow request rejected successfully!'
      };
    } catch (error) {
      console.error('Error rejecting borrow request:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a book is currently borrowed by the user
  const isBookBorrowed = (bookId) => {
    return borrowedBooks.some(
      borrow => borrow.book_id === parseInt(bookId) && 
                (borrow.status === 'pending' || borrow.status === 'approved')
    );
  };

  // Get borrow status for a specific book
  const getBorrowStatus = (bookId) => {
    const borrow = borrowedBooks.find(
      borrow => borrow.book_id === parseInt(bookId) && 
                (borrow.status === 'pending' || borrow.status === 'approved')
    );
    return borrow ? borrow.status : null;
  };

  // Get borrow record for a specific book
  const getBorrowRecord = (bookId) => {
    return borrowedBooks.find(
      borrow => borrow.book_id === parseInt(bookId) && 
                (borrow.status === 'pending' || borrow.status === 'approved')
    );
  };

  const value = {
    borrowedBooks,
    borrowRequests,
    isLoading,
    borrowBook,
    returnBook,
    approveBorrow,
    rejectBorrow,
    isBookBorrowed,
    getBorrowStatus,
    getBorrowRecord,
    fetchBorrowedBooks,
    fetchBorrowRequests
  };

  return (
    <BorrowContext.Provider value={value}>
      {children}
    </BorrowContext.Provider>
  );
};