'use client';

import React from 'react';
import { Calendar, Filter, Hash } from 'lucide-react';

export type DateRangePreset = 'week1' | 'week4' | 'week12' | 'all';

export interface DateRange {
    startDate: string | null;
    endDate: string | null;
    preset: DateRangePreset;
}

interface DateRangeFilterProps {
    dateRange: DateRange;
    onChange: (range: DateRange) => void;
}

// Get today's date in YYYY-MM-DD format
function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

// Get date N days ago in YYYY-MM-DD format
function getDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

// Get current ISO week number
function getCurrentWeek(): number {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Get preset date range - using week-based calculations
function getPresetRange(preset: DateRangePreset): { startDate: string | null; endDate: string | null } {
    const today = getToday();
    switch (preset) {
        case 'week1':
            // Last 1 week (7 days)
            return { startDate: getDaysAgo(7), endDate: today };
        case 'week4':
            // Last 4 weeks (28 days)
            return { startDate: getDaysAgo(28), endDate: today };
        case 'week12':
            // Last 12 weeks (84 days / ~3 months)
            return { startDate: getDaysAgo(84), endDate: today };
        case 'all':
        default:
            return { startDate: null, endDate: null };
    }
}

export default function DateRangeFilter({ dateRange, onChange }: DateRangeFilterProps) {
    const currentWeek = getCurrentWeek();
    const currentYear = new Date().getFullYear();

    const presets: { key: DateRangePreset; label: string; description: string }[] = [
        { key: 'week1', label: 'Last Week', description: '7 days' },
        { key: 'week4', label: 'Last 4 Weeks', description: '28 days' },
        { key: 'week12', label: 'Last 12 Weeks', description: '~3 months' },
        { key: 'all', label: 'All Time', description: 'All records' },
    ];

    const handlePresetClick = (preset: DateRangePreset) => {
        const range = getPresetRange(preset);
        onChange({ ...range, preset });
    };

    const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
        onChange({
            ...dateRange,
            [field]: value || null,
            preset: 'all' // Custom date selection clears preset
        });
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Week Info Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-500/20 dark:to-cyan-500/20 border border-teal-500/20 rounded-lg">
                <Hash className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
                    Week {currentWeek}/{currentYear}
                </span>
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                {presets.map(({ key, label, description }) => (
                    <button
                        key={key}
                        onClick={() => handlePresetClick(key)}
                        title={description}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${dateRange.preset === key
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={dateRange.startDate || ''}
                        onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                        className="text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 w-32"
                        placeholder="Start Date"
                    />
                </div>
                <span className="text-slate-400 font-medium">→</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={dateRange.endDate || ''}
                        onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                        className="text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 w-32"
                        placeholder="End Date"
                    />
                </div>
            </div>
        </div>
    );
}

// Export helper for initial state
export function getDefaultDateRange(): DateRange {
    return {
        startDate: null,
        endDate: null,
        preset: 'all'
    };
}
