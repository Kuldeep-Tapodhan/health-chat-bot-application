'use client';

import React from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface OutbreakRecord {
    unique_id: string;
    state_ut: string;
    district: string;
    disease_illness: string;
    cases: string;
    deaths: string;
    date_start: string;
    date_reporting: string;
    current_status: string;
    comments: string;
}

interface OutbreakTableProps {
    data: OutbreakRecord[];
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    filters: {
        search: string;
        state: string;
        district: string;
        disease: string;
    };
    onFilterChange: (filters: any) => void;
    states: string[];
}

export default function OutbreakTable({
    data,
    total,
    page,
    pageSize,
    onPageChange,
    filters,
    onFilterChange,
    states
}: OutbreakTableProps) {
    const totalPages = Math.ceil(total / pageSize);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFilterChange({ ...filters, [name]: value });
    };

    return (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Filters Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Search unique ID, state, disease..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm"
                    />
                </div>

                <div className="flex gap-2">
                    <select
                        name="state"
                        value={filters.state}
                        onChange={handleFilterChange}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 outline-none"
                    >
                        <option value="">All States</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>



                    {/* <input
                        type="text"
                        name="disease"
                        value={filters.disease}
                        onChange={handleFilterChange}
                        placeholder="Disease"
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm w-32 focus:ring-2 focus:ring-teal-500/20 outline-none"
                    /> */}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium z-10">
                        <tr>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">Canonical ID</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">State/UT</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">District</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">Disease</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">Cases</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">Deaths</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">Verification Status</th>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-white/5">Government Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {data.length > 0 ? (
                            data.map((record: any, index) => (
                                <tr key={`${index}-${record.unique_id || record.canonical_id}`} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.unique_id || record.canonical_id}</td>
                                    <td className="px-4 py-3 font-medium">{record.state_ut}</td>
                                    <td className="px-4 py-3">{record.district}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                                            {record.disease_illness}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{record.cases}</td>
                                    <td className="px-4 py-3 text-red-500 font-medium">{record.deaths}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                                            (record.verification_status || '').includes('CONFIRMED')
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                                : (record.verification_status || '').includes('UNVERIFIED')
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                        }`}>
                                            🛡️ {record.verification_status || 'OFFICIAL_REPORTED'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {record.source_url ? (
                                            <a
                                                href={record.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-teal-600 dark:text-teal-400 hover:underline text-xs font-medium inline-flex items-center gap-1"
                                            >
                                                🏛️ {record.source_name || 'Official Gov Report'} ↗
                                            </a>
                                        ) : (
                                            <span className="text-xs text-slate-400">Integrated IDSP</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-slate-400 italic">
                                    No records found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                    Showing <span className="font-medium text-slate-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-slate-900 dark:text-white">{total}</span> results
                </span>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-white dark:hover:bg-white/5 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm px-3 font-medium">Page {page} of {totalPages || 1}</span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages || totalPages === 0}
                        className="p-2 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-white dark:hover:bg-white/5 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
