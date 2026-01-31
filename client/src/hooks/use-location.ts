import { useState, useEffect, useRef } from 'react';

interface LocationState {
  coords: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

// Mock location defaulting to Zhuhai Gongbei if geo fails or for demo
const MOCK_LOCATION = { lat: 22.22, lng: 113.55 };

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true,
  });
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        coords: MOCK_LOCATION,
        error: "Geolocation not supported",
        loading: false,
      });
      return;
    }

    // Timeout to avoid getting stuck on "Locating..."
    const timeoutId = setTimeout(() => {
      setState(prev => {
        if (prev.loading) {
          return {
            coords: MOCK_LOCATION,
            error: "Location timeout - using default",
            loading: false,
          };
        }
        return prev;
      });
    }, 3000);

    const success = (position: GeolocationPosition) => {
      clearTimeout(timeoutId);
      setState({
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        error: null,
        loading: false,
      });
    };

    const error = () => {
      clearTimeout(timeoutId);
      setState({
        coords: MOCK_LOCATION,
        error: "Unable to retrieve your location",
        loading: false,
      });
    };

    // Use watchPosition for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 1000,
    });

    return () => {
      clearTimeout(timeoutId);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return state;
}
