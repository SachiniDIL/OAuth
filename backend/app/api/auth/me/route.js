import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
    const user = await authenticateRequest(request);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userData = await executeQuery({
            query: 'SELECT id, email, name, provider, profile_picture, created_at FROM users WHERE id = ?',
            values: [user.id],
        });

        if (userData.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user: userData[0] });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}