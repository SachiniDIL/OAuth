import jwt from 'jsonwebtoken';

export function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
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