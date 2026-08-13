// Type definitions for the Health AI Assistant application

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'user' | 'admin';
    emailVerified: boolean;
    createdAt: Date;
    lastActive: Date;
    prefs?: {
        language?: string;
        onboardingCompleted?: boolean;
        [key: string]: any;
    };
    settings: UserSettings;
    stats: UserStats;
}

export interface UserSettings {
    defaultMaxTokens: number;
    defaultTemperature: number;
    defaultTopP: number;
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
}

export interface UserStats {
    totalChats: number;
    totalMessages: number;
    totalReports: number;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: MessageMetadata;
}

export interface MessageMetadata {
    model?: string;
    tokensGenerated?: number;
    inferenceTime?: number;
}

export interface ChatSession {
    sessionId: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    lastMessage: string;
    tags?: string[];
}

export interface MedicalReport {
    reportId: string;
    userId: string;
    fileName: string;
    fileType: 'pdf' | 'image';
    fileUrl: string;
    uploadedAt: Date;
    analysis?: ReportAnalysis;
    status: 'pending' | 'analyzing' | 'completed' | 'error';
}

export interface ReportAnalysis {
    summary: string;
    findings: string[];
    recommendations: string[];
    confidence: number;
    analyzedAt: Date;
}

export interface Hospital {
    id: string;
    name: string;
    address: string;
    phone?: string;
    website?: string;
    rating?: number;
    location: {
        lat: number;
        lng: number;
    };
    distance?: number;
    specialties?: string[];
}

export interface ActivityLog {
    logId: string;
    userId: string;
    action: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface Analytics {
    date: string;
    totalChats: number;
    totalMessages: number;
    activeUsers: number;
    avgResponseTime: number;
    popularTopics: string[];
}

export interface AdminStats {
    totalUsers: number;
    activeUsersToday: number;
    totalChats: number;
    totalMessages: number;
    totalReports: number;
    systemHealth: 'healthy' | 'degraded' | 'down';
}
