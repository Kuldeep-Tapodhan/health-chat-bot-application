'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User, Loader2, Activity, ArrowRight, Check, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type Step = 'DETAILS' | 'OTP' | 'COMPLETE_SIGNUP';

function SignupContent() {
    const [step, setStep] = useState<Step>('DETAILS');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { signup } = useAuth();

    useEffect(() => {
        const emailParam = searchParams.get('email');
        const otpParam = searchParams.get('otp');
        const nameParam = searchParams.get('name');

        if (emailParam && otpParam) {
            setEmail(emailParam);
            setOtp(otpParam);
            if (nameParam) setName(nameParam);
            setStep('COMPLETE_SIGNUP');
        }
    }, [searchParams]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await apiClient.sendOtp(email, name);
            setStep('OTP');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Verify OTP
            await apiClient.verifyOtp(email, otp);

            // 2. Create Account (Appwrite)
            await signup(email, password, name);

            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Verification failed. Invalid OTP or password requirements not met.');
        } finally {
            setLoading(false);
        }
    };

    const benefits = [
        'AI-powered health insights',
        'Lab report analysis',
        'Find nearby hospitals',
        'Private & encrypted'
    ];

    return (
        <div className="min-h-screen bg-gradient-medical bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute top-1/3 left-1/2 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-300 group z-20"
            >
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="text-sm font-medium">Back to Home</span>
            </Link>

            {/* Main Container */}
            <div className="w-full max-w-5xl relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

                {/* Left - Benefits Panel */}
                <div className="hidden lg:block animate-fade-in-up">
                    <Link href="/" className="flex items-center gap-3 mb-10 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 group-hover:shadow-teal-500/50 transition-all duration-500 group-hover:scale-110">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-slate-800 dark:text-white">Health AI</span>
                    </Link>

                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                        Start your health journey today
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                        Get started with your free workspace today.
                    </p>

                    <div className="space-y-4">
                        {benefits.map((benefit, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 group"
                                style={{ animationDelay: `${idx * 100 + 200}ms` }}
                            >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                                    <Check className="w-4 h-4" />
                                </div>
                                <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300">{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right - Form Card */}
                <div className="animate-fade-in-up animation-delay-100">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-bold text-slate-800 dark:text-white">Health AI</span>
                        </Link>
                    </div>

                    <div className="glass-card rounded-3xl p-8 md:p-10">
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {step === 'DETAILS' ? 'Create account' : 'Verify Email'}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                {step === 'DETAILS'
                                    ? 'Get started with your free workspace today.'
                                    : step === 'OTP'
                                    ? `We sent a code to ${email}. Please enter it below.`
                                    : 'Please set your password to secure your account.'}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={(step === 'DETAILS') ? handleSendOtp : handleVerifyAndSignup} className="space-y-5">

                            {step === 'DETAILS' && (
                                <>
                                    {/* Name Field */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                                        <div className={`relative transition-all duration-300 ${focusedField === 'name' ? 'scale-[1.01]' : ''}`}>
                                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none transition-colors duration-300 ${focusedField === 'name' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                onFocus={() => setFocusedField('name')}
                                                onBlur={() => setFocusedField(null)}
                                                className="input-field !pl-12"
                                                placeholder="John Doe"
                                                required
                                            />
                                        </div>
                                    </div>

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
                                </>
                            )}

                            {step === 'OTP' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Verification Code</label>
                                    <div className={`relative transition-all duration-300 ${focusedField === 'otp' ? 'scale-[1.01]' : ''}`}>
                                        <Shield className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none transition-colors duration-300 ${focusedField === 'otp' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            onFocus={() => setFocusedField('otp')}
                                            onBlur={() => setFocusedField(null)}
                                            className="input-field tracking-widest text-center text-lg font-bold"
                                            placeholder="123456"
                                            maxLength={6}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStep('DETAILS')}
                                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
                                    >
                                        Change email or details
                                    </button>
                                </div>
                            )}

                            {step === 'COMPLETE_SIGNUP' && (
                                <div className="space-y-2">
                                     <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800 mb-4">
                                        <p className="text-sm text-teal-700 dark:text-teal-300 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Verification code verified automatically.
                                        </p>
                                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 pl-6">
                                            Account: {email}
                                        </p>
                                    </div>

                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Set Password</label>
                                    <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-teal-600' : 'text-slate-400'}`} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            className="input-field"
                                            placeholder="Create a strong password"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {step === 'DETAILS' ? 'Send Verification Code' : 'Verify & Create Account'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Sign In Link */}
                        <p className="mt-8 text-center text-slate-500 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link href="/login" className="link-teal">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
