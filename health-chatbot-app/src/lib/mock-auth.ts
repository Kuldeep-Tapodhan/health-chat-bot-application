import { User } from '@/types';

const STORAGE_KEY = 'health_ai_mock_user';

export const mockAuth = {
    signIn: async (email: string): Promise<User> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const isAdmin = email === 'vivekchudasama39@gmail.com';
        const mockUser: User = {
            uid: isAdmin ? 'admin-vivek-uid' : 'mock-user-' + Date.now(),
            email: email,
            displayName: email.split('@')[0],
            photoURL: null,
            emailVerified: true,
            role: isAdmin ? 'admin' : 'user',
            createdAt: new Date(),
            lastActive: new Date(),
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
            }
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
        return mockUser;
    },

    signUp: async (email: string, name: string): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 500));

        const isAdmin = email === 'vivekchudasama39@gmail.com';
        const mockUser: User = {
            uid: isAdmin ? 'admin-vivek-uid' : 'mock-user-' + Date.now(),
            email: email,
            displayName: name,
            photoURL: null,
            emailVerified: true,
            role: isAdmin ? 'admin' : 'user',
            createdAt: new Date(),
            lastActive: new Date(),
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
            }
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
        return mockUser;
    },

    signOut: async (): Promise<void> => {
        localStorage.removeItem(STORAGE_KEY);
    },

    getCurrentUser: (): User | null => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        try {
            const user = JSON.parse(stored);
            // Restore Date objects
            user.createdAt = new Date(user.createdAt);
            user.lastActive = new Date(user.lastActive);
            return user;
        } catch (e) {
            return null;
        }
    }
};
