'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled runtime error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center p-6">
            <div className="max-w-md w-full glass p-8 rounded-2xl border border-rose-500/20 shadow-xl text-center space-y-6 animate-scale-in">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-500/20">
                    <AlertTriangle className="w-8 h-8 animate-bounce" />
                </div>
                
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Something went wrong</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {error?.message || 'An unexpected error occurred. Don’t worry, your health data is safe.'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                        onClick={() => reset()}
                        className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <RefreshCw className="w-4 h-4" /> Try Again
                    </button>
                    <Link
                        href="/dashboard"
                        className="py-2.5 px-5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Home className="w-4 h-4" /> Go to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
