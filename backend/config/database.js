/* eslint-disable */
require('dotenv').config();
const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false, // Set to true if using Azure
        trustServerCertificate: true, // For local development
        enableArithAbort: true,
        instanceName: process.env.DB_INSTANCE // Untuk SQL Server Express
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Test connection function
async function testConnection() {
    try {
        const pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server successfully!');
        console.log(`📍 Server: ${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`);
        console.log(`🗃️  Database: ${process.env.DB_DATABASE}`);
        return pool;
    } catch (err) {
        console.error('❌ SQL Server connection failed:', err.message);
        throw err;
    }
}

// Get connection pool
async function getConnection() {
    try {
        return await sql.connect(config);
    } catch (err) {
        console.error('Database connection error:', err);
        throw err;
    }
}

module.exports = {
    sql,
    config,
    testConnection,
    getConnection
};