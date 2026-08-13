'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

export default function Skeleton({
    className,
    variant = 'rectangular',
    width,
    height,
    lines = 1,
}: SkeletonProps) {
    const baseClasses = 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%]';

    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
        card: 'rounded-2xl',
    };

    const style = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    if (variant === 'text' && lines > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(baseClasses, variantClasses.text, className)}
                        style={{
                            ...style,
                            width: i === lines - 1 ? '60%' : style.width || '100%',
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(baseClasses, variantClasses[variant], className)}
            style={style}
        />
    );
}

// Pre-built skeleton compositions
export function SkeletonCard() {
    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
                <Skeleton variant="circular" width={48} height={48} />
                <Skeleton width={80} height={24} className="rounded-full" />
            </div>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="60%" height={16} />
        </div>
    );
}

export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
    return (
        <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <Skeleton variant="circular" width={36} height={36} />}
            <div className="space-y-2" style={{ maxWidth: '400px' }}>
                <Skeleton variant="card" height={60} width={300} />
            </div>
            {isUser && <Skeleton variant="circular" width={36} height={36} />}
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card p-6 space-y-4">
                        <Skeleton variant="circular" width={56} height={56} />
                        <Skeleton variant="text" lines={2} />
                    </div>
                ))}
            </div>
        </div>
    );
}
