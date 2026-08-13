'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api-client';
import {
    MessageSquare, FileText, MapPin, ArrowRight, TrendingUp, Sparkles, Clock
} from 'lucide-react';
import Sparkline, { generateWeeklyData } from '@/components/ui/Sparkline';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import Breadcrumb from '@/components/ui/Breadcrumb';



// Helper to format relative time
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

interface RecentActivityItem {
    id: string;
    title: string;
    time: string;
    desc: string;
    icon: any;
    type: 'chat' | 'report' | 'hospital';
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        chats: { value: 0, delta: 0 },
        reports: { value: 0, delta: 0 },
        hospitals: { value: 0, delta: 0 }
    });
    const [greeting, setGreeting] = useState('');
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        // Set dynamic greeting
        const hour = new Date().getHours();
        if (hour < 12) setGreeting(t('dashboard.greeting.morning'));
        else if (hour < 17) setGreeting(t('dashboard.greeting.afternoon'));
        else setGreeting(t('dashboard.greeting.evening'));

        // Fetch Dynamic Stats and Recent Activity
        const fetchData = async () => {
            if (!user) return;

            const activities: RecentActivityItem[] = [];
            let chatsTotal = 0, chatsWeek = 0;
            let reportsTotal = 0, reportsWeek = 0;

            // Fetch chats with error handling
            try {
                const chatsRes = await apiClient.getSessions();
                if (chatsRes.success && chatsRes.sessions) {
                    chatsTotal = chatsRes.sessions.length;
                    
                    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    
                    chatsRes.sessions.forEach((chat: any, index: number) => {
                        const chatDateStr = chat.created_at || chat.createdAt;
                        const chatDate = chatDateStr ? new Date(chatDateStr).getTime() : 0;
                        
                        if (chatDate > oneWeekAgo) chatsWeek++;
                        
                        if (index < 5) {
                            activities.push({
                                id: chat.id || chat.session_id || chat.$id,
                                title: t('dashboard.recent_activity.new_chat'),
                                time: formatRelativeTime(chatDateStr),
                                desc: chat.title || 'Health conversation',
                                icon: MessageSquare,
                                type: 'chat'
                            });
                        }
                    });
                }
            } catch (error: any) {
                console.error("Failed to fetch chats", error);
            }

            // Fetch reports with error handling
            try {
                const reportsRes = await apiClient.getReports(user.uid);
                if (reportsRes.success && reportsRes.reports) {
                    reportsTotal = reportsRes.reports.length;
                    
                    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    
                    reportsRes.reports.forEach((report: any, index: number) => {
                        const reportDateStr = report.timestamp || report.created_at || report.createdAt;
                        const reportDate = reportDateStr ? new Date(reportDateStr).getTime() : 0;
                        
                        if (reportDate > oneWeekAgo) reportsWeek++;
                        
                        if (index < 5) {
                            activities.push({
                                id: report.id || report.$id,
                                title: t('dashboard.recent_activity.report_analyzed'),
                                time: formatRelativeTime(reportDateStr),
                                desc: report.title || 'Medical report analyzed',
                                icon: FileText,
                                type: 'report'
                            });
                        }
                    });
                }
            } catch (error: any) {
                console.error("Failed to fetch reports", error);
            }

            // Set stats
            setStats({
                chats: { value: chatsTotal, delta: chatsWeek },
                reports: { value: reportsTotal, delta: reportsWeek },
                hospitals: { value: 0, delta: 0 }
            });

            // Sort activities by newest first
            activities.sort((a, b) => new Date(b.time === 'Just now' ? Date.now() : b.time).getTime() - new Date(a.time === 'Just now' ? Date.now() : a.time).getTime());
            
            setRecentActivity(activities.slice(0, 5));
            setActivityLoading(false);
        };

        fetchData();

    }, [user, loading, router, t]);

    // Skeleton loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] transition-colors duration-500">
                <Sidebar />
                <main className="lg:pl-64 min-h-screen bg-grid-pattern">
                    <header className="px-6 lg:px-8 py-5 glass-panel sticky top-0 z-20 border-b-0 border-b border-border/50">
                        <div className="max-w-6xl mx-auto flex justify-between items-center">
                            <div className="space-y-2">
                                <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                            </div>
                        </div>
                    </header>
                    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
                        <SkeletonDashboard />
                    </div>
                </main>
            </div>
        );
    }

    const quickActions = [
        {
            title: t('dashboard.quick_actions.chat.title'),
            description: t('dashboard.quick_actions.chat.desc'),
            icon: MessageSquare,
            href: '/chat',
            glowClass: 'glow-on-hover-blue'
        },
        {
            title: t('dashboard.quick_actions.analyze.title'),
            description: t('dashboard.quick_actions.analyze.desc'),
            icon: FileText,
            href: '/reports',
            glowClass: 'glow-on-hover-purple'
        },
        {
            title: t('dashboard.quick_actions.find.title'),
            description: t('dashboard.quick_actions.find.desc'),
            icon: MapPin,
            href: '/hospitals',
            glowClass: 'glow-on-hover-teal'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] transition-colors duration-500">
            <Sidebar />

            <main className="lg:pl-64 min-h-screen bg-grid-pattern">
                {/* Header */}
                <header className="px-6 lg:px-8 py-5 glass-panel sticky top-0 z-20 border-b-0 border-b border-border/50">
                    <div className="max-w-6xl mx-auto flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {greeting}
                                <span className="inline-block animate-float text-2xl">👋</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{user?.displayName || 'User'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 cursor-pointer">
                                <a href="/profile">
                                    {user?.displayName?.charAt(0) || 'U'}
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { label: t('dashboard.stats.chats'), value: stats.chats.value, icon: MessageSquare, gradient: 'from-emerald-500 to-teal-500', delta: `+${stats.chats.delta}`, color: '#10b981', sparkData: generateWeeklyData(stats.chats.value || 5) },
                            { label: t('dashboard.stats.reports'), value: stats.reports.value, icon: FileText, gradient: 'from-indigo-500 to-purple-600', delta: `+${stats.reports.delta}`, color: '#6366f1', sparkData: generateWeeklyData(stats.reports.value || 3) },
                            { label: t('dashboard.stats.hospitals'), value: stats.hospitals.value, icon: MapPin, gradient: 'from-teal-500 to-cyan-500', delta: `+${stats.hospitals.delta}`, color: '#14b8a6', sparkData: generateWeeklyData(2) }
                        ].map((stat, idx) => (
                            <div
                                key={idx}
                                className="glass-card p-6 card-hover"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                                        <TrendingUp className="w-3 h-3" />
                                        {stat.delta} {t('dashboard.stats.this_week')}
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1 tabular-nums">{stat.value}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{stat.label}</p>
                                <Sparkline data={stat.sparkData} color={stat.color} height={32} />
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.quick_actions.title')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => router.push(action.href)}
                                    className={`group glass-card p-6 text-left transition-all duration-300 ${action.glowClass}`}
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <action.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1 text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">{action.title}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{action.description}</p>
                                    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all duration-300">
                                        {t('dashboard.quick_actions.get_started')}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-slate-400" />
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.recent_activity.title')}</h2>
                            </div>
                            <button
                                onClick={() => router.push('/activity')}
                                className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-300"
                            >
                                {t('dashboard.recent_activity.view_all')}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {activityLoading ? (
                                // Loading skeleton
                                [...Array(3)].map((_, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 animate-shimmer" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                                            <div className="h-3 w-48 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                                        </div>
                                        <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded animate-shimmer" />
                                    </div>
                                ))
                            ) : recentActivity.length > 0 ? (
                                recentActivity.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => router.push(item.type === 'chat' ? '/chat' : '/reports')}
                                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 dark:from-emerald-500/20 dark:to-indigo-500/20 border border-emerald-100 dark:border-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:border-emerald-200 dark:group-hover:border-emerald-500/30 transition-all duration-300">
                                            <item.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">{item.title}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 truncate">{item.desc}</p>
                                        </div>
                                        <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">{item.time}</span>
                                    </div>
                                ))
                            ) : (
                                // Empty state
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Clock className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No recent activity</p>
                                    <p className="text-xs mt-1">Start a chat or analyze a report to see activity here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

