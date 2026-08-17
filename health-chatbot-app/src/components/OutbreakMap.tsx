'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';

interface StateData {
    name: string;
    count: number;
    deaths: number;
    cases?: number; // Number of patients/cases
}

interface OutbreakMapProps {
    stateData: StateData[];
    onStateClick?: (stateName: string) => void;
}

// India GeoJSON - simplified boundaries for states
const INDIA_GEOJSON_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';

// Color scale based on NUMBER OF CASES - 0 to 100 scale
function getColor(cases: number): string {
    if (cases === 0) return '#22c55e';    // Green - No cases
    if (cases <= 10) return '#84cc16';    // Lime - Very Low
    if (cases <= 25) return '#facc15';    // Yellow - Low
    if (cases <= 50) return '#fb923c';    // Orange - Moderate
    if (cases <= 75) return '#f97316';    // Dark Orange - High
    if (cases <= 90) return '#ef4444';    // Red - Very High
    return '#991b1b';                      // Dark Red - Critical (90+)
}

function getColorDark(cases: number): string {
    if (cases === 0) return '#22c55e';    // Green - No cases  
    if (cases <= 10) return '#84cc16';    // Lime
    if (cases <= 25) return '#facc15';    // Yellow
    if (cases <= 50) return '#fb923c';    // Orange
    if (cases <= 75) return '#f97316';    // Dark Orange
    if (cases <= 90) return '#ef4444';    // Red
    return '#991b1b';                      // Critical
}

// Get risk level from cases count (0-100 scale)
function getRiskLevel(cases: number): { label: string; color: string } {
    if (cases === 0) return { label: 'Safe', color: 'text-green-500 bg-green-500/10' };
    if (cases <= 25) return { label: 'Low', color: 'text-yellow-500 bg-yellow-500/10' };
    if (cases <= 50) return { label: 'Medium', color: 'text-orange-500 bg-orange-500/10' };
    if (cases <= 75) return { label: 'High', color: 'text-red-500 bg-red-500/10' };
    return { label: 'Critical', color: 'text-red-700 bg-red-500/20' };
}

