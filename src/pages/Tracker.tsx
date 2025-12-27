import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Loader2, Route, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useGpsTracking } from '@/hooks/useGpsTracking';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import TrackingMap from '@/components/TrackingMap';

interface Project {
  id: string;
  name: string;
}

export default function Tracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  
  const { isOnline, pendingCount, isSyncing: isOfflineSyncing } = useOfflineSync(user?.id);
  const {
    isTracking,
    currentPosition,
    trackLog,
    error: trackingError,
    hasRecoveredSession,
    isSyncing: isCloudSyncing,
    startTracking,
    stopTracking,
    addPhotoMarker,
    clearTrackLog,
    exportTrack,
    forceSync,
  } = useGpsTracking(user?.id, selectedProject || undefined);

  useEffect(() => {
    loadProjects();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadProjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar projetos');
      return;
    }

    setProjects(data || []);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      streamRef.current = stream;
      setIsStreaming(true);
      toast.success('Câmera iniciada');
    } catch (error) {
      toast.error('Erro ao acessar câmera: ' + (error as Error).message);
    }
  };

  const capturePhoto = async () => {
    if (!selectedProject) {
      toast.error('Selecione um projeto primeiro');
      return;
    }

    if (!currentPosition) {
      toast.error('Aguardando posição GPS...');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0) {
      toast.error('Inicie a câmera primeiro');
      return;
    }

    setIsSaving(true);

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error('Failed to create image blob');

      // Upload to Supabase
      const fileName = `${user!.id}/${selectedProject}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Save to database
      const photoData = {
        user_id: user!.id,
        project_id: selectedProject,
        image_url: publicUrl,
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        accuracy: currentPosition.accuracy || null,
        altitude: currentPosition.altitude || null,
        notes: notes || null,
        timestamp: new Date().toISOString(),
        metadata: trackLog ? {
          track_id: trackLog.id,
          track_point_index: trackLog.points.length - 1,
        } : null,
      };
      
      const { error: dbError } = await supabase.from('photos').insert(photoData);

      if (dbError) throw dbError;

      // Add marker to track log
      addPhotoMarker({
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        imageUrl: publicUrl,
        timestamp: Date.now(),
        notes: notes || undefined,
      });

      toast.success('Foto capturada e marcada no mapa!');
      setNotes('');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao salvar foto: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartTracking = () => {
    if (!selectedProject) {
      toast.error('Selecione um projeto antes de iniciar o rastreamento');
      return;
    }
    startTracking(selectedProject);
    toast.success('Rastreamento GPS iniciado');
  };

  const handleStopTracking = () => {
    stopTracking();
    toast.success('Rastreamento GPS finalizado');
  };

  const isSyncing = isOfflineSyncing || isCloudSyncing;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              GPS Tracker
            </h1>
            <p className="text-xs text-muted-foreground">Rastreamento com fotos georreferenciadas</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-primary" />
            ) : (
              <WifiOff className="w-5 h-5 text-destructive" />
            )}
            {pendingCount > 0 && (
              <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full">
                {pendingCount}
              </span>
            )}
            {isSyncing && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4 pb-24">
        {/* Project Selection */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Projeto</CardTitle>
            <CardDescription>Selecione o projeto para associar as fotos</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Nenhum projeto encontrado. Crie um projeto primeiro.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tracking Map */}
        <TrackingMap
          isTracking={isTracking}
          currentPosition={currentPosition}
          trackLog={trackLog}
          onStartTracking={handleStartTracking}
          onStopTracking={handleStopTracking}
          onClearTrack={clearTrackLog}
          onExportTrack={exportTrack}
          error={trackingError}
          hasRecoveredSession={hasRecoveredSession}
        />

        {/* Camera for Photo Capture */}
        {isTracking && (
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Capturar Foto
              </CardTitle>
              <CardDescription>
                Tire fotos para marcar pontos no percurso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-foreground/5 rounded-xl overflow-hidden aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {!isStreaming ? (
                <Button onClick={startCamera} className="w-full" variant="outline">
                  <Camera className="w-4 h-4 mr-2" />
                  Ativar Câmera
                </Button>
              ) : (
                <>
                  <Textarea
                    placeholder="Notas sobre esta foto..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    onClick={capturePhoto}
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isSaving || !currentPosition}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Capturar e Marcar no Mapa
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Track Log Data */}
        {trackLog && trackLog.points.length > 0 && (
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados do Percurso</CardTitle>
              <CardDescription>
                ID: {trackLog.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono bg-muted/50 p-3 rounded-lg max-h-32 overflow-auto">
                <p className="text-muted-foreground mb-1">Coordenadas: [[lat, lng], ...]</p>
                <p className="break-all">
                  {JSON.stringify(
                    trackLog.points.slice(-10).map((p) => [
                      Number(p.lat.toFixed(6)),
                      Number(p.lng.toFixed(6)),
                    ])
                  )}
                  {trackLog.points.length > 10 && '...'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
