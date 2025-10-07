const { getConnection } = require('../config/database');

class BookRequest {
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId || data.user_id;
        this.bookTitle = data.bookTitle || data.book_title;
        this.author = data.author;
        this.reason = data.reason;
        this.status = data.status || 'pending'; // pending, approved, rejected
        this.adminNotes = data.adminNotes || data.admin_notes;
        this.createdAt = data.createdAt || data.created_at;
        this.updatedAt = data.updatedAt || data.updated_at;
    }

    // Create new book request
    static async create(requestData) {
        try {
            const pool = await getConnection();
            const { userId, bookTitle, author, reason } = requestData;

            const result = await pool.request()
                .input('userId', userId)
                .input('bookTitle', bookTitle)
                .input('author', author || '')
                .input('reason', reason || '')
                .query(`
                    INSERT INTO book_requests (user_id, book_title, author, reason, status, created_at, updated_at)
                    OUTPUT INSERTED.*
                    VALUES (@userId, @bookTitle, @author, @reason, 'pending', GETDATE(), GETDATE())
                `);

            return new BookRequest(result.recordset[0]);
        } catch (error) {
            console.error('Error creating book request:', error);
            throw error;
        }
    }

    // Get requests by user ID
    static async findByUserId(userId) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT * FROM book_requests 
                    WHERE user_id = @userId 
                    ORDER BY created_at DESC
                `);

            return result.recordset.map(row => new BookRequest(row));
        } catch (error) {
            console.error('Error finding book requests by user ID:', error);
            throw error;
        }
    }

    // Get all requests (for admin)
    static async findAll() {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .query(`
                    SELECT br.*, u.username, u.full_name, u.nis
                    FROM book_requests br
                    LEFT JOIN users u ON br.user_id = u.id
                    ORDER BY br.created_at DESC
                `);

            return result.recordset.map(row => ({
                ...new BookRequest(row),
                username: row.username,
                userName: row.full_name || row.username,
                userNis: row.nis
            }));
        } catch (error) {
            console.error('Error finding all book requests:', error);
            throw error;
        }
    }

    // Update request status
    static async updateStatus(requestId, status, reviewedBy, adminNotes = null) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('requestId', requestId)
                .input('status', status)
                .input('adminNotes', adminNotes)
                .query(`
                    UPDATE book_requests 
                    SET status = @status,
                        admin_notes = COALESCE(@adminNotes, admin_notes),
                        updated_at = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE id = @requestId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            console.log('✅ Updated book request:', result.recordset[0]);
            return new BookRequest(result.recordset[0]);
        } catch (error) {
            console.error('Error updating book request status:', error);
            throw error;
        }
    }

    // Delete request
    static async delete(requestId) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('requestId', requestId)
                .query(`
                    DELETE FROM book_requests 
                    OUTPUT DELETED.*
                    WHERE id = @requestId
                `);

            return result.recordset.length > 0;
        } catch (error) {
            console.error('Error deleting book request:', error);
            throw error;
        }
    }

    // Create table if not exists
    static async createTable() {
        try {
            const pool = await getConnection();
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='book_requests' AND xtype='U')
                CREATE TABLE book_requests (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    book_id INT,
                    book_title NVARCHAR(255) NOT NULL,
                    notes NVARCHAR(MAX),
                    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    request_date DATETIME2 DEFAULT GETDATE(),
                    reviewed_by INT,
                    reviewed_at DATETIME2,
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (reviewed_by) REFERENCES users(id)
                )
            `);
            console.log('✅ book_requests table created/verified');
            return true;
        } catch (error) {
            console.error('Error creating book_requests table:', error);
            throw error;
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            bookTitle: this.bookTitle,
            author: this.author,
            reason: this.reason,
            status: this.status,
            adminNotes: this.adminNotes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = BookRequest;
