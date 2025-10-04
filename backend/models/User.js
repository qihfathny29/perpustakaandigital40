const { getConnection } = require('../config/database');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.role = data.role;
        this.fullName = data.fullName || data.full_name;
        this.nis = data.nis;
        this.class = data.class;
        this.email = data.email;
        this.profileImage = data.profileImage || data.profile_image;
        this.createdAt = data.createdAt || data.created_at;
        this.updatedAt = data.updatedAt || data.updated_at;
    }

    // Get user by ID
    static async findById(id) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('id', id)
                .query(`
                    SELECT id, username, role, full_name, nis, class, email, 
                           profile_image, created_at, updated_at 
                    FROM users 
                    WHERE id = @id
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new User(result.recordset[0]);
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    // Get user by username
    static async findByUsername(username) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('username', username)
                .query(`
                    SELECT id, username, password, role, full_name, nis, class, email, 
                           profile_image, created_at, updated_at 
                    FROM users 
                    WHERE username = @username
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new User(result.recordset[0]);
        } catch (error) {
            console.error('Error finding user by username:', error);
            throw error;
        }
    }

    // Update user profile
    static async updateProfile(userId, profileData) {
        try {
            const pool = await getConnection();
            const { fullName, nis, class: userClass, email } = profileData;

            const result = await pool.request()
                .input('userId', userId)
                .input('fullName', fullName)
                .input('nis', nis)
                .input('class', userClass)
                .input('email', email)
                .query(`
                    UPDATE users 
                    SET full_name = @fullName,
                        nis = @nis,
                        class = @class,
                        email = @email,
                        updated_at = GETDATE()
                    OUTPUT INSERTED.id, INSERTED.username, INSERTED.role, 
                           INSERTED.full_name, INSERTED.nis, INSERTED.class, 
                           INSERTED.email, INSERTED.profile_image, 
                           INSERTED.created_at, INSERTED.updated_at
                    WHERE id = @userId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new User(result.recordset[0]);
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    // Update profile image
    static async updateProfileImage(userId, profileImagePath) {
        try {
            const pool = await getConnection();

            const result = await pool.request()
                .input('userId', userId)
                .input('profileImage', profileImagePath)
                .query(`
                    UPDATE users 
                    SET profile_image = @profileImage,
                        updated_at = GETDATE()
                    OUTPUT INSERTED.id, INSERTED.username, INSERTED.role, 
                           INSERTED.full_name, INSERTED.nis, INSERTED.class, 
                           INSERTED.email, INSERTED.profile_image, 
                           INSERTED.created_at, INSERTED.updated_at
                    WHERE id = @userId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new User(result.recordset[0]);
        } catch (error) {
            console.error('Error updating profile image:', error);
            throw error;
        }
    }

    // Create migration script for adding new columns
    static async createProfileColumns() {
        try {
            const pool = await getConnection();
            
            // Check if columns exist first
            const columnsCheck = await pool.request()
                .query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'users' 
                    AND COLUMN_NAME IN ('full_name', 'nis', 'class', 'email', 'profile_image', 'updated_at')
                `);

            const existingColumns = columnsCheck.recordset.map(row => row.COLUMN_NAME);
            
            const columnsToAdd = [
                { name: 'full_name', type: 'NVARCHAR(255)' },
                { name: 'nis', type: 'NVARCHAR(20)' },
                { name: 'class', type: 'NVARCHAR(50)' },
                { name: 'email', type: 'NVARCHAR(255)' },
                { name: 'profile_image', type: 'NVARCHAR(MAX)' },
                { name: 'updated_at', type: 'DATETIME2 DEFAULT GETDATE()' }
            ];

            for (const column of columnsToAdd) {
                if (!existingColumns.includes(column.name)) {
                    await pool.request()
                        .query(`ALTER TABLE users ADD ${column.name} ${column.type}`);
                    console.log(`✅ Added column: ${column.name}`);
                }
            }

            return true;
        } catch (error) {
            console.error('Error creating profile columns:', error);
            throw error;
        }
    }

    // Convert to JSON (remove password)
    toJSON() {
        const { password, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }
}

module.exports = User;
