// frontend/lib/auth.js
// SECURE VERSION - Does not attempt to read HttpOnly cookies from JavaScript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authAPI = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Critical: Sends HttpOnly cookies automatically
});

// Get current authenticated user
export async function getCurrentUser() {
    try {
        const response = await authAPI.get('/api/auth/me');
        return response.data.user;
    } catch (error) {
        console.error('Get current user failed:', error.response?.status);
        return null;
    }
}

// Register new user with email/password
export async function register({ name, email, password }) {
    try {
        const response = await authAPI.post('/api/auth/register', {
            name,
            email,
            password
        });
        return response.data;
    } catch (error) {
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('Registration failed. Please try again.');
    }
}

// Login with email/password
export async function login({ email, password }) {
    try {
        const response = await authAPI.post('/api/auth/login', {
            email,
            password
        });
        return response.data;
    } catch (error) {
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('Login failed. Please try again.');
    }
}

// Logout user
export async function logout() {
    try {
        await authAPI.post('/api/auth/logout');
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if API call fails
        window.location.href = '/login';
    }
}

// Get Google OAuth URL
export function getGoogleAuthUrl() {
    return `${API_URL}/api/auth/google`;
}

// Get Facebook OAuth URL
export function getFacebookAuthUrl() {
    return `${API_URL}/api/auth/facebook`;
}

// Check if user is authenticated by attempting to fetch user data
// This is more secure than trying to read HttpOnly cookies
export async function isAuthenticated() {
    try {
        const user = await getCurrentUser();
        return !!user; // Returns true if user exists, false otherwise
    } catch (error) {
        return false;
    }
}