const { getConnection } = require('../config/database');
const sql = require('mssql');

// Create new borrow request
const createBorrowRequest = async (req, res) => {
    try {
        // Support both old format (request_date, due_date) and new format (borrowDate, dueDate)
        const { bookId, request_date, due_date, borrowDate: frontendBorrowDate, dueDate: frontendDueDate } = req.body;
        const userId = req.user.id;
        
        console.log('=== Borrow Request Debug ===');
        console.log('Request body:', req.body);
        console.log('bookId received:', bookId);
        console.log('bookId type:', typeof bookId);
        console.log('userId:', userId);
        console.log('userId type:', typeof userId);
        console.log('request_date:', request_date);
        console.log('due_date:', due_date);
        console.log('frontendBorrowDate:', frontendBorrowDate);
        console.log('frontendDueDate:', frontendDueDate);
        
        // Validate bookId - ensure it's a number
        const numericBookId = parseInt(bookId);
        if (isNaN(numericBookId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Book ID harus berupa angka yang valid'
            });
        }
        
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
            .input('bookId', numericBookId)
            .query('SELECT * FROM books WHERE id = @bookId');
            
        console.log('All books check result:', allBooksCheck.recordset);
        console.log('Found books count:', allBooksCheck.recordset.length);
        
        // Check if book exists and available
        const bookCheck = await pool.request()
            .input('bookId', numericBookId)
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
            .input('bookId', numericBookId)
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
        
        // FIXED: Properly handle datetime from frontend - USE ORIGINAL DATETIME STRINGS
        console.log('=== DATE PROCESSING V2 ===');
        console.log('frontendBorrowDate received:', frontendBorrowDate);
        console.log('frontendDueDate received:', frontendDueDate);
        console.log('request_date received:', request_date);
        console.log('due_date received:', due_date);
        
        // CRITICAL FIX V6: Force exact local datetime WITHOUT timezone conversion
        let borrowDateForSQL, dueDateForSQL;
        
        // Helper function to create exact local datetime without timezone conversion
        const convertToLocalDateTime = (dateString) => {
            if (!dateString) return null;
            console.log('🔄 V6 Converting dateString (no timezone conversion):', dateString);
            
            // Parse manually to avoid timezone conversion issues
            if (dateString.includes('T')) {
                let [datePart, timePart] = dateString.split('T');
                // Add seconds if not present
                if (timePart && timePart.split(':').length === 2) {
                    timePart += ':00';
                }
                
                // Parse date components
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second] = timePart ? timePart.split(':').map(Number) : [0, 0, 0];
                
                // Create Date object WITHOUT timezone conversion using local constructor
                const localDate = new Date(year, month - 1, day, hour, minute, second);
                console.log('📅 V6 Local Date object (no UTC):', localDate);
                console.log('📅 V6 Date components:', { year, month: month-1, day, hour, minute, second });
                
                return localDate;
            }
            
            // Fallback for other formats
            return new Date(dateString);
        };
        
        if (frontendBorrowDate || request_date) {
            borrowDateForSQL = convertToLocalDateTime(frontendBorrowDate || request_date);
            console.log('🚀 V6 Using borrowDate Local DateTime:', borrowDateForSQL);
        } else {
            borrowDateForSQL = new Date();
            console.log('🚀 V6 Generated borrowDate current time:', borrowDateForSQL);
        }
        
        if (frontendDueDate || due_date) {
            dueDateForSQL = convertToLocalDateTime(frontendDueDate || due_date);
            console.log('🚀 V6 Using dueDate Local DateTime:', dueDateForSQL);
        } else {
            // Default: current time + 8 hours (normal library usage)
            dueDateForSQL = new Date(Date.now() + 8 * 60 * 60 * 1000);
            console.log('🚀 V6 Generated dueDate +8 hours:', dueDateForSQL);
        }
        
        // 🔧 CRITICAL FIX: If datetime conversion failed, use current time + hours
        if (dueDateForSQL.getHours() === 0 && dueDateForSQL.getMinutes() === 0) {
            console.log('⚠️ WARNING: Detected midnight datetime, fixing to current time + duration');
            const now = new Date();
            dueDateForSQL = new Date(now.getTime() + 8 * 60 * 60 * 1000); // +8 hours from now
            console.log('🔧 FIXED dueDate to:', dueDateForSQL);
        }
        
        console.log('Final SQL borrowDate V6:', borrowDateForSQL);
        console.log('Final SQL dueDate V6:', dueDateForSQL);
        
        // 🔍 CRITICAL DEBUG: Check exact SQL Server input values
        console.log('🔍 SQL Server Input Debug:');
        console.log('   borrowDate for SQL:', borrowDateForSQL.toISOString());
        console.log('   dueDate for SQL:', dueDateForSQL.toISOString());
        console.log('   borrowDate local string:', borrowDateForSQL.toString());
        console.log('   dueDate local string:', dueDateForSQL.toString());
        console.log('=== END DATE PROCESSING V6 ===');
        
        // Create borrow request - USE EXPLICIT STRING FORMAT FOR SQL SERVER
        // Convert to SQL Server compatible format: 'YYYY-MM-DD HH:MM:SS'
        const borrowDateSQL = borrowDateForSQL.toISOString().slice(0, 19).replace('T', ' ');
        const dueDateSQL = dueDateForSQL.toISOString().slice(0, 19).replace('T', ' ');
        
        console.log('🔍 SQL Server String Format:');
        console.log('   borrowDateSQL:', borrowDateSQL);
        console.log('   dueDateSQL:', dueDateSQL);
        
        const insertResult = await pool.request()
            .input('borrowId', borrowId)
            .input('userId', userId)
            .input('bookId', numericBookId)
            .input('title', book.title)
            .input('author', book.author)
            .input('category', book.category)
            .input('borrowDate', sql.VarChar, borrowDateSQL)
            .input('dueDate', sql.VarChar, dueDateSQL)
            .input('status', 'pending')
            .query(`
                INSERT INTO borrowed_books (
                    borrow_id, user_id, book_id, title, author, category,
                    borrow_date, due_date, status, created_at, updated_at
                ) VALUES (
                    @borrowId, @userId, @bookId, @title, @author, @category,
                    CONVERT(DATETIME, @borrowDate, 120), CONVERT(DATETIME, @dueDate, 120), @status, GETDATE(), GETDATE()
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
                dueDate: dueDateForSQL
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
                    u.username, u.full_name, u.nis
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
                        username: borrow.username,
                        fullName: borrow.full_name,
                        nis: borrow.nis
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
                `);            await transaction.commit();
            
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

