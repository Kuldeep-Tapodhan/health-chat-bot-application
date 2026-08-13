'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return null;

    return (
        <div className="flex min-h-screen bg-white dark:bg-black font-sans text-foreground">
            <Sidebar />
            <main className="lg:pl-64 w-full p-6 lg:p-8 relative min-h-screen">
                <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] -z-10" />
                <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">Settings</h1>
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-white/10">
                    <p className="text-neutral-500 dark:text-neutral-400">Settings functionality coming soon.</p>
                </div>
            </main>
        </div>
    );
}
