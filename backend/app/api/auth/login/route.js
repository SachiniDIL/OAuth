// backend/app/api/auth/login/route.js
// Updated to handle both regular users and admins

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user by email (includes both users and admins)
        const users = await executeQuery({
            query: 'SELECT * FROM users WHERE email = ? AND provider = ?',
            values: [email, 'email'],
        });

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const user = users[0];

        // Check if user has a password (not OAuth user)
        if (!user.password_hash) {
            return NextResponse.json(
                { error: 'This email is registered with social login. Please use Google or Facebook to sign in.' },
                { status: 401 }
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Generate JWT token (includes role information)
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
            provider: user.provider,
            role: user.role || 'user'  // Include role in token
        });

        // Create response
        const response = NextResponse.json(
            {
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    provider: user.provider,
                    profile_picture: user.profile_picture,
                    role: user.role || 'user'  // Send role to frontend
                }
            },
            { status: 200 }
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
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        );
    }
}