// Legend component with 0-100 scale
function Legend({ isDark }: { isDark: boolean }) {
    const levels = [
        { label: 'Safe (0)', color: '#22c55e' },
        { label: 'Low (1-25)', color: '#facc15' },
        { label: 'Medium (26-50)', color: '#fb923c' },
        { label: 'High (51-75)', color: '#ef4444' },
        { label: 'Critical (76-100)', color: '#991b1b' },
    ];

    return (
        <div className={`absolute bottom-6 right-6 z-[1000] p-4 rounded-xl shadow-lg ${isDark ? 'bg-slate-900/95 border border-white/10' : 'bg-white/95 border border-slate-200'
            }`}>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Cases (0-100)
            </h4>
            {levels.map((level) => (
                <div key={level.label} className="flex items-center gap-2 text-xs mb-1.5">
                    <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: level.color }}
                    />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                        {level.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Map bounds handler - Strictly limit to India only
function MapBounds() {
    const map = useMap();

    useEffect(() => {
        // Set strict bounds for India only
        const indiaBounds: [[number, number], [number, number]] = [
            [6.5, 68.0],   // Southwest corner (near Kerala/Tamil Nadu)
            [37.5, 97.5]   // Northeast corner (near Arunachal Pradesh)
        ];

        // Center on India with appropriate zoom
        map.setView([22.5937, 78.9629], 4.5);

        // Set max bounds - prevents panning outside India
        map.setMaxBounds(indiaBounds);

        // Set min zoom to prevent zooming out too far
        map.setMinZoom(4);
        map.setMaxZoom(10);

        // Fit bounds to India
        map.fitBounds(indiaBounds, { padding: [20, 20] });
    }, [map]);

    return null;
}

export default function OutbreakMap({ stateData, onStateClick }: OutbreakMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [hoveredState, setHoveredState] = useState<string | null>(null);

    // Check dark mode
    useEffect(() => {
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkDark();

        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    // Fetch GeoJSON
    useEffect(() => {
        fetch(INDIA_GEOJSON_URL)
            .then(res => res.json())
            .then((data: FeatureCollection) => setGeoData(data))
            .catch(err => console.error('Failed to load India GeoJSON:', err));
    }, []);

    // Map state name from GeoJSON to our data
    const getStateData = (stateName: string | undefined | null): StateData | undefined => {
        if (!stateName || typeof stateName !== 'string' || !Array.isArray(stateData)) return undefined;
        // Handle common name variations
        const nameMap: Record<string, string> = {
            'Andaman and Nicobar': 'Andaman and Nicobar Islands',
            'Arunachal Pradesh': 'Arunachal Pradesh',
            'Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
            'NCT of Delhi': 'Delhi',
            'Jammu and Kashmir': 'Jammu & Kashmir',
            'Orissa': 'Odisha'
        };

        const mappedName = nameMap[stateName] || stateName;
        const targetMapped = (mappedName || '').toLowerCase();
        const targetState = (stateName || '').toLowerCase();

        return stateData.find(s => {
            if (!s || !s.name || typeof s.name !== 'string') return false;
            const sName = s.name.toLowerCase();
            return sName === targetMapped || sName === targetState;
        });
    };

    // Style each state feature - use CASES (patient count) for coloring
    const style = (feature: Feature<Geometry, any> | undefined) => {
        if (!feature) return {};

        const stateName = feature.properties?.NAME_1 || feature.properties?.name || '';
        const data = getStateData(stateName);
        // Use cases (patients) if available, otherwise fall back to count
        const cases = data?.cases || data?.count || 0;
        const isHovered = hoveredState === stateName;

        const getColorFn = isDark ? getColorDark : getColor;

        return {
            fillColor: getColorFn(cases),
            weight: isHovered ? 3 : 1,
            opacity: 1,
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            fillOpacity: isHovered ? 0.9 : 0.7
        };
    };

    // Event handlers for each feature
    const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer) => {
        const stateName = feature.properties?.NAME_1 || feature.properties?.name || 'Unknown';
        const data = getStateData(stateName);

        // Popup content - show Cases prominently
        const cases = data?.cases || data?.count || 0;
        const popupContent = `
            <div class="p-2 min-w-[200px]">
                <h3 class="font-bold text-lg mb-2">${stateName}</h3>
                <div class="space-y-1 text-sm">
                    <p><span class="font-medium text-red-600">Cases:</span> <strong>${cases}</strong></p>
                    <p><span class="font-medium">Outbreaks:</span> ${data?.count || 0}</p>
                    <p><span class="font-medium">Deaths:</span> ${data?.deaths || 0}</p>
                </div>
                ${data ? '<p class="text-xs text-gray-500 mt-2">Click to filter data</p>' : ''}
            </div>
        `;

        layer.bindPopup(popupContent);

        layer.on({
            mouseover: (e) => {
                setHoveredState(stateName);
                e.target.bringToFront();
            },
            mouseout: () => {
                setHoveredState(null);
            },
            click: () => {
                if (onStateClick && data) {
                    onStateClick(data.name);
                }
            }
        });
    };

    if (!geoData) {
        return (
            <div className="h-[500px] flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-500 dark:text-slate-400">Loading map...</span>
                </div>
            </div>
        );
    }

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    return (
        <div className="relative h-[500px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
            <MapContainer
                center={[22.5937, 78.9629]}
                zoom={4.5}
                className="h-full w-full"
                zoomControl={true}
                scrollWheelZoom={true}
                style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}
            >
                <MapBounds />
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url={tileUrl}
                />
                <GeoJSON
                    key={isDark ? 'dark' : 'light'}
                    data={geoData}
                    style={style}
                    onEachFeature={onEachFeature}
                />
            </MapContainer>
            <Legend isDark={isDark} />

            {/* Info tooltip */}
            {hoveredState && (
                <div className={`absolute top-4 left-4 z-[1000] px-3 py-2 rounded-lg shadow-lg ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                    }`}>
                    <span className="font-medium">{hoveredState}</span>
                    {getStateData(hoveredState) && (
                        <span className="ml-2 text-teal-500">
                            {getStateData(hoveredState)?.count} outbreaks
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
