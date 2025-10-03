const { getConnection } = require('../config/database');

// Get all books
const getAllBooks = async (req, res) => {
    try {
        const pool = await getConnection();
        
        const query = `
            SELECT 
                id,
                title,
                author,
                category,
                synopsis,
                image_url,
                stock,
                available,
                created_at,
                updated_at
            FROM books 
            ORDER BY created_at DESC
        `;

        const result = await pool.request().query(query);

        res.json({
            status: 'success',
            data: {
                books: result.recordset.map(book => ({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    category: book.category,
                    synopsis: book.synopsis,
                    imageUrl: book.image_url,
                    stock: book.stock,
                    available: book.available,
                    createdAt: book.created_at,
                    updatedAt: book.updated_at
                }))
            }
        });

    } catch (error) {
        console.error('Get all books error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get book by ID
const getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const query = `
            SELECT 
                id,
                title,
                author,
                category,
                synopsis,
                image_url,
                stock,
                available,
                created_at,
                updated_at
            FROM books 
            WHERE id = @id
        `;

        const result = await pool.request()
            .input('id', id)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        const book = result.recordset[0];

        res.json({
            status: 'success',
            data: {
                book: {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    category: book.category,
                    synopsis: book.synopsis,
                    imageUrl: book.image_url,
                    stock: book.stock,
                    available: book.available,
                    createdAt: book.created_at,
                    updatedAt: book.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Get book by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Create new book
const createBook = async (req, res) => {
    try {
        const { title, author, category, synopsis, imageUrl, stock } = req.body;

        // Validation
        if (!title || !author) {
            return res.status(400).json({
                status: 'error',
                message: 'Title and author are required'
            });
        }

        const pool = await getConnection();

        const query = `
            INSERT INTO books (title, author, category, synopsis, image_url, stock, available) 
            OUTPUT INSERTED.id, INSERTED.title, INSERTED.author, INSERTED.category, 
                   INSERTED.synopsis, INSERTED.image_url, INSERTED.stock, INSERTED.available,
                   INSERTED.created_at, INSERTED.updated_at
            VALUES (@title, @author, @category, @synopsis, @imageUrl, @stock, @available)
        `;

        const bookStock = parseInt(stock) || 0;
        const isAvailable = bookStock > 0;

        const result = await pool.request()
            .input('title', title)
            .input('author', author)
            .input('category', category || 'Fiksi')
            .input('synopsis', synopsis || '')
            .input('imageUrl', imageUrl || '')
            .input('stock', bookStock)
            .input('available', isAvailable)
            .query(query);

        const newBook = result.recordset[0];

        res.status(201).json({
            status: 'success',
            message: 'Book created successfully',
            data: {
                book: {
                    id: newBook.id,
                    title: newBook.title,
                    author: newBook.author,
                    category: newBook.category,
                    synopsis: newBook.synopsis,
                    imageUrl: newBook.image_url,
                    stock: newBook.stock,
                    available: newBook.available,
                    createdAt: newBook.created_at,
                    updatedAt: newBook.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update book
const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, category, synopsis, imageUrl, stock } = req.body;

        const pool = await getConnection();

        // Check if book exists
        const checkBook = await pool.request()
            .input('id', id)
            .query('SELECT id FROM books WHERE id = @id');

        if (checkBook.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        const bookStock = parseInt(stock) || 0;
        const isAvailable = bookStock > 0;

        const query = `
            UPDATE books 
            SET title = @title, 
                author = @author, 
                category = @category, 
                synopsis = @synopsis, 
                image_url = @imageUrl, 
                stock = @stock, 
                available = @available,
                updated_at = GETDATE()
            OUTPUT INSERTED.id, INSERTED.title, INSERTED.author, INSERTED.category, 
                   INSERTED.synopsis, INSERTED.image_url, INSERTED.stock, INSERTED.available,
                   INSERTED.created_at, INSERTED.updated_at
            WHERE id = @id
        `;

        const result = await pool.request()
            .input('id', id)
            .input('title', title)
            .input('author', author)
            .input('category', category)
            .input('synopsis', synopsis)
            .input('imageUrl', imageUrl)
            .input('stock', bookStock)
            .input('available', isAvailable)
            .query(query);

        const updatedBook = result.recordset[0];

        res.json({
            status: 'success',
            message: 'Book updated successfully',
            data: {
                book: {
                    id: updatedBook.id,
                    title: updatedBook.title,
                    author: updatedBook.author,
                    category: updatedBook.category,
                    synopsis: updatedBook.synopsis,
                    imageUrl: updatedBook.image_url,
                    stock: updatedBook.stock,
                    available: updatedBook.available,
                    createdAt: updatedBook.created_at,
                    updatedAt: updatedBook.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete book
const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        // Check if book exists
        const checkBook = await pool.request()
            .input('id', id)
            .query('SELECT id, title FROM books WHERE id = @id');

        if (checkBook.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        const book = checkBook.recordset[0];

        // Check if book is currently borrowed
        const checkBorrowed = await pool.request()
            .input('bookId', id)
            .query('SELECT COUNT(*) as count FROM borrowed_books WHERE book_id = @bookId AND status = \'borrowed\'');

        if (checkBorrowed.recordset[0].count > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete book that is currently borrowed'
            });
        }

        // Delete book
        await pool.request()
            .input('id', id)
            .query('DELETE FROM books WHERE id = @id');

        res.json({
            status: 'success',
            message: `Book "${book.title}" deleted successfully`
        });

    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get books statistics
const getBooksStats = async (req, res) => {
    try {
        const pool = await getConnection();

        const query = `
            SELECT 
                COUNT(*) as total_books,
                SUM(stock) as total_stock,
                COUNT(CASE WHEN available = 1 THEN 1 END) as available_books,
                COUNT(CASE WHEN available = 0 THEN 1 END) as unavailable_books,
                (SELECT COUNT(DISTINCT category) FROM books) as total_categories
            FROM books
        `;

        const result = await pool.request().query(query);
        const stats = result.recordset[0];

        res.json({
            status: 'success',
            data: {
                totalBooks: stats.total_books || 0,
                totalStock: stats.total_stock || 0,
                availableBooks: stats.available_books || 0,
                unavailableBooks: stats.unavailable_books || 0,
                totalCategories: stats.total_categories || 0
            }
        });

    } catch (error) {
        console.error('Get books stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    getBooksStats
};
