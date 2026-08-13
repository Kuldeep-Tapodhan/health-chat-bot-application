'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';

// Skeleton component for lazy loading
function LoadingFallback({ className }: { className?: string }) {
    return (
        <div className= {`animate-pulse bg-slate-200 dark:bg-white/10 rounded-xl ${className || 'h-32 w-full'}`
} />
    );
}

// Lazy load heavy components
export const LazyChartRenderer = dynamic(
    () => import('@/components/ChartRenderer'),
    {
        loading: () => <LoadingFallback className="h-64 w-full" />,
        ssr: false,
    }
);

export const LazyOnboardingModal = dynamic(
    () => import('@/components/OnboardingModal'),
    {
        loading: () => null,
        ssr: false,
    }
);

// Generic lazy loader factory
export function createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallbackClassName?: string
) {
    return dynamic(importFn, {
        loading: () => <LoadingFallback className={ fallbackClassName } />,
        ssr: false,
    });
}

// Preload hint for critical components
export function preloadComponent(importFn: () => Promise<any>) {
    // Trigger the import but don't wait for it
    importFn().catch(() => {
        // Silently handle preload errors
    });
}
