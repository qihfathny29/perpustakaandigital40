import { createContext, useState, useEffect } from 'react';
import { books } from '../data/books';

export const BorrowContext = createContext();

export function BorrowProvider({ children }) {
  const [borrowedBooks, setBorrowedBooks] = useState(() => {
    const saved = localStorage.getItem('borrowedBooks');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('borrowedBooks', JSON.stringify(borrowedBooks));
  }, [borrowedBooks]);

  // Siswa melakukan request peminjaman (status pending, stok tidak berkurang)
  const borrowBook = (bookData, user) => {
    const bookIndex = books.findIndex(b => b.id.toString() === bookData.id.toString());
    if (bookIndex === -1) return false;

    // Cek apakah sudah ada request pending untuk buku ini oleh user yang sama
    const alreadyPending = borrowedBooks.some(
      b => b.userId === user.username && b.bookId === bookData.id && b.status === 'pending'
    );
    if (alreadyPending) return false;

    // Create borrow record (pending)
    const borrowRecord = {
      borrowId: `${Date.now()}-${user.username}`,
      userId: user.username,
      bookId: bookData.id,
      title: bookData.title,
      author: bookData.author,
      category: bookData.category,
      borrowDate: bookData.borrowDate,
      dueDate: bookData.dueDate,
      status: 'pending', // <--- status awal pending
      returnDate: null
    };

    setBorrowedBooks(prev => [...prev, borrowRecord]);
    return true;
  };

  // Admin menyetujui peminjaman (status jadi borrowed, stok baru berkurang)
  const approveBorrow = (borrowId) => {
    setBorrowedBooks(prev => prev.map(book => {
      if (book.borrowId === borrowId && book.status === 'pending') {
        // Kurangi stok buku
        const bookIndex = books.findIndex(b => b.id.toString() === book.bookId.toString());
        if (bookIndex !== -1 && books[bookIndex].stock > 0) {
          books[bookIndex].stock -= 1;
          if (books[bookIndex].stock === 0) {
            books[bookIndex].available = false;
          }
          localStorage.setItem('books', JSON.stringify(books));
        }
        return { ...book, status: 'borrowed' };
      }
      return book;
    }));
  };

  // Admin menolak peminjaman (hapus request)
  const rejectBorrow = (borrowId) => {
    setBorrowedBooks(prev => prev.filter(book => book.borrowId !== borrowId));
  };

  // Siswa mengembalikan buku (hanya jika status borrowed)
  const returnBook = (borrowId) => {
    const bookToReturn = borrowedBooks.find(book => book.borrowId === borrowId);
    if (!bookToReturn || bookToReturn.status !== 'borrowed') return false;

    // Update book stock
    const bookIndex = books.findIndex(b => b.id === bookToReturn.bookId);
    if (bookIndex !== -1) {
      books[bookIndex].stock += 1;
      books[bookIndex].available = true;
      localStorage.setItem('books', JSON.stringify(books));
    }

    // Update borrowed books
    setBorrowedBooks(prev => prev.map(book =>
      book.borrowId === borrowId
        ? {
            ...book,
            status: 'returned',
            returnDate: new Date().toISOString()
          }
        : book
    ));

    return true;
  };

  return (
    <BorrowContext.Provider value={{
      borrowedBooks,
      borrowBook,
      returnBook,
      approveBorrow,
      rejectBorrow
    }}>
      {children}
    </BorrowContext.Provider>
  );
}
