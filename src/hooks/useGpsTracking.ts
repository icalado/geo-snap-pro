import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

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

const STORAGE_KEY = 'gps-tracker-session';

// Load session from localStorage
function loadSession(): TrackLog | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading session from localStorage:', error);
  }
  return null;
}

// Save session to localStorage
function saveSession(trackLog: TrackLog | null): void {
  try {
    if (trackLog) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackLog));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error saving session to localStorage:', error);
  }
}

// Export track as GeoJSON
export function exportToGeoJSON(trackLog: TrackLog): string {
  const features: GeoJSON.Feature[] = [];

  // Add track line
  if (trackLog.points.length > 0) {
    features.push({
      type: 'Feature',
      properties: {
        type: 'track',
        id: trackLog.id,
        startTime: new Date(trackLog.startTime).toISOString(),
        endTime: trackLog.endTime ? new Date(trackLog.endTime).toISOString() : null,
        pointCount: trackLog.points.length,
      },
      geometry: {
        type: 'LineString',
        coordinates: trackLog.points.map((p) => [p.lng, p.lat, p.altitude ?? 0]),
      },
    });
  }

  // Add photo markers
  trackLog.photos.forEach((photo) => {
    features.push({
      type: 'Feature',
      properties: {
        type: 'photo',
        id: photo.id,
        imageUrl: photo.imageUrl,
        timestamp: new Date(photo.timestamp).toISOString(),
        notes: photo.notes || null,
      },
      geometry: {
        type: 'Point',
        coordinates: [photo.lng, photo.lat],
      },
    });
  });

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  return JSON.stringify(geojson, null, 2);
}

// Export track as KML
export function exportToKML(trackLog: TrackLog): string {
  const formatDate = (ts: number) => new Date(ts).toISOString();
  
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Track Log - ${trackLog.id}</name>
    <description>Exported from GeoSnap Pro</description>
    <Style id="trackStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="photoStyle">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>`;

  // Add track path
  if (trackLog.points.length > 0) {
    const coordinates = trackLog.points
      .map((p) => `${p.lng},${p.lat},${p.altitude ?? 0}`)
      .join('\n          ');

    kml += `
    <Placemark>
      <name>Track Path</name>
      <description>Start: ${formatDate(trackLog.startTime)}</description>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>
          ${coordinates}
        </coordinates>
      </LineString>
    </Placemark>`;
  }

  // Add photo markers
  trackLog.photos.forEach((photo, index) => {
    kml += `
    <Placemark>
      <name>Photo ${index + 1}</name>
      <description><![CDATA[
        <img src="${photo.imageUrl}" width="200" />
        <p>Time: ${formatDate(photo.timestamp)}</p>
        ${photo.notes ? `<p>Notes: ${photo.notes}</p>` : ''}
      ]]></description>
      <styleUrl>#photoStyle</styleUrl>
      <Point>
        <coordinates>${photo.lng},${photo.lat},0</coordinates>
      </Point>
    </Placemark>`;
  });

  kml += `
  </Document>
</kml>`;

  return kml;
}

export function useGpsTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(null);
  const [trackLog, setTrackLog] = useState<TrackLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRecoveredSession, setHasRecoveredSession] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const trackLogRef = useRef<TrackLog | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Keep ref in sync with state for callbacks
  useEffect(() => {
    trackLogRef.current = trackLog;
  }, [trackLog]);

  // Auto-recover session on mount
  useEffect(() => {
    const savedSession = loadSession();
    if (savedSession && savedSession.points.length > 0) {
      setTrackLog(savedSession);
      trackLogRef.current = savedSession;
      setHasRecoveredSession(true);
      toast.info('Sessão anterior recuperada!', {
        description: `${savedSession.points.length} pontos e ${savedSession.photos.length} fotos carregadas.`,
      });
    }
  }, []);

  // Request wake lock
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
        });
        console.log('Wake Lock acquired');
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    }
  }, []);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    }
  }, []);

  // Re-acquire wake lock on visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isTracking) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking, requestWakeLock]);

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }

    setError(null);
    
    // Use existing session if recovered, otherwise create new
    let activeTrackLog = trackLogRef.current;
    if (!activeTrackLog || activeTrackLog.endTime) {
      activeTrackLog = {
        id: `track-${Date.now()}`,
        startTime: Date.now(),
        points: [],
        photos: [],
      };
      setTrackLog(activeTrackLog);
      trackLogRef.current = activeTrackLog;
      saveSession(activeTrackLog);
    }

    // Request wake lock
    await requestWakeLock();

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
          // Save immediately to localStorage
          saveSession(updated);
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
    setHasRecoveredSession(false);
  }, [requestWakeLock]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Release wake lock
    await releaseWakeLock();

    setTrackLog((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        endTime: Date.now(),
      };
      saveSession(updated);
      return updated;
    });

    setIsTracking(false);
  }, [releaseWakeLock]);

  const addPhotoMarker = useCallback((photo: Omit<PhotoMarker, 'id'>) => {
    const newMarker: PhotoMarker = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setTrackLog((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        photos: [...prev.photos, newMarker],
      };
      // Save immediately to localStorage
      saveSession(updated);
      return updated;
    });

    return newMarker;
  }, []);

  const clearTrackLog = useCallback(async () => {
    if (isTracking) {
      await stopTracking();
    }
    setTrackLog(null);
    setCurrentPosition(null);
    trackLogRef.current = null;
    saveSession(null);
    setHasRecoveredSession(false);
  }, [isTracking, stopTracking]);

  const exportTrack = useCallback((format: 'geojson' | 'kml' = 'geojson') => {
    if (!trackLog || trackLog.points.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const content = format === 'kml' ? exportToKML(trackLog) : exportToGeoJSON(trackLog);
    const mimeType = format === 'kml' ? 'application/vnd.google-earth.kml+xml' : 'application/geo+json';
    const extension = format === 'kml' ? 'kml' : 'geojson';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `track-${trackLog.id}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Track exportado como ${extension.toUpperCase()}`);
  }, [trackLog]);

  const getCoordinatesArray = useCallback((): [number, number][] => {
    if (!trackLog) return [];
    return trackLog.points.map((point) => [point.lat, point.lng]);
  }, [trackLog]);

  return {
    isTracking,
    currentPosition,
    trackLog,
    error,
    hasRecoveredSession,
    startTracking,
    stopTracking,
    addPhotoMarker,
    clearTrackLog,
    exportTrack,
    getCoordinatesArray,
  };
}
