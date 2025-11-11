import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoData } from '@/lib/geo';
import { toast } from 'sonner';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  geoData: GeoData | null;
}

export default function MapView({ geoData }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2);
    
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

  useEffect(() => {
    if (!mapRef.current || !geoData) return;

    const latlng: [number, number] = [geoData.lat, geoData.lon];
    
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    markerRef.current = L.marker(latlng)
      .addTo(mapRef.current)
      .bindPopup(`
        <strong>Location</strong><br/>
        Lat: ${geoData.lat}<br/>
        Lon: ${geoData.lon}<br/>
        Alt: ${geoData.alt}
      `);

    mapRef.current.setView(latlng, 15);
  }, [geoData]);

  const centerOnLocation = () => {
    if (!geoData) {
      toast.error('No location data available');
      return;
    }
    if (mapRef.current) {
      mapRef.current.setView([geoData.lat, geoData.lon], 15);
      toast.success('Map centered on location');
    }
  };

  return (
    <Card className="shadow-elevation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-primary" />
          Location Map
        </CardTitle>
        <CardDescription>Interactive map showing photo location</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[300px] rounded-lg border overflow-hidden"
        />
        
        <Button 
          onClick={centerOnLocation} 
          variant="outline" 
          className="w-full"
          disabled={!geoData}
        >
          <Navigation className="w-4 h-4 mr-2" />
          Center on Location
        </Button>
      </CardContent>
    </Card>
  );
}
