import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { MapPin, Loader2, Navigation, AlertCircle, Locate } from 'lucide-react';
import type { Pos } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom POS marker icon — green circle
const posIcon = L.divIcon({
  className: 'pos-marker',
  html: `<div style="
    width: 24px;
    height: 24px;
    background: #4CAF50;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// User location marker — blue pulsing dot
const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #1976D2;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 8px rgba(25,118,210,0.3), 0 2px 6px rgba(0,0,0,0.3);
    animation: pulse 2s infinite;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Calculate distance between two coordinates in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PetaPage() {
  const [selectedPos, setSelectedPos] = useState<Pos | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPos, setNearbyPos] = useState<Pos | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const { data: posList, isLoading, error } = useQuery({
    queryKey: ['pos'],
    queryFn: posApi.getAll,
  });

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung browser Anda');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      (err) => {
        setLocationError('Gagal mendapatkan lokasi: ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Check proximity to POS
  useEffect(() => {
    if (!userLocation || !posList) return;

    for (const pos of posList) {
      const distance = getDistanceMeters(userLocation.lat, userLocation.lng, pos.latitude, pos.longitude);
      if (distance <= pos.radius_meter) {
        setNearbyPos(pos);
        return;
      }
    }
    setNearbyPos(null);
  }, [userLocation, posList]);

  // Initialize map once container is ready
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;
    if (container.clientHeight === 0) return;

    // Center on user location if available, otherwise default
    const center: L.LatLngExpression = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [-6.9147, 107.6098];

    const map = L.map(container, {
      center,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isLoading, posList, userLocation]);

  // Add POS markers when data loads
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !posList || posList.length === 0) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    // Include user location in bounds if available
    if (userLocation) {
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    posList.forEach((pos) => {
      const marker = L.marker([pos.latitude, pos.longitude], { icon: posIcon })
        .addTo(map)
        .bindPopup(
          `<b>${pos.nama}</b><br/>` +
            (pos.deskripsi ? pos.deskripsi + '<br/>' : '') +
            `<span style="color:#6B7280;font-size:11px">Radius: ${pos.radius_meter}m</span>`
        );
      markersRef.current.push(marker);
      bounds.push([pos.latitude, pos.longitude]);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 16 });
    }
  }, [posList, userLocation]);

  // Update user marker on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Lokasi Anda</b>');
    }
  }, [userLocation]);

  const handlePosClick = (pos: Pos) => {
    setSelectedPos(pos);
    if (mapRef.current) {
      mapRef.current.setView([pos.latitude, pos.longitude], 17, { animate: true });
    }
  };

  const centerOnUser = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
    }
  }, [userLocation]);

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Peta</h1>
            <p className="text-text-muted mt-1">Jelajahi semua pos yang tersedia</p>
          </div>
          <div className="flex items-center gap-3">
            {userLocation && (
              <span className="text-xs text-success font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                GPS Aktif
              </span>
            )}
            <p className="text-sm text-text-muted">
              {posList?.length ?? 0} pos terdaftar
            </p>
          </div>
        </div>

        {/* Nearby POS Alert */}
        {nearbyPos && (
          <div className="mb-4 p-4 bg-success-50 border border-success/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
                <MapPin size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-success-dark">Anda berada di {nearbyPos.nama}!</p>
                <p className="text-sm text-text-muted">Anda dapat memulai quiz untuk pos ini.</p>
              </div>
            </div>
            <button className="btn-success text-sm">
              Mulai Quiz
            </button>
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="mb-4 p-3 bg-warning-50 border border-warning/30 rounded-lg text-sm text-warning-dark">
            {locationError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-3">
            <div className="card p-0 overflow-hidden relative">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle size={32} className="mx-auto text-warning mb-2" />
                    <p className="text-text-muted">Gagal memuat peta</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={mapContainerRef}
                  style={{ height: 'calc(100vh - 220px)', minHeight: '400px', width: '100%' }}
                />
              )}

              {/* Center on user button */}
              {userLocation && (
                <button
                  onClick={centerOnUser}
                  className="absolute bottom-4 right-4 z-[1000] bg-white shadow-lg rounded-full p-3 hover:bg-surface-hover transition-colors border border-border"
                  title="Pusatkan ke lokasi saya"
                >
                  <Locate size={20} className="text-secondary" />
                </button>
              )}
            </div>
          </div>

          {/* Pos List Sidebar */}
          <div className="space-y-3">
            <h3 className="font-bold text-text flex items-center gap-2">
              <MapPin size={16} className="text-secondary" />
              Daftar Pos
            </h3>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-danger-50 text-danger rounded-lg text-sm">
                <AlertCircle size={14} className="inline mr-1" />
                Gagal memuat data pos.
              </div>
            )}

            {posList && (
              <div className="space-y-2 max-h-[calc(100vh - 280px)] overflow-y-auto">
                {posList.map((pos) => {
                  const distance = userLocation
                    ? Math.round(getDistanceMeters(userLocation.lat, userLocation.lng, pos.latitude, pos.longitude))
                    : null;
                  const isNearby = nearbyPos?.id === pos.id;

                  return (
                    <div
                      key={pos.id}
                      onClick={() => handlePosClick(pos)}
                      className={`card p-3 cursor-pointer transition-all ${
                        isNearby
                          ? 'border-success ring-2 ring-success/30 bg-success-50'
                          : selectedPos?.id === pos.id
                          ? 'border-primary ring-2 ring-primary/20 shadow-md'
                          : 'hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text text-sm truncate">{pos.nama}</p>
                          {pos.deskripsi && (
                            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{pos.deskripsi}</p>
                          )}
                        </div>
                        {isNearby && (
                          <span className="badge-success text-xs ml-2 shrink-0">Di Sekitar</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
                        <Navigation size={12} />
                        <span>
                          {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-text-muted">Radius: {pos.radius_meter}m</span>
                        {distance !== null && (
                          <span className={distance <= pos.radius_meter ? 'text-success font-medium' : 'text-text-muted'}>
                            {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Pos Detail */}
        {selectedPos && (
          <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-border p-4 max-w-sm z-[1000]">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-bold text-text">{selectedPos.nama}</h4>
              <button
                onClick={() => setSelectedPos(null)}
                className="text-text-muted hover:text-text text-xs"
              >
                Tutup
              </button>
            </div>
            {selectedPos.deskripsi && (
              <p className="text-sm text-text-muted mb-2">{selectedPos.deskripsi}</p>
            )}
            <div className="space-y-1 text-xs text-text-muted">
              <p>Lat: {selectedPos.latitude}</p>
              <p>Lng: {selectedPos.longitude}</p>
              <p>Radius: {selectedPos.radius_meter} meter</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
