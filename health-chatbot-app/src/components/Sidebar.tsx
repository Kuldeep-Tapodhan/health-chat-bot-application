'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    MessageSquare,
    FileText,
    MapPin,
    Settings,
    LogOut,
    Activity,
    Plus,
    Shield,
    Menu,
    X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';


export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, isAdmin } = useAuth();
    const { t } = useLanguage();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const navItems = [
        { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.ai_chat'), href: '/chat', icon: MessageSquare },
        { name: t('nav.analysis'), href: '/reports', icon: FileText },
        { name: t('nav.find_care'), href: '/hospitals', icon: MapPin },
        { name: t('nav.outbreaks'), href: '/outbreaks', icon: Activity },
    ];

    if (isAdmin) {
        navItems.push({ name: t('nav.admin_console'), href: '/admin', icon: Shield });
    }

    const closeMobile = () => setIsMobileOpen(false);

    // Bottom navigation items (a subset for mobile)
    const bottomNavItems = navItems.slice(0, 4);

    return (
        <>
            {/* Mobile Header with Hamburger */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 z-40 lg:hidden flex items-center justify-between px-4">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                        <Activity className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white tracking-tight">{t('nav.health_ai')}</span>
                </Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
            </header>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden"
                    onClick={closeMobile}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Drawer */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-slate-50/95 dark:bg-[#030712]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 z-50 flex flex-col transition-transform duration-300 lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Mobile Drawer Header */}
                <div className="p-5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10">
                    <Link href="/dashboard" className="flex items-center gap-3" onClick={closeMobile}>
                        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg">{t('nav.health_ai')}</span>
                    </Link>
                    <button
                        onClick={closeMobile}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="px-4 py-4">
                    <Link
                        href="/chat"
                        onClick={closeMobile}
                        className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        {t('nav.new_chat')}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-3">{t('nav.platform')}</div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobile}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                    <span>{item.name}</span>
                                </div>
                                {isActive && <div className="w-1.5 h-5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200/80 dark:border-white/10">
                    <Link
                        href="/profile"
                        onClick={closeMobile}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${pathname === '/profile'
                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-white/10'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                    >
                        <Settings className="w-5 h-5 text-slate-400" />
                        {t('nav.settings')}
                    </Link>
                    <button
                        onClick={() => { handleLogout(); closeMobile(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        {t('nav.sign_out')}
                    </button>
                </div>
            </aside>

            {/* Desktop Sidebar */}
            <aside className="fixed top-0 left-0 h-full w-64 bg-slate-50/95 dark:bg-[#030712]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 z-50 flex-col hidden lg:flex transition-colors duration-300">
                {/* Logo */}
                <div className="p-6 pb-4">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20 transition-transform group-hover:scale-105">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">{t('nav.health_ai')}</span>
                    </Link>
                </div>

                {/* New Chat Action */}
                <div className="px-4 mb-6">
                    <Link
                        href="/chat"
                        className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        {t('nav.new_chat')}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-3">{t('nav.platform')}</div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                    <span>{item.name}</span>
                                </div>
                                {isActive && <div className="w-1.5 h-5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200/80 dark:border-white/10">
                    <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${pathname === '/profile'
                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-white/10'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                    >
                        <Settings className="w-5 h-5 text-slate-400" />
                        {t('nav.settings')}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        {t('nav.sign_out')}
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 z-40 lg:hidden flex items-center justify-around px-2">
                {bottomNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${isActive
                                ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium truncate max-w-[60px]">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Spacer for mobile header */}
            <div className="h-16 lg:hidden" />
        </>
    );
}

