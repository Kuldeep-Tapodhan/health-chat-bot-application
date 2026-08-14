'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
    Activity,
    Map,
    AlertTriangle,
    BarChart3,
    PieChart as PieChartIcon,
    Table as TableIcon,
    RefreshCcw,
    ChevronDown,
    MapPin,
    Bell,
    TrendingUp,
    TrendingDown,
    Flame,
    Download,
    Share2,
    Maximize2,
    Filter,
    X
} from 'lucide-react';
import {
    StateWiseChart,
    DistrictWiseChart,
    DiseaseDistributionChart,
    DeathsByStateChart
} from './OutbreakCharts';
import OutbreakTable from './OutbreakTable';
import AlertSubscription from './AlertSubscription';
import ThemeToggle from './ThemeToggle';
import Sparkline, { generateWeeklyData } from './ui/Sparkline';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './ui/DateRangeFilter';
import { apiClient } from '@/lib/api-client';

// Dynamic import for Leaflet (no SSR)
const OutbreakMap = dynamic(() => import('./OutbreakMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 dark:text-slate-400">Loading map...</span>
            </div>
        </div>
    )
});

// Risk level helper
function getRiskLevel(count: number): { label: string; color: string; bg: string } {
    if (count === 0) return { label: 'Safe', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (count <= 5) return { label: 'Low', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (count <= 20) return { label: 'Medium', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (count <= 50) return { label: 'High', color: 'text-red-500', bg: 'bg-red-500/10' };
    return { label: 'Critical', color: 'text-red-700', bg: 'bg-red-500/20' };
}

export default function OutbreakDashboard() {
    const [loading, setLoading] = useState(true);
    const [states, setStates] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedDisease, setSelectedDisease] = useState('All Diseases');

    // Chart data
    const [stateWiseData, setStateWiseData] = useState<any[]>([]);
    const [districtWiseData, setDistrictWiseData] = useState<any[]>([]);
    const [diseaseWiseData, setDiseaseWiseData] = useState<any[]>([]);
    const [deathData, setDeathData] = useState<any[]>([]);
    const [mapData, setMapData] = useState<any[]>([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const [userId] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'guest');

    // Table data
    const [tableData, setTableData] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [tableFilters, setTableFilters] = useState({
        search: '',
        state: '',
        district: '',
        disease: ''
    });

    // Date range filter state
    const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

    // Build date query params
    const getDateParams = () => {
        const params = new URLSearchParams();
        if (dateRange.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);
        return params.toString();
    };

    // Fetch initial list of all states once
    useEffect(() => {
        const fetchStatesList = async () => {
            try {
                const res = await apiClient.getOutbreaks({ type: 'all_states' });
                const fetched = res.states || [];
                const fullStatesList = ['All States', ...fetched.filter((s: string) => s !== 'All States')];
                setStates(fullStatesList);
                setSelectedState('All States');
            } catch (err) {
                console.error('Failed to fetch states list:', err);
                setStates(['All States']);
                setSelectedState('All States');
            }
        };
        fetchStatesList();
    }, []);

    // Load state, disease & date filtered dashboard metrics (stats, charts, map)
    useEffect(() => {
        const fetchDashboardMetrics = async () => {
            try {
                const params: any = {};
                if (selectedState && selectedState !== 'All States') {
                    params.state = selectedState;
                }
                if (selectedDisease && selectedDisease !== 'All Diseases') {
                    params.disease = selectedDisease;
                }
                if (dateRange.startDate) params.startDate = dateRange.startDate;
                if (dateRange.endDate) params.endDate = dateRange.endDate;

                const [statsRes, sWiseData, dWiseData, disWiseData, dData, mData] = await Promise.all([
                    apiClient.getOutbreaks({ type: 'stats', ...params }),
                    apiClient.getOutbreaks({ type: 'states', ...params }),
                    apiClient.getOutbreaks({ type: 'districts', ...params }),
                    apiClient.getOutbreaks({ type: 'diseases', ...params }),
                    apiClient.getOutbreaks({ type: 'deaths', ...params }),
                    apiClient.getOutbreaks({ type: 'mapdata', ...params })
                ]);

                // Metrics are computed reactively
                setStateWiseData(Array.isArray(sWiseData) ? sWiseData : []);
                setDistrictWiseData(Array.isArray(dWiseData) ? dWiseData : []);
                setDiseaseWiseData(Array.isArray(disWiseData) ? disWiseData : []);
                setDeathData(Array.isArray(dData) ? dData : []);
                setMapData(Array.isArray(mData) ? mData : []);
            } catch (error) {
                console.error('Failed to fetch dashboard metrics:', error);
            }
        };
        fetchDashboardMetrics();
    }, [selectedState, selectedDisease, dateRange]);

    // Load table data (with date filter)
    useEffect(() => {
        const fetchTableData = async () => {
            setLoading(true);
            try {
                const params: any = {
                    type: 'table',
                    page: page.toString(),
                    search: tableFilters.search || '',
                    state: (tableFilters.state || (selectedState !== 'All States' ? selectedState : '')),
                    district: tableFilters.district || '',
                    disease: tableFilters.disease || ''
                };
                
                // Clean up empty params
                Object.keys(params).forEach(k => !params[k] && delete params[k]);

                // Add date parameters
                if (dateRange.startDate) params.startDate = dateRange.startDate;
                if (dateRange.endDate) params.endDate = dateRange.endDate;

                const result = await apiClient.getOutbreaks(params);
                setTableData(result.data || []);
                setTotalRecords(result.total || 0);
            } catch (error) {
                console.error('Failed to fetch table data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTableData();
    }, [page, tableFilters, dateRange, selectedState]);

    // Calculate stats
    const totalOutbreaks = stateWiseData.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
    const totalDeaths = deathData.reduce((acc: number, curr: any) => acc + (parseInt(curr.deaths || curr.count) || 0), 0);
    const totalCases = (stateWiseData.length > 0 ? stateWiseData : mapData).reduce((acc: number, curr: any) => acc + (parseInt(curr.cases) || 0), 0);

    // Top 5 Hotspots - use districtWiseData when state is selected, or mapData when All States is selected
    const hotspotList = (selectedState && selectedState !== 'All States' ? districtWiseData : mapData);
    const topHotspots = [...hotspotList]
        .sort((a, b) => (parseInt(b.cases || b.count) || 0) - (parseInt(a.cases || a.count) || 0))
        .slice(0, 5);

    // Check if no data available for the selected date range
    const hasNoData = dateRange.preset !== 'all' && totalOutbreaks === 0 && stateWiseData.length === 0;

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50/50 dark:bg-transparent min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-teal-500" />
                        Health Outbreak Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Monitoring health disease trends and records across regions.</p>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle compact={true} />
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCcw className="w-5 h-5 text-slate-400/80" />
                    </button>
                    <button
                        onClick={() => setShowAlerts(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all relative"
                        title="Alert Settings"
                    >
                        <Bell className="w-5 h-5 text-slate-400/80" />
                    </button>
                </div>
            </header>

            {/* Prominent Left-Aligned Filter Toolbar */}
            <div className="bg-white dark:bg-[#0c1424] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm animate-fade-in-up space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                            <Filter className="w-4 h-4 text-teal-500" />
                            <span>Dashboard Filters:</span>
                        </div>

                        {/* State Filter Dropdown */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl shadow-xs">
                            <MapPin className="w-4 h-4 text-teal-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">State:</span>
                            <select
                                value={selectedState}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedState(val);
                                    setTableFilters(prev => ({ ...prev, state: val === 'All States' ? '' : val }));
                                }}
                                className="text-sm bg-transparent outline-none font-semibold text-slate-900 dark:text-white dark:bg-slate-900 cursor-pointer"
                            >
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Disease Filter Dropdown */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl shadow-xs">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Disease:</span>
                            <select
                                value={selectedDisease}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedDisease(val);
                                    setTableFilters(prev => ({ ...prev, disease: val === 'All Diseases' ? '' : val }));
                                }}
                                className="text-sm bg-transparent outline-none font-semibold text-slate-900 dark:text-white dark:bg-slate-900 cursor-pointer"
                            >
                                {['All Diseases', 'Dengue', 'Chikungunya', 'Nipah virus', 'Cholera', 'Malaria', 'Typhoid'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Reset All Filters Button */}
                    {(selectedState !== 'All States' || selectedDisease !== 'All Diseases' || dateRange.preset !== 'all') && (
                        <button
                            onClick={() => {
                                setSelectedState('All States');
                                setSelectedDisease('All Diseases');
                                setDateRange({ startDate: null, endDate: null, preset: 'all' });
                                setTableFilters({ search: '', state: '', district: '', disease: '' });
                            }}
                            className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            Reset All Filters
                        </button>
                    )}
                </div>

                <DateRangeFilter dateRange={dateRange} onChange={setDateRange} />
            </div>

            {/* Empty State Message */}
            {hasNoData && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 rounded-2xl flex items-center gap-3 animate-fade-in-up">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-amber-800 dark:text-amber-300 font-medium">No data available for the selected date range</p>
                        <p className="text-amber-600 dark:text-amber-400 text-sm">Try selecting a different date range or switch to "All Time" to view all records.</p>
                    </div>
                    <button
                        onClick={() => setDateRange({ startDate: null, endDate: null, preset: 'all' })}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        View All Time
                    </button>
                </div>
            )}

            {/* Stats Overview with Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Outbreaks"
                    value={totalOutbreaks}
                    icon={<Activity className="w-5 h-5" />}
                    trend={totalOutbreaks > 50 ? 'High activity' : 'Moderate'}
                    trendUp={totalOutbreaks > 50}
                    sparklineData={generateWeeklyData(totalOutbreaks || 10)}
                    sparklineColor="#14b8a6"
                />
                <StatCard
                    title="Total Deaths"
                    value={totalDeaths}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    trend="Requires attention"
                    color="text-red-500"
                    trendUp={false}
                    sparklineData={generateWeeklyData(totalDeaths || 5)}
                    sparklineColor="#ef4444"
                />
                <StatCard
                    title="Active Regions"
                    value={states.length}
                    icon={<Map className="w-5 h-5" />}
                    trend="State-wide coverage"
                    sparklineData={generateWeeklyData(states.length || 15)}
                    sparklineColor="#8b5cf6"
                />
                <StatCard
                    title="Latest Reporting"
                    value={tableData[0]?.date_reporting || 'N/A'}
                    icon={<RefreshCcw className="w-5 h-5" />}
                    trend="Real-time updates"
                    isDate
                />
            </div>

            {/* Top 5 Hotspots */}
            <div className="bg-white dark:bg-[#0c1424] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                    <div className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
                        <Flame className="w-5 h-5" />
                    </div>
                    Top 5 Hotspots
                    <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400">
                        Highest outbreak areas
                    </span>
                </h3>
                {topHotspots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                        <Flame className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No hotspot data available</p>
                        <p className="text-xs mt-1">Try selecting "All Time" or a different date range</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {topHotspots.map((state, idx) => {
                            const cases = parseInt(state.cases) || 0;
                            const risk = getRiskLevel(cases);
                            return (
                                <div
                                    key={state.name}
                                    onClick={() => setSelectedState(state.name)}
                                    className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 cursor-pointer hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">#{idx + 1}</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${risk.color} ${risk.bg}`}>
                                            {risk.label}
                                        </span>
                                    </div>
                                    <p className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-teal-500 transition-colors">
                                        {state.name}
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                        {cases}
                                        <span className="text-sm font-normal text-slate-400 ml-1">cases</span>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Interactive Map Section */}
            <div className="bg-white dark:bg-[#0c1424] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                    <div className="p-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                        <MapPin className="w-5 h-5" />
                    </div>
                    Interactive Outbreak Map
                    <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400">
                        🟢 Safe • 🟡 Low • 🟠 Medium • 🔴 High • ⚫ Critical
                    </span>
                </h3>
                <OutbreakMap
                    stateData={mapData}
                    onStateClick={(stateName) => {
                        setSelectedState(stateName);
                        setTableFilters(prev => ({ ...prev, state: stateName }));
                    }}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper
                    title={!selectedState || selectedState === 'All States' ? "Top Affected States (Nationwide)" : `Outbreak Statistics in ${selectedState}`}
                    icon={<BarChart3 className="w-5 h-5" />}
                    delay="0.3s"
                >
                    <StateWiseChart data={stateWiseData} />
                </ChartWrapper>

                <ChartWrapper
                    title={!selectedState || selectedState === 'All States' ? "State vs Total Deaths (Nationwide)" : `District Deaths in ${selectedState}`}
                    icon={<BarChart3 className="w-5 h-5" />}
                    delay="0.35s"
                >
                    <DeathsByStateChart data={deathData} />
                </ChartWrapper>

                <ChartWrapper
                    title={!selectedState || selectedState === 'All States' ? "Top Affected Districts (Nationwide)" : `District Breakdown in ${selectedState}`}
                    icon={<BarChart3 className="w-5 h-5" />}
                    delay="0.4s"
                >
                    <DistrictWiseChart data={districtWiseData} state={selectedState} />
                </ChartWrapper>

                <ChartWrapper
                    title={!selectedState || selectedState === 'All States' ? "Disease Distribution (Nationwide)" : `Disease Distribution in ${selectedState}`}
                    icon={<PieChartIcon className="w-5 h-5" />}
                    delay="0.45s"
                >
                    <DiseaseDistributionChart data={diseaseWiseData} />
                </ChartWrapper>
            </div>

            {/* Table View */}
            <div className="h-[600px] animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <OutbreakTable
                    data={tableData}
                    total={totalRecords}
                    page={page}
                    pageSize={10}
                    onPageChange={setPage}
                    filters={tableFilters}
                    onFilterChange={setTableFilters}
                    states={states}
                />
            </div>

            {/* Alert Subscription Modal */}
            {showAlerts && (
                <AlertSubscription
                    userId={userId}
                    states={states}
                    onClose={() => setShowAlerts(false)}
                />
            )}
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend: string;
    color?: string;
    isDate?: boolean;
    trendUp?: boolean;
    sparklineData?: number[];
    sparklineColor?: string;
}

function StatCard({
    title,
    value,
    icon,
    trend,
    color = 'text-teal-500',
    isDate = false,
    trendUp,
    sparklineData,
    sparklineColor = '#14b8a6'
}: StatCardProps) {
    return (
        <div className="bg-white dark:bg-[#0c1424] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm animate-fade-in-up group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
                <div className={`p-2 bg-slate-50 dark:bg-white/5 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className={`text-2xl font-bold dark:text-white ${isDate ? 'text-lg' : ''}`}>{value}</span>
                    <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        {trendUp !== undefined && (
                            trendUp ? <TrendingUp className="w-3 h-3 text-red-500" /> : <TrendingDown className="w-3 h-3 text-green-500" />
                        )}
                        {trend}
                    </span>
                </div>
                {sparklineData && (
                    <div className="w-20 h-10">
                        <Sparkline data={sparklineData} color={sparklineColor} height={40} />
                    </div>
                )}
            </div>
        </div>
    );
}

function ChartWrapper({ title, icon, children, delay }: { title: string, icon: React.ReactNode, children: React.ReactNode, delay?: string }) {
    return (
        <div className="bg-white dark:bg-[#0c1424] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm animate-fade-in-up" style={delay ? { animationDelay: delay } : undefined}>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <div className="p-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                    {icon}
                </div>
                {title}
            </h3>
            {children}
        </div>
    );
}
