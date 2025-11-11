import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import type { GeoData } from '@/lib/geo';

interface ExportPDFProps {
  geoData: GeoData | null;
  deviceId: string;
  isProAvailable: boolean;
}

export default function ExportPDF({ geoData, deviceId, isProAvailable }: ExportPDFProps) {
  const handleExportPDF = async () => {
    if (!isProAvailable) {
      toast.error('PRO feature: Activate trial or purchase PRO to export PDF');
      return;
    }

    if (!geoData) {
      toast.error('Please capture a photo with geolocation first');
      return;
    }

    try {
      const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
      });

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Scientific Photography Report', 15, 20);

      // Geolocation data
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Latitude: ${geoData.lat}°`, 15, 35);
      doc.text(`Longitude: ${geoData.lon}°`, 15, 42);
      doc.text(`Altitude: ${geoData.alt}`, 15, 49);
      doc.text(`Date/Time (EXIF): ${geoData.datetime || 'N/A'}`, 15, 56);
      doc.text(`Generated (UTC): ${new Date().toISOString()}`, 15, 63);
      doc.text(`Device ID: ${deviceId}`, 15, 70);

      // Add captured image
      if (geoData.imgDataURL) {
        doc.addImage(geoData.imgDataURL, 'JPEG', 15, 80, 180, 100);
      }

      // Footer
      doc.setFontSize(10);
      doc.text('Signature:', 15, 190);
      doc.line(15, 195, 100, 195);

      // Save PDF
      doc.save(`scientific-photo-${Date.now()}.pdf`);
      toast.success('PDF report generated and downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF: ' + (error as Error).message);
    }
  };

  return (
    <Card className="shadow-elevation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5 text-primary" />
          Export Report
        </CardTitle>
        <CardDescription>Generate PDF report with geolocation data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">PDF Report includes:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Complete geolocation data (lat, lon, alt)</li>
            <li>Timestamp from EXIF metadata</li>
            <li>Captured photograph</li>
            <li>Device identification</li>
            <li>Signature field for validation</li>
          </ul>
        </div>

        <Button 
          onClick={handleExportPDF} 
          disabled={!geoData || !isProAvailable}
          className="w-full bg-gradient-primary"
        >
          {!isProAvailable ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              PRO Feature - Export PDF
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF Report
            </>
          )}
        </Button>

        {!isProAvailable && (
          <p className="text-xs text-center text-muted-foreground">
            Activate trial or purchase PRO to unlock PDF export
          </p>
        )}
      </CardContent>
    </Card>
  );
}
