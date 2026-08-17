import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center p-6">
            <div className="max-w-md w-full glass p-8 rounded-2xl border border-indigo-500/20 shadow-xl text-center space-y-6 animate-scale-in">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-500 border border-indigo-500/20">
                    <FileQuestion className="w-8 h-8 animate-subtle-float" />
                </div>
                
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">404</h1>
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-1">Page Not Found</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        The requested medical portal page doesn’t exist or has been moved.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link
                        href="/dashboard"
                        className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Home className="w-4 h-4" /> Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
