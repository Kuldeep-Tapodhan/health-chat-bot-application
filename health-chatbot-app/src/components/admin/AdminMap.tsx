'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface HeatmapPoint {
    lat: number;
    lng: number;
    intensity: number;
}

interface AdminMapProps {
    data: HeatmapPoint[];
    isDark?: boolean;
}

export default function AdminMap({ data, isDark = true }: AdminMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-[400px] flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                <span className="text-slate-500 dark:text-slate-400">Loading map...</span>
            </div>
        );
    }

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    return (
        <div className="relative h-[400px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 z-0">
            <MapContainer
                center={[20.5937, 78.9629]} // India Center
                zoom={4}
                className="h-full w-full"
                scrollWheelZoom={false}
                style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url={tileUrl}
                />
                {data.map((point, idx) => (
                    <CircleMarker
                        key={idx}
                        center={[point.lat, point.lng]}
                        pathOptions={{
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.6,
                            weight: 0
                        }}
                        radius={15} // Large radius to simulate heatmap
                    >
                        <Popup>
                            <div className="text-black">
                                <strong>Search Activity</strong><br />
                                Intensity: {point.intensity}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-4 right-4 bg-black/80 p-3 rounded-lg backdrop-blur-sm border border-white/10 z-[1000]">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
                    <span className="text-xs text-white">Search Hotspots</span>
                </div>
            </div>
        </div>
    );
}
