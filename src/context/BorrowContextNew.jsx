import { createContext, useState, useEffect, useContext } from 'react';
import { borrowAPI } from '../utils/api';
import { AuthContext } from './AuthContext';

export const BorrowContext = createContext();

export function BorrowProvider({ children }) {
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  // Fetch user's borrow history
  const fetchMyBorrows = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await borrowAPI.getMyBorrows();
      setBorrowedBooks(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch borrow history');
      console.error('Error fetching borrows:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all borrows (admin/petugas only)
  const fetchAllBorrows = async () => {
    if (!user || !['admin', 'petugas'].includes(user.role)) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await borrowAPI.getAll();
      setBorrowedBooks(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch all borrows');
      console.error('Error fetching all borrows:', err);
    } finally {
      setLoading(false);
    }
  };

  // Siswa melakukan request peminjaman
  const borrowBook = async (bookData) => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      // Calculate due date (14 days from now)
      const requestDate = new Date().toISOString();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const response = await borrowAPI.createRequest(
        bookData.id,
        requestDate,
        dueDate.toISOString()
      );

      if (response.success) {
        // Refresh borrow list
        await fetchMyBorrows();
        return true;
      } else {
        setError(response.message || 'Failed to create borrow request');
        return false;
      }
    } catch (err) {
      setError(err.message || 'Failed to create borrow request');
      console.error('Error creating borrow request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Admin/Petugas menyetujui peminjaman
  const approveBorrow = async (borrowId) => {
    if (!user || !['admin', 'petugas'].includes(user.role)) {
      setError('Unauthorized access');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await borrowAPI.approve(borrowId);
      
      if (response.success) {
        // Refresh borrow list
        await fetchAllBorrows();
        return true;
      } else {
        setError(response.message || 'Failed to approve borrow request');
        return false;
      }
    } catch (err) {
      setError(err.message || 'Failed to approve borrow request');
      console.error('Error approving borrow:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Admin/Petugas menolak peminjaman
  const rejectBorrow = async (borrowId, rejectionReason = '') => {
    if (!user || !['admin', 'petugas'].includes(user.role)) {
      setError('Unauthorized access');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await borrowAPI.reject(borrowId, rejectionReason);
      
      if (response.success) {
        // Refresh borrow list
        await fetchAllBorrows();
        return true;
      } else {
        setError(response.message || 'Failed to reject borrow request');
        return false;
      }
    } catch (err) {
      setError(err.message || 'Failed to reject borrow request');
      console.error('Error rejecting borrow:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Admin/Petugas memproses pengembalian
  const returnBook = async (borrowId) => {
    if (!user || !['admin', 'petugas'].includes(user.role)) {
      setError('Unauthorized access');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await borrowAPI.returnBook(borrowId);
      
      if (response.success) {
        // Refresh borrow list
        await fetchAllBorrows();
        return true;
      } else {
        setError(response.message || 'Failed to return book');
        return false;
      }
    } catch (err) {
      setError(err.message || 'Failed to return book');
      console.error('Error returning book:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      if (['admin', 'petugas'].includes(user.role)) {
        fetchAllBorrows();
      } else {
        fetchMyBorrows();
      }
    } else {
      setBorrowedBooks([]);
    }
  }, [user]);

  return (
    <BorrowContext.Provider value={{
      borrowedBooks,
      loading,
      error,
      borrowBook,
      returnBook,
      approveBorrow,
      rejectBorrow,
      fetchMyBorrows,
      fetchAllBorrows,
      setError
    }}>
      {children}
    </BorrowContext.Provider>
  );
}