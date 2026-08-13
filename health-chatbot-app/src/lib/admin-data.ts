import { User } from '@/types';

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    totalChats: number;
    systemHealth: 'healthy' | 'degraded' | 'down';
}

export interface AnalyticsData {
    name: string;
    value: number;
}

export interface ActivityLog {
    id: string;
    user: string;
    action: string;
    timestamp: Date;
    type: 'info' | 'warning' | 'error' | 'success';
}

export const generateMockUsers = (count: number): User[] => {
    return Array.from({ length: count }).map((_, i) => ({
        uid: `user-${i}`,
        email: `user${i}@example.com`,
        displayName: `User ${i + 1}`,
        photoURL: null,
        emailVerified: true,
        role: i === 0 ? 'admin' : 'user',
        createdAt: new Date(Date.now() - Math.random() * 10000000000),
        lastActive: new Date(Date.now() - Math.random() * 100000000),
        settings: {
            defaultMaxTokens: 150,
            defaultTemperature: 0.7,
            defaultTopP: 0.9,
            notifications: true,
            theme: 'system',
        },
        stats: {
            totalChats: Math.floor(Math.random() * 50),
            totalMessages: Math.floor(Math.random() * 500),
            totalReports: Math.floor(Math.random() * 10),
        }
    }));
};

export const mockFeatureUsage: AnalyticsData[] = [
    { name: 'AI Chat', value: 65 },
    { name: 'Report Analysis', value: 25 },
    { name: 'Hospital Search', value: 10 },
];

export const mockKeywordStats: AnalyticsData[] = [
    { name: 'Fever', value: 120 },
    { name: 'Headache', value: 98 },
    { name: 'Diabetes', value: 85 },
    { name: 'Diet Plan', value: 76 },
    { name: 'COVID-19', value: 65 },
    { name: 'Skin Rash', value: 54 },
    { name: 'Pregnancy', value: 45 },
    { name: 'Mental Health', value: 40 },
];

export const mockUserGrowth: AnalyticsData[] = [
    { name: 'Mon', value: 10 },
    { name: 'Tue', value: 15 },
    { name: 'Wed', value: 25 },
    { name: 'Thu', value: 30 },
    { name: 'Fri', value: 45 },
    { name: 'Sat', value: 55 },
    { name: 'Sun', value: 70 },
];

export const generateMockLogs = (count: number): ActivityLog[] => {
    const actions = ['User Login', 'New Chat Started', 'Report Uploaded', 'Settings Updated', 'Hospital Search'];
    const types: ('info' | 'success' | 'warning')[] = ['info', 'success', 'info', 'info', 'success'];

    return Array.from({ length: count }).map((_, i) => ({
        id: `log-${i}`,
        user: `User ${Math.floor(Math.random() * 50)}`,
        action: actions[Math.floor(Math.random() * actions.length)],
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
        type: types[Math.floor(Math.random() * types.length)],
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};