// Confirm pickup (Admin only) - Change from 'approved' to 'borrowed'
const confirmPickup = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        // Get approved borrow request
        const borrowResult = await pool.request()
            .input('id', id)
            .query('SELECT * FROM borrowed_books WHERE id = @id AND status = \'approved\'');
            
        if (borrowResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Permintaan pickup tidak ditemukan atau sudah diproses'
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
            // Update borrow status to borrowed (actual pickup confirmed)
            await transaction.request()
                .input('id', id)
                .query(`
                    UPDATE borrowed_books 
                    SET status = 'borrowed', updated_at = GETDATE()
                    WHERE id = @id
                `);
                
            // Now decrease book stock since pickup is confirmed
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
                message: 'Pickup berhasil dikonfirmasi'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Confirm pickup error:', error);
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
        const userId = req.user.userId;
        const userRole = req.user.role;
        const pool = await getConnection();
        
        // Get borrowed book by borrow_id (not id)
        const borrowResult = await pool.request()
            .input('borrowId', id) // id parameter is actually borrow_id from frontend
            .query('SELECT * FROM borrowed_books WHERE borrow_id = @borrowId AND status = \'borrowed\'');
            
        if (borrowResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Peminjaman tidak ditemukan atau sudah dikembalikan'
            });
        }
        
        const borrow = borrowResult.recordset[0];
        
        // Check if user owns this borrow (unless admin/petugas)
        if (userRole !== 'admin' && userRole !== 'petugas' && borrow.user_id !== userId) {
            return res.status(403).json({
                status: 'error',
                message: 'Anda hanya bisa mengembalikan buku yang Anda pinjam sendiri'
            });
        }
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Update borrow status to returned using borrow_id
            await transaction.request()
                .input('borrowId', id) // id parameter is actually borrow_id from frontend
                .input('returnDate', new Date())
                .query(`
                    UPDATE borrowed_books 
                    SET status = 'returned', return_date = @returnDate, updated_at = GETDATE()
                    WHERE borrow_id = @borrowId
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

// Get borrow statistics per month
const getBorrowStats = async (req, res) => {
    try {
        const pool = await getConnection();
        
        // Query untuk mendapatkan data peminjaman per bulan dalam 12 bulan terakhir
        const query = `
            WITH MonthlyStats AS (
                SELECT 
                    YEAR(borrow_date) as year,
                    MONTH(borrow_date) as month,
                    DATENAME(MONTH, borrow_date) as month_name,
                    COUNT(*) as borrow_count
                FROM borrowed_books 
                WHERE borrow_date >= DATEADD(MONTH, -12, GETDATE())
                GROUP BY YEAR(borrow_date), MONTH(borrow_date), DATENAME(MONTH, borrow_date)
            )
            SELECT 
                year,
                month,
                month_name,
                borrow_count
            FROM MonthlyStats
            ORDER BY year, month
        `;

        const result = await pool.request().query(query);

        // Format data untuk chart
        const chartData = result.recordset.map(row => ({
            label: `${row.month_name} ${row.year}`,
            month: row.month,
            year: row.year,
            count: row.borrow_count
        }));

        res.json({
            status: 'success',
            data: {
                borrowStats: chartData
            }
        });

    } catch (error) {
        console.error('Get borrow stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get borrow status statistics (borrowed, returned, overdue)
const getBorrowStatusStats = async (req, res) => {
    try {
        const pool = await getConnection();
        const { startDate, endDate } = req.query;
        
        let whereClause = '';
        if (startDate && endDate) {
            whereClause = `WHERE (borrow_date >= '${startDate}' AND borrow_date <= '${endDate}') 
                          OR (return_date >= '${startDate}' AND return_date <= '${endDate}')`;
        }
        
        const query = `
            SELECT 
                status,
                COUNT(*) as count,
                CASE 
                    WHEN status = 'borrowed' AND due_date < GETDATE() THEN 'overdue'
                    ELSE status
                END as actual_status
            FROM borrowed_books 
            ${whereClause}
            GROUP BY status, 
                CASE 
                    WHEN status = 'borrowed' AND due_date < GETDATE() THEN 'overdue'
                    ELSE status
                END
        `;

        const result = await pool.request().query(query);

        // Process data untuk chart
        const statusCount = {
            borrowed: 0,
            returned: 0,
            overdue: 0,
            pending: 0
        };

        result.recordset.forEach(row => {
            if (row.actual_status === 'overdue') {
                statusCount.overdue += row.count;
            } else {
                statusCount[row.status] = row.count;
            }
        });

        const chartData = [
            { label: 'Sedang Dipinjam', count: statusCount.borrowed, color: '#3b82f6' },
            { label: 'Sudah Dikembalikan', count: statusCount.returned, color: '#10b981' },
            { label: 'Terlambat', count: statusCount.overdue, color: '#ef4444' },
            { label: 'Menunggu Persetujuan', count: statusCount.pending, color: '#f59e0b' }
        ];

        res.json({
            status: 'success',
            data: {
                statusStats: chartData
            }
        });

    } catch (error) {
        console.error('Get borrow status stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get return trend statistics per month
const getReturnTrendStats = async (req, res) => {
    try {
        const pool = await getConnection();
        
        const query = `
            WITH Last6Months AS (
                SELECT 
                    YEAR(DATEADD(MONTH, number-5, GETDATE())) as year,
                    MONTH(DATEADD(MONTH, number-5, GETDATE())) as month,
                    DATENAME(MONTH, DATEADD(MONTH, number-5, GETDATE())) as month_name
                FROM master.dbo.spt_values 
                WHERE type = 'P' AND number BETWEEN 0 AND 5
            ),
            MonthlyReturnStats AS (
                SELECT 
                    YEAR(return_date) as year,
                    MONTH(return_date) as month,
                    COUNT(*) as return_count
                FROM borrowed_books 
                WHERE return_date IS NOT NULL 
                    AND return_date >= DATEADD(MONTH, -5, GETDATE())
                GROUP BY YEAR(return_date), MONTH(return_date)
            ),
            MonthlyBorrowStats AS (
                SELECT 
                    YEAR(borrow_date) as year,
                    MONTH(borrow_date) as month,
                    COUNT(*) as borrow_count
                FROM borrowed_books 
                WHERE borrow_date >= DATEADD(MONTH, -5, GETDATE())
                GROUP BY YEAR(borrow_date), MONTH(borrow_date)
            )
            SELECT 
                l.year,
                l.month,
                l.month_name,
                COALESCE(r.return_count, 0) as return_count,
                COALESCE(b.borrow_count, 0) as borrow_count
            FROM Last6Months l
            LEFT JOIN MonthlyReturnStats r ON l.year = r.year AND l.month = r.month
            LEFT JOIN MonthlyBorrowStats b ON l.year = b.year AND l.month = b.month
            ORDER BY l.year, l.month
        `;

        const result = await pool.request().query(query);

        console.log('🔧 Debug getReturnTrendStats result:', result.recordset);

        // Format data untuk chart
        const chartData = {
            labels: result.recordset.map(row => `${row.month_name} ${row.year}`),
            datasets: [
                {
                    label: 'Dikembalikan',
                    data: result.recordset.map(row => row.return_count),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.3
                },
                {
                    label: 'Dipinjam',
                    data: result.recordset.map(row => row.borrow_count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.3
                }
            ]
        };

        console.log('🔧 Debug chartData:', JSON.stringify(chartData, null, 2));

        res.json({
            status: 'success',
            data: {
                trendStats: chartData
            }
        });

    } catch (error) {
        console.error('Get return trend stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Direct borrow by petugas (skip approval process)
const createDirectBorrow = async (req, res) => {
    try {
        const { bookId, userId, dueDate } = req.body;
        const staffId = req.user.id;
        const staffRole = req.user.role;
        
        console.log('=== Direct Borrow Debug ===');
        console.log('Request body:', req.body);
        console.log('bookId:', bookId);
        console.log('userId:', userId);
        console.log('staffId:', staffId);
        console.log('staffRole:', staffRole);
        
        // Only petugas and admin can do direct borrowing
        if (staffRole !== 'petugas' && staffRole !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Hanya petugas dan admin yang dapat melakukan peminjaman langsung'
            });
        }
        
        const pool = await getConnection();
        
        // Check if book exists and available
        const bookResult = await pool.request()
            .input('bookId', bookId)
            .query('SELECT * FROM books WHERE id = @bookId AND available = 1 AND stock > 0');
            
        if (bookResult.recordset.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Buku tidak tersedia untuk dipinjam'
            });
        }
        
        const book = bookResult.recordset[0];
        
        // Check if user exists and is a student
        const userResult = await pool.request()
            .input('userId', userId)
            .query('SELECT * FROM users WHERE id = @userId AND role = \'student\'');
            
        if (userResult.recordset.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'User tidak ditemukan atau bukan student'
            });
        }
        
        // Calculate due date (default 7 days if not provided)
        const borrowDate = new Date();
        const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Generate unique borrow ID
        const borrowId = 'BR' + Date.now();
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Create borrow record with 'borrowed' status (skip pending)
            await transaction.request()
                .input('borrowId', borrowId)
                .input('bookId', bookId)
                .input('userId', userId)
                .input('title', book.title)
                .input('author', book.author)
                .input('category', book.category)
                .input('borrowDate', borrowDate)
                .input('dueDate', calculatedDueDate)
                .query(`
                    INSERT INTO borrowed_books 
                    (borrow_id, book_id, user_id, title, author, category, borrow_date, due_date, status, created_at, updated_at)
                    VALUES 
                    (@borrowId, @bookId, @userId, @title, @author, @category, @borrowDate, @dueDate, 'borrowed', GETDATE(), GETDATE())
                `);
            
            // Decrease book stock
            await transaction.request()
                .input('bookId', bookId)
                .query(`
                    UPDATE books 
                    SET stock = stock - 1,
                        available = CASE WHEN stock - 1 <= 0 THEN 0 ELSE 1 END,
                        updated_at = GETDATE()
                    WHERE id = @bookId
                `);
                
            await transaction.commit();
            
            console.log('Direct borrow completed successfully:', borrowId);
            
            res.json({
                status: 'success',
                message: 'Peminjaman langsung berhasil diproses',
                data: {
                    borrowId,
                    bookTitle: book.title,
                    studentName: userResult.recordset[0].full_name || userResult.recordset[0].username,
                    dueDate: calculatedDueDate.toISOString()
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Direct borrow error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// ...existing code...

// Delete borrow record (Student can only delete their own completed records)
const deleteBorrowRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        console.log('=== Delete Borrow Record Debug ===');
        console.log('Record ID:', id);
        console.log('User ID:', userId);
        console.log('User Role:', userRole);
        
        const pool = await getConnection();
        
        let whereClause = 'WHERE id = @id';
        let request = pool.request().input('id', id);
        
        // Students can only delete their own records, admin/petugas can delete any
        if (userRole === 'student') {
            whereClause += ' AND user_id = @userId AND status IN (\'returned\', \'rejected\')';
            request = request.input('userId', userId);
        } else if (userRole === 'admin' || userRole === 'petugas') {
            // Admin/petugas can delete any completed record
            whereClause += ' AND status IN (\'returned\', \'rejected\')';
        } else {
            return res.status(403).json({
                status: 'error',
                message: 'Anda tidak memiliki akses untuk menghapus record'
            });
        }
        
        // Check if record exists and meets criteria
        const checkResult = await request.query(`
            SELECT * FROM borrowed_books ${whereClause}
        `);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: userRole === 'student' ? 
                    'Record tidak ditemukan, bukan milik Anda, atau belum selesai' :
                    'Record tidak ditemukan atau belum selesai'
            });
        }
        
        // Delete the record - create new request with all needed parameters
        let deleteRequest = pool.request().input('id', id);
        
        // Add userId parameter if needed for student role
        if (userRole === 'student') {
            deleteRequest = deleteRequest.input('userId', userId);
        }
        
        const deleteResult = await deleteRequest.query(`DELETE FROM borrowed_books ${whereClause}`);
            
        if (deleteResult.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Gagal menghapus record'
            });
        }
        
        console.log('Record deleted successfully:', id);
        
        res.json({
            status: 'success',
            message: 'Record berhasil dihapus'
        });
        
    } catch (error) {
        console.error('Delete borrow record error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Clear all completed records for current user (Student only)
const clearMyHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (userRole !== 'student') {
            return res.status(403).json({
                status: 'error',
                message: 'Fitur ini khusus untuk student'
            });
        }
        
        console.log('=== Clear History Debug ===');
        console.log('User ID:', userId);
        
        const pool = await getConnection();
        
        // Delete all completed records for this user
        const result = await pool.request()
            .input('userId', userId)
            .query(`
                DELETE FROM borrowed_books 
                WHERE user_id = @userId AND status IN ('returned', 'rejected')
            `);
        
        console.log('Cleared records count:', result.rowsAffected[0]);
        
        res.json({
            status: 'success',
            message: `Berhasil menghapus ${result.rowsAffected[0]} record dari history Anda`,
            deletedCount: result.rowsAffected[0]
        });
        
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Bulk delete selected records
const bulkDeleteRecords = async (req, res) => {
    try {
        const { recordIds } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Record IDs harus berupa array dan tidak boleh kosong'
            });
        }
        
        console.log('=== Bulk Delete Debug ===');
        console.log('User ID:', userId);
        console.log('User Role:', userRole);
        console.log('Record IDs:', recordIds);
        
        const pool = await getConnection();
        
        let whereClause = 'WHERE id IN (';
        const placeholders = recordIds.map((_, index) => `@id${index}`).join(',');
        whereClause += placeholders + ')';
        
        let request = pool.request();
        recordIds.forEach((id, index) => {
            request = request.input(`id${index}`, id);
        });
        
        // Students can only delete their own completed records
        if (userRole === 'student') {
            whereClause += ' AND user_id = @userId AND status IN (\'returned\', \'rejected\')';
            request = request.input('userId', userId);
        } else if (userRole === 'admin' || userRole === 'petugas') {
            whereClause += ' AND status IN (\'returned\', \'rejected\')';
        } else {
            return res.status(403).json({
                status: 'error',
                message: 'Anda tidak memiliki akses untuk bulk delete'
            });
        }
        
        const deleteQuery = `DELETE FROM borrowed_books ${whereClause}`;
        console.log('Bulk delete query:', deleteQuery);
        
        const result = await request.query(deleteQuery);
        
        res.json({
            status: 'success',
            message: `Berhasil menghapus ${result.rowsAffected[0]} record`,
            deletedCount: result.rowsAffected[0]
        });
        
    } catch (error) {
        console.error('Bulk delete error:', error);
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
    confirmPickup,
    returnBook,
    getBorrowStats,
    getBorrowStatusStats,
    getReturnTrendStats,
    createDirectBorrow,
    deleteBorrowRecord,
    clearMyHistory,
    bulkDeleteRecords
};