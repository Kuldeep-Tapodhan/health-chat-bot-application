'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import {
    MapPin, Star, Loader2, Navigation, Activity,
    Search as SearchIcon, Phone, Plus, Filter,
    Clock, Map as MapIcon, Locate, ArrowRight, X
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import toast from 'react-hot-toast';

const libraries: ("places")[] = ['places'];

interface Hospital {
    id: string;
    place_id: string;
    name: string;
    address: string;
    location: google.maps.LatLngLiteral;
    rating?: number;
    user_ratings_total?: number;
    photos?: string[];
    types?: string[];
    isOpen?: boolean;
    phone?: string;
    website?: string;
    formatted_phone_number?: string;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

const defaultCenter = {
    lat: 28.6139,
    lng: 77.2090
};

// Modern, Clean Map Style
const CLEAN_MAP_STYLE = [
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#747474" }]
    },
    {
        "featureType": "poi.medical",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#ffecec" }] // Subtle red tint for medical
    },
    {
        "featureType": "poi.medical",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d93025" }]
    }
];

// Updated Filters
const HOSPITAL_TYPES = [
    { id: 'hospital', label: 'All' },
    { id: 'dental', label: 'Dentist', keyword: 'dentist' },
    { id: 'eye_care', label: 'Eye Care', keyword: 'eye hospital' },
    { id: 'cardiology', label: 'Heart', keyword: 'cardiology' },
    { id: 'pediatric', label: 'Pediatric', keyword: 'pediatric' },
    { id: 'orthopedic', label: 'Ortho', keyword: 'orthopedic' },
    { id: 'maternity', label: 'Maternity', keyword: 'maternity' },
    { id: 'pharmacy', label: 'Pharmacy', keyword: 'pharmacy' },
];

const RADIUS_OPTIONS = [
    { value: 3000, label: '3 km' },
    { value: 5000, label: '5 km' },
    { value: 10000, label: '10 km' },
    { value: 20000, label: '20 km' },
];

