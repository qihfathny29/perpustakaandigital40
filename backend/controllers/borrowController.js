const { getConnection } = require('../config/database');

// Create new borrow request
const createBorrowRequest = async (req, res) => {
    try {
        const { bookId, request_date, due_date } = req.body;
        const userId = req.user.id;
        
        console.log('=== Borrow Request Debug ===');
        console.log('Request body:', req.body);
        console.log('bookId received:', bookId);
        console.log('bookId type:', typeof bookId);
        console.log('userId:', userId);
        console.log('userId type:', typeof userId);
        console.log('request_date:', request_date);
        console.log('due_date:', due_date);
        
        // Validate userId
        if (!userId || userId === null || userId === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID tidak valid'
            });
        }
        
        const pool = await getConnection();
        
        // First check if book exists at all
        const allBooksCheck = await pool.request()
            .input('bookId', bookId)
            .query('SELECT * FROM books WHERE id = @bookId');
            
        console.log('All books check result:', allBooksCheck.recordset);
        console.log('Found books count:', allBooksCheck.recordset.length);
        
        // Check if book exists and available
        const bookCheck = await pool.request()
            .input('bookId', bookId)
            .query('SELECT * FROM books WHERE id = @bookId AND available = 1 AND stock > 0');
            
        console.log('Available book check result:', bookCheck.recordset);
        console.log('Available books count:', bookCheck.recordset.length);
            
        if (bookCheck.recordset.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Buku tidak tersedia untuk dipinjam'
            });
        }
        
        const book = bookCheck.recordset[0];
        
        // Check if user already has pending/active borrow for this book
        const existingBorrow = await pool.request()
            .input('userId', userId)
            .input('bookId', bookId)
            .query(`
                SELECT * FROM borrowed_books 
                WHERE user_id = @userId AND book_id = @bookId 
                AND user_id IS NOT NULL
                AND status IN ('pending', 'approved')
            `);
            
        console.log('Existing borrow check result:', existingBorrow.recordset);
        console.log('Found existing borrows:', existingBorrow.recordset.length);
            
        if (existingBorrow.recordset.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Anda sudah memiliki peminjaman aktif untuk buku ini'
            });
        }
        
        // Generate unique borrow ID
        const borrowId = 'BRW' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        // Use provided dates or default to current date + 14 days
        const borrowDate = request_date ? new Date(request_date) : new Date();
        const dueDate = due_date ? new Date(due_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        
        // Create borrow request
        const insertResult = await pool.request()
            .input('borrowId', borrowId)
            .input('userId', userId)
            .input('bookId', bookId)
            .input('title', book.title)
            .input('author', book.author)
            .input('category', book.category)
            .input('borrowDate', borrowDate)
            .input('dueDate', dueDate)
            .input('status', 'pending')
            .query(`
                INSERT INTO borrowed_books (
                    borrow_id, user_id, book_id, title, author, category,
                    borrow_date, due_date, status, created_at, updated_at
                ) VALUES (
                    @borrowId, @userId, @bookId, @title, @author, @category,
                    @borrowDate, @dueDate, @status, GETDATE(), GETDATE()
                )
            `);
            
        console.log('Insert result:', insertResult);
        console.log('Borrow record created successfully with ID:', borrowId);
            
        res.json({
            status: 'success',
            message: 'Permintaan peminjaman berhasil dibuat',
            data: {
                borrowId,
                bookTitle: book.title,
                dueDate: dueDate.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Create borrow request error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user's borrow history
const getUserBorrows = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('=== getUserBorrows Debug ===');
        console.log('userId:', userId);
        
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT 
                    id, borrow_id, book_id, title, author, category,
                    borrow_date, due_date, return_date, status,
                    created_at, updated_at
                FROM borrowed_books 
                WHERE user_id = @userId 
                ORDER BY created_at DESC
            `);
            
        console.log('getUserBorrows - Raw query result:', result.recordset);
        console.log('getUserBorrows - Found', result.recordset.length, 'records');
            
        res.json({
            status: 'success',
            data: {
                borrows: result.recordset.map(borrow => ({
                    id: borrow.id,
                    borrowId: borrow.borrow_id,
                    bookId: borrow.book_id,
                    title: borrow.title,
                    author: borrow.author,
                    category: borrow.category,
                    borrowDate: borrow.borrow_date,
                    dueDate: borrow.due_date,
                    returnDate: borrow.return_date,
                    status: borrow.status,
                    createdAt: borrow.created_at,
                    updatedAt: borrow.updated_at
                }))
            }
        });
        
    } catch (error) {
        console.error('Get user borrows error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all borrow requests (Admin only)
const getAllBorrows = async (req, res) => {
    try {
        const pool = await getConnection();
        
        const result = await pool.request()
            .query(`
                SELECT 
                    bb.id, bb.borrow_id, bb.book_id, bb.title, bb.author, bb.category,
                    bb.borrow_date, bb.due_date, bb.return_date, bb.status,
                    bb.created_at, bb.updated_at,
                    u.username
                FROM borrowed_books bb
                JOIN users u ON bb.user_id = u.id
                ORDER BY bb.created_at DESC
            `);
            
        res.json({
            status: 'success',
            data: {
                borrows: result.recordset.map(borrow => ({
                    id: borrow.id,
                    borrowId: borrow.borrow_id,
                    bookId: borrow.book_id,
                    title: borrow.title,
                    author: borrow.author,
                    category: borrow.category,
                    borrowDate: borrow.borrow_date,
                    dueDate: borrow.due_date,
                    returnDate: borrow.return_date,
                    status: borrow.status,
                    createdAt: borrow.created_at,
                    updatedAt: borrow.updated_at,
                    user: {
                        username: borrow.username
                    }
                }))
            }
        });
        
    } catch (error) {
        console.error('Get all borrows error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Approve borrow request (Admin only)
const approveBorrowRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        // Get borrow request
        const borrowResult = await pool.request()
            .input('id', id)
            .query('SELECT * FROM borrowed_books WHERE id = @id AND status = \'pending\'');
            
        if (borrowResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Permintaan peminjaman tidak ditemukan atau sudah diproses'
            });
        }
        
        const borrow = borrowResult.recordset[0];
        
        // Check book availability
        const bookResult = await pool.request()
            .input('bookId', borrow.book_id)
            .query('SELECT stock FROM books WHERE id = @bookId AND available = 1');
            
        if (bookResult.recordset.length === 0 || bookResult.recordset[0].stock <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Buku tidak tersedia'
            });
        }
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Update borrow status to borrowed
            await transaction.request()
                .input('id', id)
                .query(`
                    UPDATE borrowed_books 
                    SET status = 'borrowed', updated_at = GETDATE()
                    WHERE id = @id
                `);
                
            // Decrease book stock
            await transaction.request()
                .input('bookId', borrow.book_id)
                .query(`
                    UPDATE books 
                    SET stock = stock - 1,
                        available = CASE WHEN stock - 1 <= 0 THEN 0 ELSE 1 END,
                        updated_at = GETDATE()
                    WHERE id = @bookId
                `);
                
            await transaction.commit();
            
            res.json({
                status: 'success',
                message: 'Permintaan peminjaman disetujui'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Approve borrow request error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Reject borrow request (Admin only)
const rejectBorrowRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('id', id)
            .query(`
                UPDATE borrowed_books 
                SET status = 'rejected', updated_at = GETDATE()
                WHERE id = @id AND status = 'pending'
            `);
            
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Permintaan peminjaman tidak ditemukan atau sudah diproses'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Permintaan peminjaman ditolak'
        });
        
    } catch (error) {
        console.error('Reject borrow request error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Return book (Admin only)
const returnBook = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        // Get borrowed book
        const borrowResult = await pool.request()
            .input('id', id)
            .query('SELECT * FROM borrowed_books WHERE id = @id AND status = \'borrowed\'');
            
        if (borrowResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Peminjaman tidak ditemukan atau sudah dikembalikan'
            });
        }
        
        const borrow = borrowResult.recordset[0];
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Update borrow status to returned
            await transaction.request()
                .input('id', id)
                .input('returnDate', new Date())
                .query(`
                    UPDATE borrowed_books 
                    SET status = 'returned', return_date = @returnDate, updated_at = GETDATE()
                    WHERE id = @id
                `);
                
            // Increase book stock
            await transaction.request()
                .input('bookId', borrow.book_id)
                .query(`
                    UPDATE books 
                    SET stock = stock + 1, available = 1, updated_at = GETDATE()
                    WHERE id = @bookId
                `);
                
            await transaction.commit();
            
            res.json({
                status: 'success',
                message: 'Buku berhasil dikembalikan'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    createBorrowRequest,
    getUserBorrows,
    getAllBorrows,
    approveBorrowRequest,
    rejectBorrowRequest,
    returnBook
};