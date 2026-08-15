'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    TooltipProps,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AlertCircle } from 'lucide-react';

// Modern color palette with gradients
const CHART_COLORS = {
    primary: '#14b8a6',
    secondary: '#3b82f6',
    accent: '#8b5cf6',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
};

const PIE_COLORS = [
    '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#22c55e', '#ec4899', '#06b6d4', '#f97316', '#6366f1'
];

interface ChartData {
    name: string;
    count?: number;
    cases?: number;
    deaths?: number;
    outbreak_count?: number;
}

interface OutbreakChartsProps {
    stateWiseData: ChartData[];
    districtWiseData: ChartData[];
    diseaseWiseData: ChartData[];
    deathData: ChartData[];
    selectedState: string;
}

// Empty state component
const EmptyState = ({ message }: { message: string }) => (
    <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
        <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs mt-1">Try adjusting your filters or date range</p>
    </div>
);

// Custom tooltip with modern styling
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const metricName = payload[0].name || (payload[0].dataKey === 'deaths' ? 'Deaths' : 'Confirmed Cases');
        return (
            <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl backdrop-blur-sm">
                <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                    {label || payload[0].payload.name}
                </p>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: payload[0].color || CHART_COLORS.primary }}
                    />
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                        {metricName}: <span className="font-bold">{payload[0].value?.toLocaleString()}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// Custom axis tick with better styling
const CustomAxisTick = ({ x, y, payload, angle = 0 }: any) => (
    <g transform={`translate(${x},${y})`}>
        <text
            x={0}
            y={0}
            dy={16}
            textAnchor={angle ? 'end' : 'middle'}
            fill="#64748b"
            fontSize={11}
            transform={`rotate(${angle})`}
        >
            {payload.value?.length > 12 ? `${payload.value.substring(0, 12)}...` : payload.value}
        </text>
    </g>
);

export const StateWiseChart = ({ data }: { data: ChartData[] }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No state-wise data available" />;
    }

    // Map metrics and sort by cases (fallback to count)
    const sortedData = [...data]
        .map(item => ({
            ...item,
            displayValue: item.cases !== undefined ? item.cases : (item.count || 0)
        }))
        .sort((a, b) => b.displayValue - a.displayValue)
        .slice(0, 10);

    return (
        <div className="h-[300px] w-full min-h-[300px] min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <BarChart data={sortedData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                    <defs>
                        <linearGradient id="stateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={<CustomAxisTick angle={-45} />}
                        interval={0}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                    />
                    <YAxis
                        fontSize={11}
                        tick={{ fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                    <Bar
                        dataKey="displayValue"
                        fill="url(#stateGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                        name="Confirmed Cases"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const DistrictWiseChart = ({ data, state }: { data: ChartData[], state: string }) => {
    if (!data || data.length === 0) {
        return <EmptyState message={`No district data available for ${state}`} />;
    }

    // Map metrics and sort by cases (fallback to count)
    const sortedData = [...data]
        .map(item => ({
            ...item,
            displayValue: item.cases !== undefined ? item.cases : (item.count || 0)
        }))
        .sort((a, b) => b.displayValue - a.displayValue)
        .slice(0, 10);

    return (
        <div className="h-[300px] w-full min-h-[300px] min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                    <defs>
                        <linearGradient id="districtGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} horizontal={false} />
                    <XAxis
                        type="number"
                        fontSize={11}
                        tick={{ fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        dataKey="name"
                        type="category"
                        fontSize={11}
                        tick={{ fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={75}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                    <Bar
                        dataKey="displayValue"
                        fill="url(#districtGradient)"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={25}
                        name="Confirmed Cases"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const DiseaseDistributionChart = ({ data }: { data: ChartData[] }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No disease data available" />;
    }

    // Format and limit to top 8 by cases
    const limitedData = [...data]
        .map(item => ({
            ...item,
            displayValue: item.cases !== undefined ? item.cases : (item.count || 0)
        }))
        .sort((a, b) => b.displayValue - a.displayValue)
        .slice(0, 8);

    const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius * 1.3;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="#64748b"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize={11}
            >
                {name?.length > 15 ? `${name.substring(0, 15)}...` : name} ({(percent * 100).toFixed(0)}%)
            </text>
        );
    };

    return (
        <div className="h-[300px] w-full min-h-[300px] min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <PieChart>
                    <defs>
                        {PIE_COLORS.map((color, index) => (
                            <linearGradient key={`pieGrad-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                            </linearGradient>
                        ))}
                    </defs>
                    <Pie
                        data={limitedData as any}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="displayValue"
                        nameKey="name"
                        label={CustomPieLabel}
                        labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    >
                        {limitedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#pieGradient-${index % PIE_COLORS.length})`}
                                stroke="white"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export const DeathsByStateChart = ({ data }: { data: ChartData[] }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No death data available" />;
    }

    // Map deaths metric correctly
    const sortedData = [...data]
        .map(item => ({
            ...item,
            deathsVal: item.deaths !== undefined ? item.deaths : (item.count || 0)
        }))
        .filter(item => item.deathsVal > 0)
        .sort((a, b) => b.deathsVal - a.deathsVal)
        .slice(0, 10);

    if (sortedData.length === 0) {
        return <EmptyState message="No death records found" />;
    }

    return (
        <div className="h-[300px] w-full min-h-[300px] min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <BarChart data={sortedData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                    <defs>
                        <linearGradient id="deathGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={<CustomAxisTick angle={-45} />}
                        interval={0}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                    />
                    <YAxis
                        fontSize={11}
                        tick={{ fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef2f2', opacity: 0.5 }} />
                    <Bar
                        dataKey="deathsVal"
                        fill="url(#deathGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                        name="Deaths"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
