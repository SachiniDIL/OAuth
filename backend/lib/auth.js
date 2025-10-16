// backend/lib/auth.js
// Updated to support role-based authentication

import jwt from 'jsonwebtoken';

export function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        role: user.role || 'user',  // Include role in JWT
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export async function authenticateRequest(request) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    return decoded;
}

// Middleware to check if user is admin
export async function requireAdmin(request) {
    const user = await authenticateRequest(request);

    if (!user) {
        return { error: 'Unauthorized', status: 401 };
    }

    if (user.role !== 'admin') {
        return { error: 'Forbidden - Admin access required', status: 403 };
    }

    return { user };
}

// Middleware to check if user is authenticated (any role)
export async function requireAuth(request) {
    const user = await authenticateRequest(request);

    if (!user) {
        return { error: 'Unauthorized', status: 401 };
    }

    return { user };
}