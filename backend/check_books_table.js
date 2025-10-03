const sql = require('mssql');

const config = {
  user: 'faqih29',
  password: 'cornettofaqih29!',
  server: 'DESKTOP-2983UFV\\SQLEXPRESS02',
  database: 'perpustakaan_digital',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkBooksTable() {
  try {
    await sql.connect(config);
    
    console.log('🔍 Checking books table structure...\n');
    
    // Check table columns
    const columns = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'books'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Books table columns:');
    columns.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}${length}, ${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n📊 Checking existing books...\n');
    
    // Check existing books (use only columns that exist)
    const books = await sql.query(`
      SELECT TOP 5 * FROM books 
      ORDER BY created_at DESC
    `);
    
    if (books.recordset.length === 0) {
      console.log('❌ No books found in database!');
    } else {
      console.log('✅ Found books:');
      books.recordset.forEach((book, index) => {
        console.log(`${index + 1}. Title: ${book.title}`);
        console.log(`   Author: ${book.author}`);
        console.log(`   Category: ${book.category}`);
        console.log(`   Created: ${book.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.close();
  }
}

checkBooksTable();