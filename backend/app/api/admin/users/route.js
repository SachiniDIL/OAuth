// backend/app/api/admin/users/route.js
// Example protected admin endpoint - Get all users

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET all users (Admin only)
export async function GET(request) {
    // Check if user is admin
    const authResult = await requireAdmin(request);

    if (authResult.error) {
        return NextResponse.json(
            { error: authResult.error },
            { status: authResult.status }
        );
    }

    try {
        const users = await executeQuery({
            query: `SELECT id, email, name, provider, role, profile_picture, created_at 
                    FROM users 
                    ORDER BY created_at DESC`,
            values: [],
        });

        return NextResponse.json({
            users,
            total: users.length
        });

    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// DELETE user (Admin only)
export async function DELETE(request) {
    const authResult = await requireAdmin(request);

    if (authResult.error) {
        return NextResponse.json(
            { error: authResult.error },
            { status: authResult.status }
        );
    }

    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Prevent admin from deleting themselves
        if (userId === authResult.user.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        await executeQuery({
            query: 'DELETE FROM users WHERE id = ?',
            values: [userId],
        });

        return NextResponse.json({
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}