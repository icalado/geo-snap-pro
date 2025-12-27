import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  cloudId?: string; // Supabase record ID
  projectId?: string;
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

// Calculate distance between all points
function calculateTotalDistance(points: TrackPoint[]): number {
  if (points.length < 2) return 0;
  
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const R = 6371e3;
    const φ1 = (p1.lat * Math.PI) / 180;
    const φ2 = (p2.lat * Math.PI) / 180;
    const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
    const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance += R * c;
  }
  return distance;
}

// Export track as GeoJSON
export function exportToGeoJSON(trackLog: TrackLog): string {
  const features: GeoJSON.Feature[] = [];

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

export function useGpsTracking(userId?: string, projectId?: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(null);
  const [trackLog, setTrackLog] = useState<TrackLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRecoveredSession, setHasRecoveredSession] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const trackLogRef = useRef<TrackLog | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state for callbacks
  useEffect(() => {
    trackLogRef.current = trackLog;
  }, [trackLog]);

  // Sync track log to Supabase
  const syncToCloud = useCallback(async (track: TrackLog) => {
    if (!userId) return;

    setIsSyncing(true);
    try {
      const distance = calculateTotalDistance(track.points);
      
      // Convert to JSON-compatible format for Supabase
      const trackData = {
        user_id: userId,
        project_id: track.projectId || projectId || null,
        track_id: track.id,
        start_time: new Date(track.startTime).toISOString(),
        end_time: track.endTime ? new Date(track.endTime).toISOString() : null,
        points: JSON.parse(JSON.stringify(track.points)),
        photos: JSON.parse(JSON.stringify(track.photos)),
        distance_meters: distance,
        point_count: track.points.length,
        photo_count: track.photos.length,
      };

      if (track.cloudId) {
        // Update existing record
        const { error } = await supabase
          .from('track_logs')
          .update(trackData)
          .eq('id', track.cloudId);

        if (error) throw error;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('track_logs')
          .insert(trackData)
          .select('id')
          .single();

        if (error) throw error;

        // Update local track with cloud ID
        if (data) {
          const updatedTrack = { ...track, cloudId: data.id };
          setTrackLog(updatedTrack);
          trackLogRef.current = updatedTrack;
          saveSession(updatedTrack);
        }
      }

      console.log('Track synced to cloud');
    } catch (err) {
      console.error('Error syncing to cloud:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, projectId]);

  // Debounced sync
  const debouncedSync = useCallback((track: TrackLog) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncToCloud(track);
    }, 5000); // Sync every 5 seconds max
  }, [syncToCloud]);

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

  // Cleanup sync timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const startTracking = useCallback(async (selectedProjectId?: string) => {
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
        projectId: selectedProjectId || projectId,
      };
      setTrackLog(activeTrackLog);
      trackLogRef.current = activeTrackLog;
      saveSession(activeTrackLog);
    } else if (selectedProjectId) {
      // Update project ID if provided
      activeTrackLog = { ...activeTrackLog, projectId: selectedProjectId };
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
          saveSession(updated);
          
          // Trigger debounced cloud sync
          if (userId) {
            debouncedSync(updated);
          }
          
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
  }, [requestWakeLock, userId, projectId, debouncedSync]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Release wake lock
    await releaseWakeLock();

    // Clear pending sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    setTrackLog((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        endTime: Date.now(),
      };
      saveSession(updated);
      
      // Final sync to cloud
      if (userId) {
        syncToCloud(updated);
      }
      
      return updated;
    });

    setIsTracking(false);
  }, [releaseWakeLock, userId, syncToCloud]);

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
      saveSession(updated);
      
      // Sync photo to cloud immediately
      if (userId) {
        syncToCloud(updated);
      }
      
      return updated;
    });

    return newMarker;
  }, [userId, syncToCloud]);

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

  // Force sync to cloud
  const forceSync = useCallback(async () => {
    if (trackLog && userId) {
      await syncToCloud(trackLog);
      toast.success('Dados sincronizados com a nuvem');
    }
  }, [trackLog, userId, syncToCloud]);

  return {
    isTracking,
    currentPosition,
    trackLog,
    error,
    hasRecoveredSession,
    isSyncing,
    startTracking,
    stopTracking,
    addPhotoMarker,
    clearTrackLog,
    exportTrack,
    getCoordinatesArray,
    forceSync,
  };
}
