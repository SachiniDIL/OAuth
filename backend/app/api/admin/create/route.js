// backend/app/api/admin/create/route.js

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * CREATE ADMIN ENDPOINT
 * This endpoint should be used ONLY for creating admin accounts manually
 *
 * Security Recommendations:
 * 1. Remove this endpoint in production OR
 * 2. Add API key authentication OR
 * 3. Restrict to specific IP addresses
 */

export async function POST(request) {
    try {
        // OPTIONAL: Add API key check for extra security
        const apiKey = request.headers.get('x-api-key');
        if (process.env.ADMIN_API_KEY && apiKey !== process.env.ADMIN_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { email, password, name } = await request.json();

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        // Check if admin already exists
        const existingUser = await executeQuery({
            query: 'SELECT * FROM users WHERE email = ?',
            values: [email],
        });

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin user with role='admin'
        const result = await executeQuery({
            query: `INSERT INTO users (email, name, provider, password_hash, role) 
                    VALUES (?, ?, ?, ?, ?)`,
            values: [email, name, 'email', hashedPassword, 'admin'],
        });

        return NextResponse.json(
            {
                message: 'Admin user created successfully',
                admin: {
                    id: result.insertId,
                    email,
                    name,
                    role: 'admin'
                }
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create admin error:', error);
        return NextResponse.json(
            { error: 'Failed to create admin user' },
            { status: 500 }
        );
    }
}