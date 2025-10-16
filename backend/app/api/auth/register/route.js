// backend/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const { email, password, name } = await request.json();

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate password strength (min 8 characters)
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await executeQuery({
            query: 'SELECT * FROM users WHERE email = ?',
            values: [email],
        });

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const result = await executeQuery({
            query: `INSERT INTO users (email, name, provider, password_hash)
                    VALUES (?, ?, ?, ?)`,
            values: [email, name, 'email', hashedPassword],
        });

        const user = {
            id: result.insertId,
            email,
            name,
            provider: 'email',
        };

        // Generate JWT token
        const token = generateToken(user);

        // Create response
        const response = NextResponse.json(
            {
                message: 'Registration successful',
                user: { id: user.id, email: user.email, name: user.name }
            },
            { status: 201 }
        );

        // Set cookie
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Registration failed' },
            { status: 500 }
        );
    }
}