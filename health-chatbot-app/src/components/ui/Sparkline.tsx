'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    strokeWidth?: number;
}

export default function Sparkline({
    data,
    color = '#14b8a6',
    height = 40,
    strokeWidth = 2,
}: SparklineProps) {
    const chartData = data.map((value, index) => ({ value, index }));

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <defs>
                        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={1000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// Generate mock weekly data for demo
export function generateWeeklyData(baseValue: number, variance: number = 0.3): number[] {
    return Array.from({ length: 7 }, (_, i) => {
        const randomFactor = 1 + (Math.random() - 0.5) * variance;
        const trendFactor = 1 + (i * 0.05); // Slight upward trend
        return Math.round(baseValue * randomFactor * trendFactor);
    });
}
