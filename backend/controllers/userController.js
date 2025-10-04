const { getConnection } = require('../config/database');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Setup multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/profiles';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `profile-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all users with statistics
const getAllUsers = async (req, res) => {
    try {
        const pool = await getConnection();

        // Query untuk ambil users dengan statistik
        const query = `
            SELECT 
                u.id,
                u.username,
                u.role,
                u.created_at,
                -- Count total peminjaman
                COUNT(DISTINCT bb_total.id) as total_pinjam,
                -- Count sedang dipinjam
                COUNT(DISTINCT bb_current.id) as sedang_dipinjam,
                -- Count terlambat (due_date < today dan status borrowed)
                COUNT(DISTINCT bb_late.id) as terlambat,
                -- Buku favorit (buku yang paling sering dipinjam)
                (
                    SELECT TOP 1 bb_fav.title 
                    FROM borrowed_books bb_fav 
                    WHERE bb_fav.user_id = u.id 
                    GROUP BY bb_fav.title 
                    ORDER BY COUNT(*) DESC
                ) as buku_favorit
            FROM users u
            LEFT JOIN borrowed_books bb_total ON u.id = bb_total.user_id
            LEFT JOIN borrowed_books bb_current ON u.id = bb_current.user_id 
                AND bb_current.status = 'borrowed'
            LEFT JOIN borrowed_books bb_late ON u.id = bb_late.user_id 
                AND bb_late.status = 'borrowed' 
                AND bb_late.due_date < CAST(GETDATE() AS DATE)
            WHERE u.role IN ('student', 'petugas')
            GROUP BY u.id, u.username, u.role, u.created_at
            ORDER BY u.created_at DESC
        `;

        const result = await pool.request().query(query);

        res.json({
            status: 'success',
            data: {
                users: result.recordset.map(user => ({
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    totalPinjam: user.total_pinjam || 0,
                    sedangDipinjam: user.sedang_dipinjam || 0,
                    terlambat: user.terlambat || 0,
                    bukuFavorit: user.buku_favorit || '-',
                    createdAt: user.created_at
                }))
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user by ID with detailed info
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const userQuery = `
            SELECT id, username, role, created_at 
            FROM users 
            WHERE id = @id
        `;

        const userResult = await pool.request()
            .input('id', id)
            .query(userQuery);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const user = userResult.recordset[0];

        // Get user's borrowing history
        const historyQuery = `
            SELECT id, book_id, title, author, borrow_date, due_date, return_date, status
            FROM borrowed_books 
            WHERE user_id = @id
            ORDER BY created_at DESC
        `;

        const historyResult = await pool.request()
            .input('id', id)
            .query(historyQuery);

        res.json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    createdAt: user.created_at
                },
                borrowHistory: historyResult.recordset
            }
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        // Check if user exists
        const checkUser = await pool.request()
            .input('id', id)
            .query('SELECT id, username, role FROM users WHERE id = @id');

        if (checkUser.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const user = checkUser.recordset[0];

        // Prevent deleting admin users
        if (user.role === 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Cannot delete admin users'
            });
        }

        // Delete user (CASCADE will handle related records)
        await pool.request()
            .input('id', id)
            .query('DELETE FROM users WHERE id = @id');

        res.json({
            status: 'success',
            message: `User ${user.username} deleted successfully`
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const pool = await getConnection();

        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role IN ('student', 'petugas')) as total_users,
                (SELECT COUNT(*) FROM books) as total_books,
                (SELECT COUNT(*) FROM borrowed_books WHERE status = 'borrowed') as total_borrowed,
                (SELECT COUNT(*) FROM borrowed_books WHERE status = 'pending') as total_pending,
                (SELECT COUNT(*) FROM borrowed_books WHERE status = 'borrowed' AND due_date < CAST(GETDATE() AS DATE)) as total_overdue
        `;

        const result = await pool.request().query(statsQuery);
        const stats = result.recordset[0];

        res.json({
            status: 'success',
            data: {
                totalUsers: stats.total_users || 0,
                totalBooks: stats.total_books || 0,
                totalBorrowed: stats.total_borrowed || 0,
                totalPending: stats.total_pending || 0,
                totalOverdue: stats.total_overdue || 0
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, nis, class: userClass, email } = req.body;

        // Validation
        if (!fullName || !nis || !userClass || !email) {
            return res.status(400).json({
                status: 'error',
                message: 'All profile fields are required'
            });
        }

        // Update profile
        const updatedUser = await User.updateProfile(userId, {
            fullName,
            nis,
            class: userClass,
            email
        });

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user: updatedUser.toJSON()
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update profile image
const updateProfileImage = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No image file provided'
            });
        }

        // Get the file path
        const profileImagePath = `/uploads/profiles/${req.file.filename}`;

        // Update profile image in database
        const updatedUser = await User.updateProfileImage(userId, profileImagePath);

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Profile image updated successfully',
            data: {
                user: updatedUser.toJSON(),
                profileImageUrl: `${req.protocol}://${req.get('host')}${profileImagePath}`
            }
        });

    } catch (error) {
        console.error('Update profile image error:', error);
        
        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    deleteUser,
    getDashboardStats,
    getProfile,
    updateProfile,
    updateProfileImage,
    upload
};
