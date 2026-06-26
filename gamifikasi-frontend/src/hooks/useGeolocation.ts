import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { socketService } from '@/services/socket';

interface GeolocationState {
  position: { lat: number; lng: number } | null;
  error: string | null;
  isTracking: boolean;
}

export function useGeolocation(intervalMs = 8000) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isTracking: false,
  });
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation tidak didukung browser' }));
      return;
    }

    setState((s) => ({ ...s, isTracking: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (geo) => {
        const pos = { lat: geo.coords.latitude, lng: geo.coords.longitude };
        posRef.current = pos;
        setState((s) => ({ ...s, position: pos }));
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    intervalRef.current = setInterval(() => {
      if (posRef.current && userId) {
        socketService.emit('location-update', {
          peserta_id: typeof userId === 'string' ? parseInt(userId) : userId,
          lat: posRef.current.lat,
          lon: posRef.current.lng,
        });
      }
    }, intervalMs);
  }, [intervalMs, userId]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((s) => ({ ...s, isTracking: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
