'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Something went wrong
                        </h1>

                        {/* Description */}
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            We encountered an unexpected error. Please try again or return to the homepage.
                        </p>

                        {/* Error details (dev mode) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-left">
                                <p className="text-sm font-mono text-red-600 dark:text-red-400 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <Link
                                href="/dashboard"
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
