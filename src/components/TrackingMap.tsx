import { useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Navigation, Play, Square, Trash2, Route } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrackLog, TrackPoint, PhotoMarker } from '@/hooks/useGpsTracking';
import { toast } from 'sonner';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for photo markers
const createPhotoIcon = () => L.divIcon({
  className: 'photo-marker-icon',
  html: `<div class="w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface TrackingMapProps {
  isTracking: boolean;
  currentPosition: TrackPoint | null;
  trackLog: TrackLog | null;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onClearTrack: () => void;
  error: string | null;
}

export default function TrackingMap({
  isTracking,
  currentPosition,
  trackLog,
  onStartTracking,
  onStopTracking,
  onClearTrack,
  error,
}: TrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const photoMarkersRef = useRef<L.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update polyline when track points change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing polyline
    if (polylineRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Draw new polyline if we have points
    if (trackLog && trackLog.points.length > 1) {
      const coordinates: [number, number][] = trackLog.points.map(
        (point) => [point.lat, point.lng]
      );

      polylineRef.current = L.polyline(coordinates, {
        color: 'hsl(var(--primary))',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(mapRef.current);

      // Fit bounds to show the entire track
      mapRef.current.fitBounds(polylineRef.current.getBounds(), {
        padding: [50, 50],
      });
    }
  }, [trackLog?.points.length]);

  // Update current position marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing current position marker
    if (currentMarkerRef.current) {
      mapRef.current.removeLayer(currentMarkerRef.current);
      currentMarkerRef.current = null;
    }

    // Add new marker if we have a position
    if (currentPosition) {
      const currentIcon = L.divIcon({
        className: 'current-position-icon',
        html: `<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      currentMarkerRef.current = L.marker(
        [currentPosition.lat, currentPosition.lng],
        { icon: currentIcon }
      )
        .addTo(mapRef.current)
        .bindPopup(`
          <strong>Posição Atual</strong><br/>
          Lat: ${currentPosition.lat.toFixed(6)}<br/>
          Lng: ${currentPosition.lng.toFixed(6)}<br/>
          ${currentPosition.altitude ? `Alt: ${currentPosition.altitude.toFixed(1)}m<br/>` : ''}
          ${currentPosition.accuracy ? `Precisão: ${currentPosition.accuracy.toFixed(1)}m` : ''}
        `);

      // Center on current position if tracking
      if (isTracking) {
        mapRef.current.setView([currentPosition.lat, currentPosition.lng], 17);
      }
    }
  }, [currentPosition, isTracking]);

  // Update photo markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing photo markers
    photoMarkersRef.current.forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    photoMarkersRef.current = [];

    // Add photo markers
    if (trackLog?.photos) {
      trackLog.photos.forEach((photo) => {
        const marker = L.marker([photo.lat, photo.lng], {
          icon: createPhotoIcon(),
        })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-2 max-w-[200px]">
              <img src="${photo.imageUrl}" alt="Foto" class="w-full h-32 object-cover rounded mb-2" />
              <p class="text-xs text-muted-foreground">
                ${new Date(photo.timestamp).toLocaleString('pt-BR')}
              </p>
              ${photo.notes ? `<p class="text-xs mt-1">${photo.notes}</p>` : ''}
              <p class="text-xs mt-1 font-mono">
                ${photo.lat.toFixed(6)}, ${photo.lng.toFixed(6)}
              </p>
            </div>
          `);

        photoMarkersRef.current.push(marker);
      });
    }
  }, [trackLog?.photos]);

  const centerOnPosition = () => {
    if (!currentPosition) {
      toast.error('Nenhuma posição disponível');
      return;
    }
    if (mapRef.current) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng], 17);
      toast.success('Mapa centralizado');
    }
  };

  const trackStats = useMemo(() => {
    if (!trackLog || trackLog.points.length < 2) {
      return { distance: 0, duration: 0, pointCount: trackLog?.points.length || 0 };
    }

    // Calculate total distance
    let distance = 0;
    for (let i = 1; i < trackLog.points.length; i++) {
      const p1 = trackLog.points[i - 1];
      const p2 = trackLog.points[i];
      distance += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }

    // Calculate duration
    const duration = (trackLog.endTime || Date.now()) - trackLog.startTime;

    return {
      distance,
      duration,
      pointCount: trackLog.points.length,
    };
  }, [trackLog]);

  return (
    <Card className="shadow-elevation">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              GPS Tracker Log
            </CardTitle>
            <CardDescription>
              {isTracking ? 'Rastreamento ativo' : 'Clique para iniciar o rastreamento'}
            </CardDescription>
          </div>
          {isTracking && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-xs text-destructive font-medium">REC</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Track stats */}
        {trackLog && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Distância</p>
              <p className="text-sm font-semibold">
                {trackStats.distance >= 1000
                  ? `${(trackStats.distance / 1000).toFixed(2)} km`
                  : `${trackStats.distance.toFixed(0)} m`}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Pontos</p>
              <p className="text-sm font-semibold">{trackStats.pointCount}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Fotos</p>
              <p className="text-sm font-semibold">{trackLog.photos.length}</p>
            </div>
          </div>
        )}

        {/* Map container */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-[300px] rounded-lg border overflow-hidden"
        />
        
        {/* Control buttons */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button 
              onClick={onStartTracking} 
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Rastreamento
            </Button>
          ) : (
            <Button 
              onClick={onStopTracking} 
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Parar
            </Button>
          )}
          
          <Button 
            onClick={centerOnPosition} 
            variant="outline" 
            size="icon"
            disabled={!currentPosition}
          >
            <Navigation className="w-4 h-4" />
          </Button>

          {trackLog && !isTracking && (
            <Button 
              onClick={onClearTrack} 
              variant="outline" 
              size="icon"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
