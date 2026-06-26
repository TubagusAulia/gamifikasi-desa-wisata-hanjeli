import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Pos } from '@/types';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
  center?: { lat: number; lng: number };
  posList: Pos[];
  userPosition?: { lat: number; lng: number } | null;
  pesertaMarkers?: { name: string; position: { lat: number; lng: number } }[];
  onPosClick?: (pos: Pos) => void;
  height?: string;
  showGeofences?: boolean;
}

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

export function MapView({
  center = { lat: -6.9147, lng: 107.6098 },
  posList,
  userPosition,
  pesertaMarkers = [],
  onPosClick,
  height = '400px',
  showGeofences = true,
}: MapViewProps) {
  const [activePos, setActivePos] = useState<Pos | null>(null);

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm" style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />

        {/* Geofence circles */}
        {showGeofences && posList.map((pos) => (
          <Circle
            key={pos.id}
            center={[pos.latitude, pos.longitude]}
            radius={pos.radius_meter}
            pathOptions={{ color: '#5591CD', fillColor: '#5591CD', fillOpacity: 0.12 }}
          />
        ))}

        {/* Pos markers */}
        {posList.map((pos) => (
          <Marker
            key={pos.id}
            position={[pos.latitude, pos.longitude]}
            eventHandlers={{ click: () => { setActivePos(pos); onPosClick?.(pos); } }}
          >
            <Popup>
              <strong>{pos.nama}</strong>
              {pos.deskripsi && <p className="text-xs mt-1">{pos.deskripsi}</p>}
            </Popup>
          </Marker>
        ))}

        {/* User position */}
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]}>
            <Popup>Lokasi Anda</Popup>
          </Marker>
        )}

        {/* Peserta markers */}
        {pesertaMarkers.map((m, i) => (
          <Marker key={i} position={[m.position.lat, m.position.lng]}>
            <Popup>{m.name}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Pos info overlay */}
      {activePos && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
          <h4 className="font-semibold text-secondary">{activePos.nama}</h4>
          <p className="text-xs text-gray-500 mt-1">{activePos.deskripsi}</p>
        </div>
      )}
    </div>
  );
}