export default function HospitalsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [searching, setSearching] = useState(false);

    // State
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [selectedType, setSelectedType] = useState('hospital');
    const [radius, setRadius] = useState(3000);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showMapMobile, setShowMapMobile] = useState(false);

    // Scroll ref for list
    const listTopRef = useRef<HTMLDivElement>(null);
    const nextPageTokenRef = useRef<google.maps.places.PlaceSearchPagination | null>(null);

    const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: mapsApiKey,
        libraries,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Initial load - Get location once map is ready
    useEffect(() => {
        if (isLoaded && !userLocation && !searching) {
            handleGetLocation();
        }
    }, [isLoaded]);

    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Re-search when Type or Radius changes
    useEffect(() => {
        if (userLocation && map) {
            searchNearbyHospitals(userLocation, selectedType, radius);
        }
    }, [selectedType, radius, map, userLocation]);

    const fetchHospitalDetails = async (service: google.maps.places.PlacesService, placeId: string): Promise<Partial<Hospital>> => {
        return new Promise((resolve) => {
            service.getDetails(
                {
                    placeId: placeId,
                    fields: ['opening_hours', 'formatted_phone_number', 'website', 'photos']
                },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        const photos = place.photos?.map(photo => photo.getUrl({ maxWidth: 400 })).filter(url => url !== undefined) as string[];
                        resolve({
                            isOpen: place.opening_hours?.isOpen(),
                            phone: place.formatted_phone_number,
                            website: place.website,
                            photos: photos,
                            formatted_phone_number: place.formatted_phone_number
                        });
                    } else {
                        resolve({});
                    }
                }
            );
        });
    };

    const searchNearbyHospitals = useCallback((location: google.maps.LatLngLiteral, typeId: string, searchRadius: number) => {
        if (!map) return;

        setSearching(true);
        setError(null);
        setSelectedHospital(null);
        setHospitals([]);
        nextPageTokenRef.current = null;

        // Scroll to top of list
        if (listTopRef.current) listTopRef.current.scrollTop = 0;

        const service = new google.maps.places.PlacesService(map);
        const typeConfig = HOSPITAL_TYPES.find(t => t.id === typeId);
        const keyword = typeConfig?.keyword;

        const request: google.maps.places.PlaceSearchRequest = {
            location: location,
            radius: searchRadius,
            type: typeId === 'pharmacy' ? 'pharmacy' : 'hospital',
            keyword: keyword
        };

        service.nearbySearch(request, (results, status, pagination) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const mappedResults: Hospital[] = results.map(place => ({
                    id: place.place_id!,
                    place_id: place.place_id!,
                    name: place.name!,
                    address: place.vicinity!,
                    location: {
                        lat: place.geometry!.location!.lat(),
                        lng: place.geometry!.location!.lng()
                    },
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    types: place.types,
                    photos: place.photos?.map(p => p.getUrl({ maxWidth: 400 }))
                }));

                setHospitals(mappedResults);
                setSearching(false);

                if (pagination && pagination.hasNextPage) {
                    nextPageTokenRef.current = pagination;
                } else {
                    nextPageTokenRef.current = null;
                }

                if (mappedResults.length > 0) {
                    const bounds = new google.maps.LatLngBounds();
                    mappedResults.forEach(h => bounds.extend(h.location));
                    bounds.extend(location);
                    map.fitBounds(bounds);
                }

            } else {
                setHospitals([]);
                setSearching(false);
                if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    setError("No facilities found matching your criteria.");
                } else {
                    setError("Unable to fetch data.");
                }
            }
        });
    }, [map]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported");
            return;
        }

        setSearching(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(loc);
                map?.panTo(loc);
                map?.setZoom(14); // Zoom in
            },
            (error) => {
                setSearching(false);
                console.error("Geolocation error:", error);

                let errorMessage = "Unable to retrieve location";
                if (error.code === 1) errorMessage = "Location permission denied. Please enable location services.";
                else if (error.code === 2) errorMessage = "Location unavailable. Check your GPS signal.";
                else if (error.code === 3) errorMessage = "Location request timed out.";

                toast.error(errorMessage);
                setError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleHospitalSelect = async (hospital: Hospital) => {
        setSelectedHospital(hospital);

        if (map && hospital.place_id && (hospital.isOpen === undefined || !hospital.phone)) {
            const service = new google.maps.places.PlacesService(map);
            const details = await fetchHospitalDetails(service, hospital.place_id);
            const updatedHospital = { ...hospital, ...details };
            setHospitals(prev => prev.map(h => h.id === hospital.id ? updatedHospital : h));
            setSelectedHospital(updatedHospital);
        }
    };

    const handleExpandRadius = () => {
        setRadius(r => Math.min(r * 2, 50000));
    };

    if (authLoading || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#080c14]">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (loadError) return <div className="p-10 text-center text-red-500">Map Error: {loadError.message}</div>;

    return (
        <div className="flex h-screen bg-white dark:bg-[#080c14] font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 lg:pl-64 flex flex-row h-screen relative">

                {/* LEFT PANEL: SCROLLABLE LIST */}
                <div className={`
                    flex flex-col w-full md:w-[380px] lg:w-[420px] h-full bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 z-10
                    ${showMapMobile ? 'hidden md:flex' : 'flex'}
                `}>
                    {/* Sticky Header */}
                    <div className="flex-none p-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-sm sticky top-0 z-20">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Nearby Care
                                <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {(radius / 1000).toFixed(1)} km
                                </span>
                            </h1>
                            <button
                                onClick={handleGetLocation}
                                disabled={searching}
                                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Locate className="w-3.5 h-3.5" />
                                My Location
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {HOSPITAL_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`
                                        px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border shrink-0
                                        ${selectedType === type.id
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                        }
                                    `}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results List */}
                    <div ref={listTopRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#080c14]/50 custom-scrollbar">
                        {error && (
                            <div className="p-6 text-center rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <p className="text-slate-500 mb-2">{error}</p>
                                <button onClick={handleExpandRadius} className="text-sm font-semibold text-teal-600 hover:underline">
                                    Try expanding radius
                                </button>
                            </div>
                        )}

                        {searching ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-3 animate-pulse">
                                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin flex-shrink-0" />
                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Locating nearby medical facilities & hospitals...</span>
                                </div>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                                        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0 animate-shimmer" />
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-shimmer" />
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-shimmer" />
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-shimmer" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {hospitals.length === 0 && !error && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <p className="text-slate-500 font-medium">No results found in this area.</p>
                                        <button
                                            onClick={handleExpandRadius}
                                            className="mt-4 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition"
                                        >
                                            Search Wider Area
                                        </button>
                                    </div>
                                )}

                                {hospitals.map((hospital) => (
                                    <div
                                        key={hospital.id}
                                        onClick={() => handleHospitalSelect(hospital)}
                                        className={`
                                            bg-white dark:bg-slate-800 rounded-xl p-3 border transition-all cursor-pointer hover:shadow-lg
                                            ${selectedHospital?.id === hospital.id
                                                ? 'border-teal-500 ring-1 ring-teal-500 shadow-md'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
                                            }
                                        `}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-24 h-24 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden relative shrink-0">
                                                {hospital.photos?.[0] ? (
                                                    <img src={hospital.photos[0]} alt={hospital.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <Activity className="w-8 h-8 opacity-20" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-snug line-clamp-2">
                                                            {hospital.name}
                                                        </h3>
                                                        {hospital.rating && (
                                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                                                <Star className="w-3 h-3 fill-slate-900 text-slate-900 dark:fill-white dark:text-white" />
                                                                {hospital.rating}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{hospital.address}</p>
                                                </div>

                                                <div className="flex items-center justify-between mt-3">
                                                    <div>
                                                        {hospital.isOpen !== undefined && (
                                                            <span className={`text-[10px] font-bold uppercase ${hospital.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                                                                {hospital.isOpen ? 'Open Now' : 'Closed'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {/* Action Buttons simplified for cleanliness */}
                                                        {hospital.formatted_phone_number && (
                                                            <a
                                                                href={`tel:${hospital.formatted_phone_number}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                                                                title="Call"
                                                            >
                                                                <Phone className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.name + ' ' + hospital.address)}&destination_place_id=${hospital.place_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition flex items-center gap-1.5 shadow-sm shadow-teal-600/20"
                                                        >
                                                            Navigate <Navigation className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {hospitals.length > 0 && (
                                    <button
                                        onClick={handleExpandRadius}
                                        className="w-full py-4 text-center text-sm font-medium text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors border-t border-slate-200 dark:border-slate-800"
                                    >
                                        Show more locations
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: FULL MAP */}
                <div className={`
                    flex-1 h-full relative bg-slate-100 dark:bg-[#0f172a]
                    ${showMapMobile ? 'block fixed inset-0 z-30' : 'hidden md:block'}
                `}>
                    {/* Mobile Map Close Button */}
                    {showMapMobile && (
                        <button
                            onClick={() => setShowMapMobile(false)}
                            className="absolute top-4 left-4 z-40 p-2 bg-white rounded-full shadow-lg text-slate-800"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}

                    {isLoaded && (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={userLocation || defaultCenter}
                            zoom={13}
                            onLoad={onLoad}
                            onUnmount={onUnmount}
                            options={{
                                disableDefaultUI: false,
                                zoomControl: true,
                                zoomControlOptions: { position: 9 }, // Bottom Right
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: false,
                                styles: CLEAN_MAP_STYLE
                            }}
                        >
                            {userLocation && (
                                <Marker
                                    position={userLocation}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: 8,
                                        fillColor: "#0f766e",
                                        fillOpacity: 1,
                                        strokeColor: "white",
                                        strokeWeight: 2,
                                    }}
                                    zIndex={100}
                                />
                            )}

                            {hospitals.map((hospital) => (
                                <Marker
                                    key={hospital.id}
                                    position={hospital.location}
                                    onClick={() => handleHospitalSelect(hospital)}
                                    // Default Google Red Pin is essentially fine for standard medical view, 
                                    // but let's stick to default animation.
                                    animation={google.maps.Animation.DROP}
                                />
                            ))}

                            {selectedHospital && (
                                <InfoWindow
                                    position={selectedHospital.location}
                                    onCloseClick={() => setSelectedHospital(null)}
                                >
                                    <div className="p-1 min-w-[200px]">
                                        <h3 className="font-bold text-slate-900 text-sm mb-1">{selectedHospital.name}</h3>
                                        <p className="text-xs text-slate-500 mb-2">{selectedHospital.address}</p>
                                        <div className="flex gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${selectedHospital.isOpen ? 'bg-green-600' : 'bg-red-500'}`}>
                                                {selectedHospital.isOpen ? 'OPEN' : 'CLOSED'}
                                            </span>
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    )}
                </div>

                {/* Mobile Floating Map Toggle */}
                <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={() => setShowMapMobile(!showMapMobile)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-semibold shadow-xl shadow-slate-900/40 transform active:scale-95 transition-all"
                    >
                        {showMapMobile ? 'Show List' : 'Map View'}
                    </button>
                </div>
            </main>
        </div>
    );
}
