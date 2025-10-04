// Migration script untuk membuat table book_requests
const BookRequest = require('./models/BookRequest');

async function createBookRequestsTable() {
    try {
        console.log('🔄 Starting migration: Creating book_requests table...');
        
        await BookRequest.createTable();
        
        console.log('✅ Migration completed successfully!');
        console.log('📋 Created table: book_requests');
        console.log('   - id (INT, IDENTITY, PRIMARY KEY)');
        console.log('   - user_id (INT, FOREIGN KEY to users.id)');
        console.log('   - book_id (INT)');
        console.log('   - book_title (NVARCHAR(255))');
        console.log('   - notes (NVARCHAR(MAX))');
        console.log('   - status (NVARCHAR(20), DEFAULT pending)');
        console.log('   - request_date (DATETIME2)');
        console.log('   - reviewed_by (INT, FOREIGN KEY to users.id)');
        console.log('   - reviewed_at (DATETIME2)');
        console.log('   - created_at (DATETIME2)');
        console.log('   - updated_at (DATETIME2)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
createBookRequestsTable();