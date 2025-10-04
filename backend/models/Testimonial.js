const { getConnection } = require('../config/database');

class Testimonial {
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId || data.user_id;
        this.username = data.username;
        this.content = data.content;
        this.rating = data.rating;
        this.bookId = data.bookId || data.book_id;
        this.bookTitle = data.bookTitle || data.book_title;
        this.photoPath = data.photoPath || data.photo_path;
        this.createdAt = data.createdAt || data.created_at;
        this.updatedAt = data.updatedAt || data.updated_at;
    }

    // Create new testimonial
    static async create(testimonialData) {
        try {
            const pool = await getConnection();
            
            // Build dynamic query based on available data
            let fields = ['user_id', 'content', 'rating', 'created_at', 'updated_at'];
            let values = ['@userId', '@content', '@rating', 'GETDATE()', 'GETDATE()'];
            let inputs = [
                { name: 'userId', value: testimonialData.userId },
                { name: 'content', value: testimonialData.content },
                { name: 'rating', value: testimonialData.rating }
            ];

            // Add optional fields
            if (testimonialData.bookId) {
                fields.push('book_id');
                values.push('@bookId');
                inputs.push({ name: 'bookId', value: testimonialData.bookId });
            }

            if (testimonialData.bookTitle) {
                fields.push('book_title');
                values.push('@bookTitle');
                inputs.push({ name: 'bookTitle', value: testimonialData.bookTitle });
            }

            if (testimonialData.photoPath) {
                fields.push('photo_path');
                values.push('@photoPath');
                inputs.push({ name: 'photoPath', value: testimonialData.photoPath });
            }

            // Build and execute query
            const request = pool.request();
            inputs.forEach(input => {
                request.input(input.name, input.value);
            });

            const query = `
                INSERT INTO testimonials (${fields.join(', ')}) 
                OUTPUT INSERTED.*
                VALUES (${values.join(', ')})
            `;

            const result = await request.query(query);

            if (result.recordset.length === 0) {
                throw new Error('Failed to create testimonial');
            }

            console.log('✅ Created testimonial:', result.recordset[0]);
            return new Testimonial(result.recordset[0]);
        } catch (error) {
            console.error('Error creating testimonial:', error);
            throw error;
        }
    }

    // Get all approved testimonials (for public display)
    static async findApproved() {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .query(`
                    SELECT t.*, u.username 
                    FROM testimonials t
                    LEFT JOIN users u ON t.user_id = u.id
                    ORDER BY t.created_at DESC
                `);

            return result.recordset.map(row => ({
                ...new Testimonial(row),
                username: row.username
            }));
        } catch (error) {
            console.error('Error finding approved testimonials:', error);
            throw error;
        }
    }

    // Get all testimonials (for admin)
    static async findAll() {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .query(`
                    SELECT t.*, u.username 
                    FROM testimonials t
                    LEFT JOIN users u ON t.user_id = u.id
                    ORDER BY t.created_at DESC
                `);

            return result.recordset.map(row => ({
                ...new Testimonial(row),
                username: row.username
            }));
        } catch (error) {
            console.error('Error finding all testimonials:', error);
            throw error;
        }
    }

    // Get testimonials by user ID
    static async findByUserId(userId) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT * FROM testimonials 
                    WHERE user_id = @userId
                    ORDER BY created_at DESC
                `);

            return result.recordset.map(row => new Testimonial(row));
        } catch (error) {
            console.error('Error finding testimonials by user ID:', error);
            throw error;
        }
    }

    // Update testimonial status (approve/reject)
    static async updateStatus(testimonialId, status) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('testimonialId', testimonialId)
                .input('status', status)
                .query(`
                    UPDATE testimonials 
                    SET status = @status, updated_at = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE id = @testimonialId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new Testimonial(result.recordset[0]);
        } catch (error) {
            console.error('Error updating testimonial status:', error);
            throw error;
        }
    }

    // Delete testimonial
    static async delete(testimonialId) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('testimonialId', testimonialId)
                .query(`
                    DELETE FROM testimonials 
                    OUTPUT DELETED.*
                    WHERE id = @testimonialId
                `);

            return result.recordset.length > 0;
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            throw error;
        }
    }

    // Create table if not exists
    static async createTable() {
        try {
            const pool = await getConnection();
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='testimonials' AND xtype='U')
                CREATE TABLE testimonials (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    book_title NVARCHAR(255) NOT NULL,
                    content NVARCHAR(MAX) NOT NULL,
                    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    photo_path NVARCHAR(500),
                    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
            console.log('✅ testimonials table created/verified');
            return true;
        } catch (error) {
            console.error('Error creating testimonials table:', error);
            throw error;
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            username: this.username,
            content: this.content,
            rating: this.rating,
            bookId: this.bookId,
            book_id: this.bookId, // Also include snake_case for compatibility
            bookTitle: this.bookTitle,
            book_title: this.bookTitle, // Also include snake_case for compatibility
            photoPath: this.photoPath,
            photo_path: this.photoPath, // Also include snake_case for compatibility
            createdAt: this.createdAt,
            created_at: this.createdAt, // Also include snake_case for compatibility
            updatedAt: this.updatedAt,
            updated_at: this.updatedAt // Also include snake_case for compatibility
        };
    }
}

module.exports = Testimonial;
