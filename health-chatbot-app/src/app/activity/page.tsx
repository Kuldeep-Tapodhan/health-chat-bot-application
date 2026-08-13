'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api-client';
import {
    MessageSquare, FileText, Clock, ArrowLeft, Filter
} from 'lucide-react';
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

interface ActivityItem {
    id: string;
    title: string;
    time: string;
    timestamp: string; // for sorting
    desc: string;
    icon: any;
    type: 'chat' | 'report';
}

export default function ActivityPage() {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [filter, setFilter] = useState<'all' | 'chat' | 'report'>('all');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        const fetchActivities = async () => {
            if (!user) return;

            try {
                const allActivities: ActivityItem[] = [];

                // 1. Fetch Chats
                const chatsRes = await apiClient.getSessions();
                if (chatsRes.success && chatsRes.sessions) {
                    chatsRes.sessions.forEach((chat: any) => {
                        const chatDateStr = chat.created_at || chat.createdAt;
                        allActivities.push({
                            id: chat.id || chat.session_id || chat.$id,
                            title: t('dashboard.recent_activity.new_chat') || 'New Chat',
                            time: formatRelativeTime(chatDateStr),
                            timestamp: chatDateStr,
                            desc: chat.title || 'Health conversation',
                            icon: MessageSquare,
                            type: 'chat'
                        });
                    });
                }

                // 2. Fetch Reports
                const reportsRes = await apiClient.getReports(user.uid);
                if (reportsRes.success && reportsRes.reports) {
                    reportsRes.reports.forEach((report: any) => {
                        const reportDateStr = report.timestamp || report.created_at || report.createdAt;
                        allActivities.push({
                            id: report.id || report.$id,
                            title: t('dashboard.recent_activity.report_analyzed') || 'Report Analyzed',
                            time: formatRelativeTime(reportDateStr),
                            timestamp: reportDateStr,
                            desc: report.title || 'Medical report analyzed',
                            icon: FileText,
                            type: 'report'
                        });
                    });
                }

                // Sort by timestamp desc
                allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setActivities(allActivities);
            } catch (error) {
                console.error("Failed to fetch activities", error);
            } finally {
                setLoadingActivities(false);
            }
        };

        fetchActivities();
    }, [user, loading, router, t]);

    const filteredActivities = activities.filter(item => {
        if (filter === 'all') return true;
        return item.type === filter;
    });

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] transition-colors duration-500">
            <Sidebar />
            <main className="lg:pl-64 min-h-screen bg-grid-pattern">
                {/* Header */}
                <header className="px-6 lg:px-8 py-5 glass-panel sticky top-0 z-20 border-b-0 border-b border-border/50">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                </button>
                                <Breadcrumb items={[
                                    { label: 'Dashboard', href: '/dashboard' },
                                    { label: 'Activity Log' }
                                ]} />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Activity History
                            </h1>
                        </div>

                        {/* Filters */}
                        <div className="flex bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'chat', label: 'Chats' },
                                { id: 'report', label: 'Reports' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id as any)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.id
                                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                    <div className="glass-card p-6 min-h-[500px]">
                        {loadingActivities ? (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-transparent">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-white/5 rounded animate-pulse" />
                                            <div className="h-3 w-48 bg-slate-200 dark:bg-white/5 rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredActivities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <Clock className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No activity found</p>
                                <p className="text-sm">Activities will appear here when you use the app.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredActivities.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => router.push(item.type === 'chat' ? '/chat' : '/reports')}
                                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 ${item.type === 'chat'
                                            ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                                            : 'bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white'
                                            }`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                    {item.title}
                                                </h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.type === 'chat'
                                                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                    : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                                    }`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate pr-4">
                                                {item.desc}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                {item.time}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
