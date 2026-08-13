'use client';

import { useEffect, useState } from 'react';

interface ProgressRingProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    showPercentage?: boolean;
    children?: React.ReactNode;
}

export default function ProgressRing({
    progress,
    size = 80,
    strokeWidth = 6,
    color = '#14b8a6',
    backgroundColor = 'rgba(20, 184, 166, 0.1)',
    showPercentage = true,
    children,
}: ProgressRingProps) {
    const [animatedProgress, setAnimatedProgress] = useState(0);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (animatedProgress / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProgress(Math.min(100, Math.max(0, progress)));
        }, 100);
        return () => clearTimeout(timer);
    }, [progress]);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 6px ${color}40)`,
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {children || (showPercentage && (
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {Math.round(animatedProgress)}%
                    </span>
                ))}
            </div>
        </div>
    );
}
