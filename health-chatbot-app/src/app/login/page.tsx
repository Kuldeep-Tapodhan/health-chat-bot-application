'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Loader2, Activity, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-gradient-medical bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[400px] h-[400px] bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-300 group z-20"
            >
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="text-sm font-medium">Back to Home</span>
            </Link>

            {/* Main Card */}
            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="animate-fade-in-up flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 group-hover:shadow-teal-500/50 transition-all duration-500 group-hover:scale-110">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-slate-800 dark:text-white">Health AI</span>
                    </Link>
                </div>

                {/* Card */}
                <div className="animate-fade-in-up animation-delay-100 glass-card rounded-3xl p-8 md:p-10 border border-slate-200/80 dark:border-white/10 shadow-2xl bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                            Enter your credentials to access your workspace.
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                            <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.01]' : ''}`}>
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none transition-colors duration-300 ${focusedField === 'email' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="input-field !pl-12"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                            <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.01]' : ''}`}>
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none transition-colors duration-300 ${focusedField === 'password' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="input-field !pl-12"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-gradient-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 group shadow-lg shadow-emerald-500/25 active:scale-95 transition-all mt-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                </>
                            )}
                        </button>
                    </form>



                    {/* Sign Up Link */}
                    <p className="mt-8 text-center text-slate-500 dark:text-slate-400">
                        Don't have an account?{' '}
                        <Link href="/signup" className="link-teal">
                            Sign up
                        </Link>
                    </p>
                </div>

                {/* Trust Badges */}
                <div className="animate-fade-in-up animation-delay-300 mt-8 flex justify-center items-center gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>256-bit SSL</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>HIPAA Ready</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>SOC 2</span>
                </div>
            </div>
        </div>
    );
}
