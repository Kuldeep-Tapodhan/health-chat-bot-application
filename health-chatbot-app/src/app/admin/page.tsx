'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { API_BASE_URL } from '@/lib/api-client';
import {
    Users,
    LayoutDashboard,
    FileText,
    LogOut,
    Menu,
    Shield,
    ChevronRight,
    MessageSquare,
    BarChart3,
    Activity,
    Search,
    PieChart as PieChartIcon,
    Map as MapIcon,
    Sparkles,
    Zap,
    Settings,
    Bell,
    X,
    CheckCircle,
    AlertTriangle,
    UploadCloud,
    Trash2,
    MoreVertical,
    File as FileIcon,
    TrendingUp,
    ArrowLeft
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { AnalyticsService } from '@/lib/analytics';
import UserTable from '@/components/admin/UserTable';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';

// Dynamic import for Leaflet map to avoid SSR issues
const AdminMap = dynamic(() => import('@/components/admin/AdminMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl">
            <span className="text-slate-500 animate-pulse">Loading Heatmap...</span>
        </div>
    )
});

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalChats: number;
    totalReports: number;
    systemHealth: string;
}

interface ActivityItem {
    id: string;
    type: string;
    action: string;
    user: string;
    timestamp: string;
    details: string;
}

export default function AdminDashboard() {
    const { user, loading, logout, isAdmin } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'documents' | 'activity'>('overview');

    // Real Data States
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        activeUsers: 0,
        totalChats: 0,
        totalReports: 0,
        systemHealth: 'Unknown'
    });
    const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
    const [userGrowth, setUserGrowth] = useState<any[]>([]);

    // New Analytics States
    const [featureUsage, setFeatureUsage] = useState<any[]>([]);
    const [keywordStats, setKeywordStats] = useState<any[]>([]);
    const [detailedUsers, setDetailedUsers] = useState<any[]>([]);

    // Advanced Features Lists
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [insights, setInsights] = useState<{ content: string } | null>(null);
    const [effectiveness, setEffectiveness] = useState<{ score: number, sentiment: string, analysis: string } | null>(null);

    const [dashboardLoading, setDashboardLoading] = useState(true);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Documents State
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [documents, setDocuments] = useState<{ name: string, size: number, type: string }[]>([]);

    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/ingest/files`);
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        }
    };

    const fetchDashboardData = async () => {
        setDashboardLoading(true);
        try {
            const [statsRes, activityRes, growthRes, usageRes, keywordsRes, usersRes, heatmapRes, insightsRes, effectRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/stats`),
                fetch(`${API_BASE_URL}/admin/activity?limit=50`),
                fetch(`${API_BASE_URL}/admin/users/growth`),
                fetch(`${API_BASE_URL}/admin/analytics/usage`),
                fetch(`${API_BASE_URL}/admin/analytics/keywords`),
                fetch(`${API_BASE_URL}/admin/analytics/users`),
                fetch(`${API_BASE_URL}/admin/analytics/heatmap`),
                fetch(`${API_BASE_URL}/admin/analytics/insights`),
                fetch(`${API_BASE_URL}/admin/analytics/effectiveness`)
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (activityRes.ok) setActivityLog(await activityRes.json());
            if (growthRes.ok) setUserGrowth(await growthRes.json());

            // Set new analytics data
            if (usageRes.ok) setFeatureUsage(await usageRes.json());
            if (keywordsRes.ok) setKeywordStats(await keywordsRes.json());
            if (usersRes.ok) setDetailedUsers(await usersRes.json());

            // Advanced Features
            if (heatmapRes.ok) setHeatmapData(await heatmapRes.json());
            if (insightsRes.ok) setInsights(await insightsRes.json());
            if (effectRes.ok) setEffectiveness(await effectRes.json());

        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setDashboardLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            if (!user || !isAdmin) {
                router.push('/dashboard');
            } else {
                fetchDashboardData();
            }
        }
    }, [user, loading, isAdmin, router]);

    useEffect(() => {
        if (activeTab === 'documents') {
            fetchDocuments();
        }
    }, [activeTab]);


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadStatus(null);
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/ingest/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Upload failed');
            setUploadStatus({ type: 'success', message: data.message });
            fetchDocuments();
        } catch (error: any) {
            setUploadStatus({ type: 'error', message: error.message });
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/ingest/files/${filename}`, {
                method: 'DELETE',
            });
            if (response.ok) fetchDocuments();
            else alert('Failed to delete file');
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    if (loading || !user || !isAdmin) return null;

    const COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans text-white flex selection:bg-teal-500/30">
            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] border-r border-white/5 text-white transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
            `}>
                <div className="h-full flex flex-col">
                    <div className="p-6 flex items-center gap-3 border-b border-white/5">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">{t('admin.title')}</h1>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{t('admin.subtitle')}</p>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {[
                            { id: 'overview', icon: LayoutDashboard, label: t('admin.sidebar.overview') },
                            { id: 'users', icon: Users, label: t('admin.sidebar.users') },
                            { id: 'analytics', icon: BarChart3, label: t('admin.sidebar.analytics') },
                            { id: 'documents', icon: FileText, label: t('admin.sidebar.documents') },
                            { id: 'activity', icon: Activity, label: 'System Activity' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                                    ? 'bg-gradient-to-r from-teal-500/20 to-blue-500/10 text-white shadow-lg shadow-teal-500/10 border border-teal-500/20'
                                    : 'text-secondary-dark hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-teal-400' : 'text-secondary-dark'}`} />
                                {item.label}
                                {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto text-teal-400" />}
                            </button>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-white/5">
                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            {t('admin.sidebar.signout')}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0f172a] relative">
                <div className="absolute inset-0 bg-grid-pattern -z-10" />

                {/* Header */}
                <header className="bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-between px-8 z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 text-neutral-400 hover:bg-white/5 rounded-lg transition-colors"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <button
                            className="p-2 text-neutral-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors flex items-center gap-2 group"
                            onClick={() => router.push('/dashboard')}
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-medium">Back</span>
                        </button>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            {t('admin.header.system_operational')}
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-white">{t('admin.header.admin_user')}</p>
                                <p className="text-xs text-neutral-500">{t('admin.header.super_admin')}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Scroll Area */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fade-in-up">
                            {/* AI Insights Card */}
                            {insights && (
                                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 shadow-lg relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                                    <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                                AI Daily Briefing
                                                <span className="text-[10px] uppercase font-bold text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">Beta</span>
                                            </h3>
                                            <div className="prose prose-invert prose-sm max-w-none text-neutral-300">
                                                <ReactMarkdown>{insights.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: t('admin.overview.stats.total_users'), value: stats.totalUsers, icon: Users, color: 'blue', change: 'Total' },
                                    { label: 'Active Sessions', value: stats.activeUsers, icon: Activity, color: 'emerald', change: 'Now' },
                                    { label: t('admin.overview.stats.total_chats'), value: stats.totalChats, icon: BarChart3, color: 'violet', change: 'All time' },
                                    { label: 'Total Reports', value: stats.totalReports, icon: FileText, color: 'amber', change: 'Analyzed' },
                                ].map((stat, i) => (
                                    <div key={i} className="glow-card p-6 hover:bg-white/[0.03] transition-all duration-300 cursor-default">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/10 text-teal-400 group-hover:scale-110 transition-transform`}>
                                                <stat.icon className="w-6 h-6" />
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white/5 text-neutral-400 border border-white/5`}>
                                                {stat.change}
                                            </span>
                                        </div>
                                        <h3 className="text-3xl font-bold text-white mb-1">
                                            {dashboardLoading ? '...' : stat.value.toLocaleString()}
                                        </h3>
                                        <p className="text-neutral-500 text-sm font-medium">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Activity Log */}
                                <div className="glass-card-dark rounded-2xl border border-white/5 overflow-hidden lg:col-span-2">
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-white">{t('admin.overview.activity.title')}</h3>
                                        <button onClick={() => setActiveTab('activity')} className="text-sm text-indigo-400 font-medium hover:text-indigo-300">{t('admin.overview.activity.view_all')}</button>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {dashboardLoading ? (
                                            <div className="p-8 text-center text-neutral-500">Loading activity...</div>
                                        ) : activityLog.length === 0 ? (
                                            <div className="p-8 text-center text-neutral-500">No recent activity</div>
                                        ) : (
                                            activityLog.slice(0, 5).map((log) => (
                                                <div key={log.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2 rounded-full h-2 ${log.type === 'chat' ? 'bg-blue-500 shadow-blue-500/50' :
                                                            'bg-purple-500 shadow-purple-500/50'
                                                            }`}></div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{log.action}</p>
                                                            <p className="text-xs text-neutral-500">{log.details}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-medium text-neutral-500 font-mono block">
                                                            {new Date(log.timestamp).toLocaleTimeString()}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-600 font-mono block">
                                                            {new Date(log.timestamp).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* User Growth Small Chart */}
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-emerald-400" />
                                        User Trends (7d)
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={userGrowth}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#171717', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                    itemStyle={{ color: '#e5e5e5' }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <UserTable />
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Analytics Header / Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Users className="w-16 h-16 text-indigo-500" />
                                    </div>
                                    <p className="text-sm text-neutral-400 font-medium">Total Users</p>
                                    <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers.toLocaleString()}</p>
                                    <div className="mt-2 flex items-center text-xs text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        <span>+12% vs last week</span>
                                    </div>
                                </div>
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <MessageSquare className="w-16 h-16 text-blue-500" />
                                    </div>
                                    <p className="text-sm text-neutral-400 font-medium">Total Chats</p>
                                    <p className="text-3xl font-bold text-white mt-2">{stats.totalChats.toLocaleString()}</p>
                                    <div className="mt-2 flex items-center text-xs text-blue-400 bg-blue-500/10 w-fit px-2 py-1 rounded-lg">
                                        <Activity className="w-3 h-3 mr-1" />
                                        <span>Active Now</span>
                                    </div>
                                </div>
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Search className="w-16 h-16 text-amber-500" />
                                    </div>
                                    <p className="text-sm text-neutral-400 font-medium">Total Searches</p>
                                    <p className="text-3xl font-bold text-white mt-2">
                                        {featureUsage.find(f => f.name === 'Hospital Search')?.value || 0}
                                    </p>
                                </div>
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FileText className="w-16 h-16 text-pink-500" />
                                    </div>
                                    <p className="text-sm text-neutral-400 font-medium">Reports Analyzed</p>
                                    <p className="text-3xl font-bold text-white mt-2">{stats.totalReports.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Growth Chart (Main) */}
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5 lg:col-span-2">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-indigo-400" />
                                        Platform Growth (Last 7 Days)
                                    </h3>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={userGrowth}>
                                                <defs>
                                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#171717', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                    itemStyle={{ color: '#e5e5e5' }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Feature Usage (Side) */}
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <PieChartIcon className="w-5 h-5 text-pink-400" />
                                        Feature Distribution
                                    </h3>
                                    <p className="text-xs text-neutral-500 mb-6">Usage breakdown by category</p>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={featureUsage}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {featureUsage.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#171717', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                    itemStyle={{ color: '#e5e5e5' }}
                                                />
                                                <Legend
                                                    verticalAlign="bottom"
                                                    height={36}
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: '12px', color: '#a3a3a3' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Keywords & User Analysis Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Keywords Bar Chart */}
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <Search className="w-5 h-5 text-teal-400" />
                                        Top Search Keywords
                                    </h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={keywordStats} layout="vertical" margin={{ left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#262626" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={100}
                                                    tick={{ fill: '#a3a3a3', fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#171717', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                />
                                                <Bar dataKey="value" fill="#2dd4bf" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* User Engagement Table (Mini) */}
                                <div className="glass-card-dark p-6 rounded-2xl border border-white/5 flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Users className="w-5 h-5 text-blue-400" />
                                            Top Active Users
                                        </h3>
                                        <button
                                            onClick={() => setActiveTab('users')}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            View All
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                                        <div className="space-y-3">
                                            {detailedUsers.slice(0, 5).map((u, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                                            {u.name?.[0] || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-white">{u.name}</p>
                                                            <p className="text-[10px] text-neutral-500">{u.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1 justify-end text-emerald-400 text-xs font-bold">
                                                            <Activity className="w-3 h-3" />
                                                            {u.chats + (u.reports * 5) + u.searches}
                                                        </div>
                                                        <p className="text-[10px] text-neutral-600">Score</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {detailedUsers.length === 0 && (
                                                <div className="text-center text-neutral-500 text-sm py-4">No data available</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Upload Section */}
                            <div className="glass-card-dark p-8 rounded-2xl border border-white/5">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{t('admin.documents.upload.title')}</h3>
                                        <p className="text-neutral-400 mt-1">
                                            {t('admin.documents.upload.subtitle')}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                        <UploadCloud className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer relative group">
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        accept=".pdf,.txt,.csv"
                                        multiple
                                        disabled={uploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform group-hover:bg-indigo-500/20">
                                            <UploadCloud className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{t('admin.documents.upload.dropzone.main')}</p>
                                            <p className="text-sm text-neutral-500 mt-1">{t('admin.documents.upload.dropzone.sub')}</p>
                                        </div>
                                    </div>
                                </div>

                                {uploading && (
                                    <div className="mt-4 flex items-center gap-3 text-indigo-300 bg-indigo-500/10 px-4 py-3 rounded-xl animate-pulse border border-indigo-500/20">
                                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-medium">{t('admin.documents.upload.processing')}</span>
                                    </div>
                                )}

                                {uploadStatus && (
                                    <div className={`mt-4 px-4 py-3 rounded-xl flex items-center gap-3 ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {uploadStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                        <span className="font-medium">{uploadStatus.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* File List Section */}
                            <div className="glass-card-dark rounded-2xl border border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5">
                                    <h3 className="text-lg font-bold text-white">{t('admin.documents.list.title')}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 border-b border-white/5">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.documents.list.table.name')}</th>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.documents.list.table.type')}</th>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.documents.list.table.size')}</th>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider text-right">{t('admin.documents.list.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {documents.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-600">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-neutral-700">
                                                                <FileIcon className="w-6 h-6" />
                                                            </div>
                                                            <p>{t('admin.documents.list.empty')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                documents.map((doc, index) => (
                                                    <tr key={index} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <span className="text-sm font-semibold text-white">{doc.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 text-neutral-300 uppercase tracking-wide border border-white/5">
                                                                {doc.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-neutral-400 font-medium font-mono">
                                                            {(doc.size / 1024).toFixed(2)} KB
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDelete(doc.name)}
                                                                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                                title="Delete File"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="glass-card-dark rounded-2xl border border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white">Full System Activity</h3>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {dashboardLoading ? (
                                        <div className="p-8 text-center text-neutral-500">Loading activity...</div>
                                    ) : activityLog.length === 0 ? (
                                        <div className="p-8 text-center text-neutral-500">No activity found</div>
                                    ) : (
                                        activityLog.map((log) => (
                                            <div key={log.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'chat' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                        {log.type === 'chat' ? <MessageSquare className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{log.action}</p>
                                                        <p className="text-xs text-neutral-500">{log.details}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-neutral-400 uppercase tracking-wider">{log.type}</span>
                                                            <span className="text-[10px] text-neutral-600">User: {log.user || 'Unknown'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-medium text-neutral-400 font-mono block">
                                                        {new Date(log.timestamp).toLocaleTimeString()}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-600 font-mono block">
                                                        {new Date(log.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
