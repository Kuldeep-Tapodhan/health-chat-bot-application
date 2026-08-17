"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// New simplified data format matching the AI output schema
interface ChartDataItem {
    name: string;
    value: number;
    [key: string]: any;
}

interface ChartData {
    type: 'bar' | 'line' | 'pie';
    title?: string;
    data: ChartDataItem[];
}

interface ChartRendererProps {
    data: ChartData;
}

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#ec4899'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
    let chartData = data?.data || [];

    // Check if data is in the "old" format (from backend prompt)
    if ((data as any)?.labels && (data as any)?.datasets && Array.isArray((data as any).datasets) && (data as any).datasets.length > 0) {
        const labels = (data as any).labels;
        const dataset = (data as any).datasets[0];
        if (labels && dataset && Array.isArray(dataset.data)) {
            chartData = labels.map((label: string, index: number) => ({
                name: label,
                value: dataset.data[index]
            }));
        }
    }

    if (!Array.isArray(chartData) || chartData.length === 0) return null;

    const renderChart = () => {
        // Use chartData instead of data.data
        switch (data.type) {
            case 'bar':
                return (
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend wrapperStyle={{ color: '#94a3b8' }} />
                        <Bar
                            dataKey="value"
                            fill="#14b8a6"
                            radius={[4, 4, 0, 0]}
                        >
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend wrapperStyle={{ color: '#94a3b8' }} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            dot={{ fill: '#14b8a6', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#14b8a6' }}
                        />
                    </LineChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#14b8a6"
                            dataKey="value"
                        >
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#f1f5f9'
                            }}
                        />
                        <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    </PieChart>
                );
            default:
                return <div className="text-red-400">Unsupported chart type: {data.type}</div>;
        }
    };

    return (
        <div className="w-full my-4 p-4 bg-[#1e293b]/50 rounded-xl border border-white/10 backdrop-blur-sm">
            {data.title && (
                <h3 className="text-sm font-semibold text-white mb-3 text-center">{data.title}</h3>
            )}
            <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartRenderer;
