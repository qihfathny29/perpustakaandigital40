// Migration script untuk menambahkan kolom profile ke users table
const User = require('./models/User');

async function migrateProfileColumns() {
    try {
        console.log('🔄 Starting migration: Adding profile columns to users table...');
        
        await User.createProfileColumns();
        
        console.log('✅ Migration completed successfully!');
        console.log('📋 Added columns:');
        console.log('   - full_name (NVARCHAR(255))');
        console.log('   - nis (NVARCHAR(20))');
        console.log('   - class (NVARCHAR(50))');
        console.log('   - email (NVARCHAR(255))');
        console.log('   - profile_image (NVARCHAR(MAX))');
        console.log('   - updated_at (DATETIME2)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateProfileColumns();