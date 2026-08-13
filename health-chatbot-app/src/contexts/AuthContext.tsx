'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    updatePreferences: (prefs: Partial<User['prefs']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    login: async () => { },
    signup: async () => { },
    logout: () => { },
    updatePreferences: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const res = await apiClient.getMe();
                if (res.success && res.user) {
                    const u = res.user;
                    setUser({
                        uid: u.id,
                        email: u.email,
                        displayName: u.name,
                        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`,
                        emailVerified: true,
                        createdAt: new Date(u.created_at || Date.now()),
                        lastActive: new Date(u.last_active || Date.now()),
                        prefs: u.prefs || {},
                        role: u.role === 'admin' ? 'admin' : 'user',
                        settings: {
                            defaultMaxTokens: 150,
                            defaultTemperature: 0.7,
                            defaultTopP: 0.9,
                            notifications: true,
                            theme: 'system',
                        },
                        stats: {
                            totalChats: 0,
                            totalMessages: 0,
                            totalReports: 0,
                        },
                    });
                } else {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            } catch (error) {
                console.error("Session load error:", error);
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await apiClient.login(email, password);
            if (res.token) {
                localStorage.setItem('token', res.token);
                const u = res.user;
                setUser({
                    uid: u.id,
                    email: u.email,
                    displayName: u.name,
                    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`,
                    emailVerified: true,
                    createdAt: new Date(u.created_at || Date.now()),
                    lastActive: new Date(u.last_active || Date.now()),
                    prefs: u.prefs || {},
                    role: u.role === 'admin' ? 'admin' : 'user',
                    settings: {
                        defaultMaxTokens: 150,
                        defaultTemperature: 0.7,
                        defaultTopP: 0.9,
                        notifications: true,
                        theme: 'system',
                    },
                    stats: {
                        totalChats: 0,
                        totalMessages: 0,
                        totalReports: 0,
                    },
                });

                apiClient.sendLoginNotification({
                    userId: u.id,
                    email: u.email,
                    name: u.name,
                    timestamp: new Date().toISOString()
                }).catch(err => console.error("Notification Error:", err));
            }
        } catch (error: any) {
            throw new Error(error?.message || 'Invalid email or password');
        }
    };

    const signup = async (email: string, password: string, name: string) => {
        try {
            const res = await apiClient.signup(email, password, name);
            if (res.token) {
                localStorage.setItem('token', res.token);
                const u = res.user;
                setUser({
                    uid: u.id,
                    email: u.email,
                    displayName: u.name,
                    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`,
                    emailVerified: true,
                    createdAt: new Date(u.created_at || Date.now()),
                    lastActive: new Date(u.last_active || Date.now()),
                    prefs: u.prefs || {},
                    role: u.role === 'admin' ? 'admin' : 'user',
                    settings: {
                        defaultMaxTokens: 150,
                        defaultTemperature: 0.7,
                        defaultTopP: 0.9,
                        notifications: true,
                        theme: 'system',
                    },
                    stats: {
                        totalChats: 0,
                        totalMessages: 0,
                        totalReports: 0,
                    },
                });
            }
        } catch (error: any) {
            throw new Error(error?.message || 'Registration failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        router.push('/login');
    };

    const updatePreferences = async (newPrefs: Partial<User['prefs']>) => {
        if (!user) return;
        try {
            const updatedPrefs = { ...user.prefs, ...newPrefs };
            await apiClient.updatePreferences(updatedPrefs);
            setUser(prev => prev ? { ...prev, prefs: updatedPrefs } : null);
        } catch (error) {
            console.error('Failed to update preferences', error);
            throw error;
        }
    };

    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, signup, logout, updatePreferences }}>
            {children}
        </AuthContext.Provider>
    );
}
