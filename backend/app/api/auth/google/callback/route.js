import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            throw new Error('No access token received');
        }

        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        const userInfo = await userInfoResponse.json();

        // Check if user exists
        const existingUser = await executeQuery({
            query: 'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
            values: ['google', userInfo.id],
        });

        let user;

        if (existingUser.length > 0) {
            // Update existing user
            await executeQuery({
                query: 'UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?',
                values: [userInfo.name, userInfo.email, userInfo.picture, existingUser[0].id],
            });
            user = { ...existingUser[0], name: userInfo.name, email: userInfo.email };
        } else {
            // Create new user
            const result = await executeQuery({
                query: `INSERT INTO users (email, name, provider, provider_id, profile_picture) 
                VALUES (?, ?, ?, ?, ?)`,
                values: [userInfo.email, userInfo.name, 'google', userInfo.id, userInfo.picture],
            });

            user = {
                id: result.insertId,
                email: userInfo.email,
                name: userInfo.name,
                provider: 'google',
                provider_id: userInfo.id,
                profile_picture: userInfo.picture,
            };
        }

        // Generate JWT token
        const token = generateToken(user);

        // Create response with redirect
        const response = NextResponse.redirect(`${process.env.FRONTEND_URL}/dashboard`);

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
        console.error('Google OAuth callback error:', error);
        return NextResponse.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
}