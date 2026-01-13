import { useState, useEffect } from 'react';

interface LocationState {
  coords: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

// Mock location defaulting to Beijing Forbidden City if geo fails or for demo
const MOCK_LOCATION = { lat: 39.9163, lng: 116.3972 };

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        coords: MOCK_LOCATION,
        error: "Geolocation not supported",
        loading: false,
      });
      return;
    }

    const success = (position: GeolocationPosition) => {
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
      setState({
        coords: MOCK_LOCATION,
        error: "Unable to retrieve your location",
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(success, error);
  }, []);

  return state;
}
