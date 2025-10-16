-- backend/database/schema.sql
CREATE DATABASE IF NOT EXISTS oauth;
USE oauth;

-- Create users table with support for both OAuth and email/password auth
CREATE TABLE IF NOT EXISTS users (
                                     id INT PRIMARY KEY AUTO_INCREMENT,
                                     email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255),
    password_hash VARCHAR(255),  -- For email/password authentication
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_provider (provider, provider_id)
    );

-- Create indexes for performance
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_provider ON users(provider, provider_id);

ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
CREATE INDEX idx_role ON users(role);