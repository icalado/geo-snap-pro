import { useState, useRef, useCallback, useEffect } from 'react';

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude?: number;
  accuracy?: number;
}

export interface PhotoMarker {
  id: string;
  lat: number;
  lng: number;
  imageUrl: string;
  timestamp: number;
  notes?: string;
}

export interface TrackLog {
  id: string;
  startTime: number;
  endTime?: number;
  points: TrackPoint[];
  photos: PhotoMarker[];
}

export function useGpsTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(null);
  const [trackLog, setTrackLog] = useState<TrackLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const trackLogRef = useRef<TrackLog | null>(null);

  // Keep ref in sync with state for callbacks
  useEffect(() => {
    trackLogRef.current = trackLog;
  }, [trackLog]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }

    setError(null);
    
    const newTrackLog: TrackLog = {
      id: `track-${Date.now()}`,
      startTime: Date.now(),
      points: [],
      photos: [],
    };
    
    setTrackLog(newTrackLog);
    trackLogRef.current = newTrackLog;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point: TrackPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
          altitude: position.coords.altitude || undefined,
          accuracy: position.coords.accuracy || undefined,
        };

        setCurrentPosition(point);
        
        setTrackLog((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            points: [...prev.points, point],
          };
          trackLogRef.current = updated;
          return updated;
        });
      },
      (err) => {
        setError(`Erro GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTrackLog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        endTime: Date.now(),
      };
    });

    setIsTracking(false);
  }, []);

  const addPhotoMarker = useCallback((photo: Omit<PhotoMarker, 'id'>) => {
    const newMarker: PhotoMarker = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setTrackLog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        photos: [...prev.photos, newMarker],
      };
    });

    return newMarker;
  }, []);

  const clearTrackLog = useCallback(() => {
    if (isTracking) {
      stopTracking();
    }
    setTrackLog(null);
    setCurrentPosition(null);
    trackLogRef.current = null;
  }, [isTracking, stopTracking]);

  const getCoordinatesArray = useCallback((): [number, number][] => {
    if (!trackLog) return [];
    return trackLog.points.map((point) => [point.lat, point.lng]);
  }, [trackLog]);

  return {
    isTracking,
    currentPosition,
    trackLog,
    error,
    startTracking,
    stopTracking,
    addPhotoMarker,
    clearTrackLog,
    getCoordinatesArray,
  };
}

