import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { extractGeoFromImage, type GeoData } from '@/lib/geo';

interface CameraCaptureProps {
  onCapture: (geoData: GeoData | null) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      streamRef.current = stream;
      setIsStreaming(true);
      toast.success('Camera started');
    } catch (error) {
      toast.error('Failed to access camera: ' + (error as Error).message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    toast.info('Camera stopped');
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0) {
      toast.error('Please start the camera first');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Failed to capture image');
        return;
      }

      // Convert Blob to File for EXIF extraction
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      toast.info('Extracting geolocation data...');
      const geoData = await extractGeoFromImage(file);
      
      if (geoData) {
        toast.success('Photo captured with geolocation!');
      } else {
        toast.warning('Photo captured but no geolocation data found in EXIF');
      }
      
      onCapture(geoData);
    }, 'image/jpeg', 0.95);
  };

  return (
    <Card className="shadow-elevation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Camera Capture
        </CardTitle>
        <CardDescription>Capture photos with embedded geolocation data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          {!isStreaming ? (
            <Button onClick={startCamera} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
              <Button onClick={stopCamera} variant="outline">
                <Square className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
