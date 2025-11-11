import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import LicenseManager from '@/components/LicenseManager';
import CameraCapture from '@/components/CameraCapture';
import GeoInfo from '@/components/GeoInfo';
import MapView from '@/components/MapView';
import ExportPDF from '@/components/ExportPDF';
import { generateDeviceId, isProFeatureAvailable, checkTrialExpiration } from '@/lib/license';
import type { GeoData } from '@/lib/geo';

const Index = () => {
  const [deviceId] = useState(generateDeviceId());
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [isProAvailable, setIsProAvailable] = useState(false);

  const updateProStatus = () => {
    setIsProAvailable(isProFeatureAvailable(deviceId));
  };

  useEffect(() => {
    checkTrialExpiration();
    updateProStatus();
  }, [deviceId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Scientific Photography</h1>
              <p className="text-sm text-muted-foreground">Geolocation & Analysis Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* License Management */}
          <div className="lg:col-span-1 space-y-6">
            <LicenseManager deviceId={deviceId} onLicenseUpdate={updateProStatus} />
          </div>

          {/* Camera & Capture */}
          <div className="lg:col-span-2 space-y-6">
            <CameraCapture onCapture={setGeoData} />
            <GeoInfo geoData={geoData} />
          </div>

          {/* Map & Export */}
          <div className="lg:col-span-3 grid lg:grid-cols-2 gap-6">
            <MapView geoData={geoData} />
            <ExportPDF 
              geoData={geoData} 
              deviceId={deviceId} 
              isProAvailable={isProAvailable}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>Scientific Photography Platform - Demo Ready for Production</p>
          <p className="mt-2">Server integration required for real license validation and device management</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
