import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authAPI = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

export async function getCurrentUser() {
    try {
        const response = await authAPI.get('/api/auth/me');
        return response.data.user;
    } catch (error) {
        return null;
    }
}

export async function logout() {
    try {
        await authAPI.post('/api/auth/logout');
        Cookies.remove('auth_token');
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

export function getGoogleAuthUrl() {
    return `${API_URL}/api/auth/google`;
}

export function getFacebookAuthUrl() {
    return `${API_URL}/api/auth/facebook`;
}

export function isAuthenticated() {
    return !!Cookies.get('auth_token');
}