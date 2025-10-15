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
        // Exchange code for access token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v12.0/oauth/access_token?` +
            new URLSearchParams({
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
                code,
            })
        );

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error('No access token received');
        }

        // Get user info
        const userInfoResponse = await fetch(
            `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`
        );

        const userInfo = await userInfoResponse.json();

        const email = userInfo.email || `${userInfo.id}@facebook.com`;
        const profilePicture = userInfo.picture?.data?.url || null;

        // Check if user exists
        const existingUser = await executeQuery({
            query: 'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
            values: ['facebook', userInfo.id],
        });

        let user;

        if (existingUser.length > 0) {
            // Update existing user
            await executeQuery({
                query: 'UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?',
                values: [userInfo.name, email, profilePicture, existingUser[0].id],
            });
            user = { ...existingUser[0], name: userInfo.name, email };
        } else {
            // Create new user
            const result = await executeQuery({
                query: `INSERT INTO users (email, name, provider, provider_id, profile_picture) 
                VALUES (?, ?, ?, ?, ?)`,
                values: [email, userInfo.name, 'facebook', userInfo.id, profilePicture],
            });

            user = {
                id: result.insertId,
                email,
                name: userInfo.name,
                provider: 'facebook',
                provider_id: userInfo.id,
                profile_picture: profilePicture,
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
        console.error('Facebook OAuth callback error:', error);
        return NextResponse.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
}