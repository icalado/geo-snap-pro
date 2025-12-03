import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ArrowLeft, MapPin, Loader2, Wifi, WifiOff, Mountain, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { savePendingPhoto } from '@/lib/offlineStorage';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import FieldPhotoUpload from '@/components/FieldPhotoUpload';

export default function Capture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number; altitude?: number } | null>(null);
  const { isOnline, isSyncing, pendingCount, checkPendingCount } = useOfflineSync(user?.id);

  useEffect(() => {
    loadProjects();
    getCurrentLocation();
    
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
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar projetos');
      return;
    }

    setProjects(data || []);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste dispositivo');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
        });
        toast.success('Localização GPS capturada');
      },
      (error) => {
        toast.error('Erro ao obter localização: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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

  const captureAndSave = async () => {
    if (!selectedProject) {
      toast.error('Selecione um projeto primeiro');
      return;
    }

    if (!coords) {
      toast.error('Aguardando localização GPS...');
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

      if (!isOnline) {
        await savePendingPhoto({
          id: `${Date.now()}-${Math.random()}`,
          user_id: user!.id,
          project_id: selectedProject,
          blob,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude || null,
          notes: notes || null,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        toast.success('Foto salva localmente! Será sincronizada quando houver conexão.');
        setNotes('');
        await checkPendingCount();
        setIsSaving(false);
        
        setTimeout(() => {
          navigate('/gallery');
        }, 500);
        return;
      }

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

      const photoData = {
        user_id: user!.id,
        project_id: selectedProject,
        image_url: publicUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude || null,
        notes: notes || null,
        timestamp: new Date().toISOString(),
      };
      
      const { error: dbError } = await supabase.from('photos').insert(photoData).select();

      if (dbError) throw dbError;

      toast.success('Foto salva com sucesso!');
      setNotes('');
      
      setTimeout(() => {
        navigate('/gallery');
      }, 500);
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao salvar foto: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Nova Captura</h1>
            <p className="text-xs text-muted-foreground">Foto com geolocalização</p>
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

        {/* GPS Metadata */}
        <Card className="shadow-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Metadados GPS</span>
              <Button variant="outline" size="sm" onClick={getCurrentLocation} className="h-8">
                <Navigation className="w-3 h-3 mr-1" />
                Atualizar
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className={`w-4 h-4 ${coords ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs text-muted-foreground">Lat/Long</span>
                </div>
                {coords ? (
                  <p className="text-xs font-mono text-foreground">
                    {coords.latitude.toFixed(6)}<br/>
                    {coords.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Aguardando...</p>
                )}
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Mountain className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Altitude</span>
                </div>
                {coords?.altitude ? (
                  <p className="text-sm font-mono text-foreground">{coords.altitude.toFixed(1)}m</p>
                ) : (
                  <p className="text-xs text-muted-foreground">N/A</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camera */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Câmera
            </CardTitle>
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
              <Button onClick={startCamera} className="w-full bg-gradient-primary hover:opacity-90" size="lg">
                <Camera className="w-4 h-4 mr-2" />
                Iniciar Câmera
              </Button>
            ) : (
              <Button
                onClick={captureAndSave}
                className="w-full bg-gradient-primary hover:opacity-90"
                size="lg"
                disabled={isSaving || !selectedProject || !coords}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar e Salvar
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notas de Campo</CardTitle>
            <CardDescription>Observações sobre esta captura</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Adicione observações sobre esta foto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Field Photo Upload with OCR */}
        <FieldPhotoUpload projects={projects} onUploadComplete={loadProjects} />
      </main>
    </div>
  );
}
