const { getConnection } = require('./config/database');

(async () => {
    try {
        const pool = await getConnection();
        console.log('Database connected successfully');
        
        // Check if book_requests table exists
        const result = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            AND TABLE_NAME = 'book_requests'
        `);
        
        if (result.recordset.length > 0) {
            console.log('✅ book_requests table exists');
            
            // Check table structure
            const structure = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'book_requests'
                ORDER BY ORDINAL_POSITION
            `);
            
            console.log('Table structure:');
            structure.recordset.forEach(col => {
                console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? '(nullable)' : '(not null)'}`);
            });
            
        } else {
            console.log('❌ book_requests table does NOT exist');
            console.log('Creating book_requests table...');
            
            // Create the table
            await pool.request().query(`
                CREATE TABLE book_requests (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    book_id INT NULL,
                    book_title NVARCHAR(255) NOT NULL,
                    notes NVARCHAR(MAX) NULL,
                    status NVARCHAR(50) DEFAULT 'pending',
                    request_date DATETIME DEFAULT GETDATE(),
                    reviewed_by INT NULL,
                    reviewed_at DATETIME NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (reviewed_by) REFERENCES users(id)
                )
            `);
            
            console.log('✅ book_requests table created successfully');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error);
        process.exit(1);
    }
})();