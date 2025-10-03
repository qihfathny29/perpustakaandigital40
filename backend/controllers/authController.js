const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

// Register user
const register = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Validation
        if (!username || !password || !role) {
            return res.status(400).json({
                status: 'error',
                message: 'Username, password, and role are required'
            });
        }

        // Validate role - Admin tidak bisa dibuat via register
        const validRoles = ['student', 'petugas'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid role. Only student and petugas are allowed for registration'
            });
        }

        // Extra security: Block admin role creation via API
        if (role === 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Admin accounts cannot be created through registration'
            });
        }

        const pool = await getConnection();

        // Check if user already exists
        const checkUser = await pool.request()
            .input('username', username)
            .query('SELECT id FROM users WHERE username = @username');

        if (checkUser.recordset.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Username already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert user
        const result = await pool.request()
            .input('username', username)
            .input('password', hashedPassword)
            .input('role', role)
            .query(`
                INSERT INTO users (username, password, role) 
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.role, INSERTED.created_at
                VALUES (@username, @password, @role)
            `);

        const newUser = result.recordset[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                username: newUser.username, 
                role: newUser.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    role: newUser.role,
                    createdAt: newUser.created_at
                },
                token
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username and password are required'
            });
        }

        const pool = await getConnection();

        // Find user
        const result = await pool.request()
            .input('username', username)
            .query('SELECT id, username, password, role FROM users WHERE username = @username');

        if (result.recordset.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid username or password'
            });
        }

        const user = result.recordset[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid username or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const pool = await getConnection();

        const result = await pool.request()
            .input('userId', userId)
            .query('SELECT id, username, role, created_at FROM users WHERE id = @userId');

        if (result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const user = result.recordset[0];

        res.json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    createdAt: user.created_at
                }
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
        const { username, email } = req.body;

        // Validation
        if (!username) {
            return res.status(400).json({
                status: 'error',
                message: 'Username is required'
            });
        }

        const pool = await getConnection();

        // Check if username already exists (exclude current user)
        const checkUser = await pool.request()
            .input('username', username)
            .input('userId', userId)
            .query('SELECT id FROM users WHERE username = @username AND id != @userId');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Username already exists'
            });
        }

        // Update user profile
        const updateQuery = `
            UPDATE users 
            SET username = @username
            WHERE id = @userId
        `;

        await pool.request()
            .input('username', username)
            .input('userId', userId)
            .query(updateQuery);

        // Get updated user data
        const result = await pool.request()
            .input('userId', userId)
            .query('SELECT id, username, role, created_at FROM users WHERE id = @userId');

        const user = result.recordset[0];

        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    createdAt: user.created_at
                }
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

module.exports = {
    register,
    login,
    getProfile,
    updateProfile
};