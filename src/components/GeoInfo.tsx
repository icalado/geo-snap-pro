import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import type { GeoData } from '@/lib/geo';

interface GeoInfoProps {
  geoData: GeoData | null;
}

export default function GeoInfo({ geoData }: GeoInfoProps) {
  if (!geoData) {
    return (
      <Card className="shadow-elevation">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            Geolocation Data
          </CardTitle>
          <CardDescription>No photo captured yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Capture a photo with embedded GPS data to see geolocation information
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevation border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Geolocation Data
        </CardTitle>
        <CardDescription>Extracted from EXIF metadata</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Latitude</p>
            <p className="font-mono font-semibold">{geoData.lat.toFixed(6)}°</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Longitude</p>
            <p className="font-mono font-semibold">{geoData.lon.toFixed(6)}°</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Altitude</p>
            <p className="font-mono font-semibold">{geoData.alt}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Date/Time</p>
            <p className="font-mono text-xs">{geoData.datetime || 'N/A'}</p>
          </div>
        </div>

        {geoData.imgDataURL && (
          <div className="mt-4 rounded-lg overflow-hidden border">
            <img 
              src={geoData.imgDataURL} 
              alt="Captured" 
              className="w-full h-auto"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
