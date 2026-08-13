import { ActivityLog, AnalyticsData, AdminStats } from './admin-data';

const STORAGE_KEYS = {
    STATS: 'health_ai_stats',
    LOGS: 'health_ai_logs',
    KEYWORDS: 'health_ai_keywords',
    DAILY_ACTIVE: 'health_ai_daily_active'
};

export const AnalyticsService = {
    // Track a system event
    logEvent: (action: string, user: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
        if (typeof window === 'undefined') return;

        const newLog: ActivityLog = {
            id: Date.now().toString(),
            user,
            action,
            timestamp: new Date(),
            type
        };

        const logs = AnalyticsService.getLogs();
        logs.unshift(newLog);
        // Keep only last 100 logs
        const trimmedLogs = logs.slice(0, 100);
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(trimmedLogs));
    },

    trackSessionStart: (userId: string) => {
        AnalyticsService.logEvent('Session started', userId, 'success');
    },

    getLogs: (): ActivityLog[] => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
        if (!stored) return [];
        try {
            return JSON.parse(stored).map((log: any) => ({
                ...log,
                timestamp: new Date(log.timestamp)
            }));
        } catch {
            return [];
        }
    },

    // Track stats (chats, reports, etc)
    incrementStat: (key: 'totalChats' | 'totalReports' | 'hospitalsFound') => {
        if (typeof window === 'undefined') return;

        const stats = AnalyticsService.getStats();
        // Map the internal key to the AdminStats key if needed, or just store raw counts
        // For simplicity, we'll store raw counts in a separate object or merge with stats
        const currentCounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS) || '{"totalChats": 0, "totalReports": 0, "hospitalsFound": 0}');
        currentCounts[key] = (currentCounts[key] || 0) + 1;
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(currentCounts));
    },

    getStats: (): AdminStats => {
        if (typeof window === 'undefined') return { totalUsers: 0, activeUsers: 0, totalChats: 0, systemHealth: 'healthy' };

        const counts = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS) || '{"totalChats": 0, "totalReports": 0, "hospitalsFound": 0}');

        // Get user count from mock auth storage
        const mockUser = localStorage.getItem('health_ai_mock_user');
        const totalUsers = mockUser ? 1 : 0; // In local mode, usually just 1 active user session

        return {
            totalUsers: totalUsers + 12, // Fake base + real
            activeUsers: 1,
            totalChats: counts.totalChats,
            systemHealth: 'healthy'
        };
    },

    // Track keywords
    trackKeyword: (text: string) => {
        if (typeof window === 'undefined') return;

        // Simple keyword extraction (very basic)
        const commonHealthKeywords = ['fever', 'headache', 'pain', 'diabetes', 'diet', 'covid', 'flu', 'stomach', 'heart', 'blood'];
        const foundKeywords = commonHealthKeywords.filter(k => text.toLowerCase().includes(k));

        if (foundKeywords.length > 0) {
            const currentKeywords = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYWORDS) || '{}');
            foundKeywords.forEach(k => {
                const key = k.charAt(0).toUpperCase() + k.slice(1);
                currentKeywords[key] = (currentKeywords[key] || 0) + 1;
            });
            localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(currentKeywords));
        }
    },

    getKeywordStats: (): AnalyticsData[] => {
        if (typeof window === 'undefined') return [];
        const keywords = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYWORDS) || '{}');
        return Object.entries(keywords).map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    },

    getFeatureUsage: (): AnalyticsData[] => {
        if (typeof window === 'undefined') return [];
        const counts = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS) || '{"totalChats": 0, "totalReports": 0, "hospitalsFound": 0}');
        return [
            { name: 'AI Chat', value: counts.totalChats || 0 },
            { name: 'Report Analysis', value: counts.totalReports || 0 },
            { name: 'Hospital Search', value: counts.hospitalsFound || 0 },
        ];
    }
};
