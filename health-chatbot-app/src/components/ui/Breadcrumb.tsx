'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    showHome?: boolean;
}

export default function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
    const allItems = showHome
        ? [{ label: 'Home', href: '/dashboard' }, ...items]
        : items;

    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
            {allItems.map((item, index) => {
                const isLast = index === allItems.length - 1;
                const isFirst = index === 0 && showHome;

                return (
                    <div key={index} className="flex items-center gap-1">
                        {index > 0 && (
                            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                        {item.href && !isLast ? (
                            <Link
                                href={item.href}
                                className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            >
                                {isFirst && <Home className="w-4 h-4" />}
                                <span>{item.label}</span>
                            </Link>
                        ) : (
                            <span className="flex items-center gap-1 text-slate-900 dark:text-white font-medium">
                                {isFirst && <Home className="w-4 h-4" />}
                                {item.label}
                            </span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
