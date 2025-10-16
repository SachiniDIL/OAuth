import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
    console.log('📌 [GET /api/user] Incoming request...');

    // Log request headers and method
    console.log('👉 Request Method:', request.method);
    console.log('👉 Request Headers:', Object.fromEntries(request.headers));

    // Step 1: Authenticate the request
    console.log('🔐 Authenticating request...');
    const user = await authenticateRequest(request);

    if (!user) {
        console.warn('❌ Authentication failed. No valid user found.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authentication successful. User:', user);

    // Step 2: Fetch user data from DB
    try {
        console.log(`📡 Executing DB query for user ID: ${user.id}`);
        const query = 'SELECT id, email, name, role, provider, profile_picture, created_at FROM' +
            ' users WHERE id = ?';
        const values = [user.id];
        console.log('📝 Query:', query);
        console.log('📝 Values:', values);

        const userData = await executeQuery({ query, values });

        console.log('📥 Query Result:', userData);

        if (userData.length === 0) {
            console.warn(`⚠ No user found in DB with ID: ${user.id}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('✅ User found. Sending response...');
        return NextResponse.json({ user: userData[0] });
    } catch (error) {
        console.error('💥 Get user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
