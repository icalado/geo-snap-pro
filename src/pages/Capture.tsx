import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

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
      // Capture image
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error('Failed to create image blob');

      // Upload to storage
      const fileName = `${user!.id}/${selectedProject}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from('photos').insert({
        user_id: user!.id,
        project_id: selectedProject,
        image_url: publicUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        notes: notes || null,
        timestamp: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      toast.success('Foto salva com sucesso!');
      setNotes('');
      getCurrentLocation(); // Get fresh location for next photo
    } catch (error) {
      toast.error('Erro ao salvar foto: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Capturar Foto</h1>
            <p className="text-xs text-muted-foreground">Com geolocalização automática</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Projeto</CardTitle>
            <CardDescription>Escolha o projeto para esta foto</CardDescription>
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

        {/* GPS Status */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <MapPin className={coords ? 'w-5 h-5 text-green-500' : 'w-5 h-5 text-muted-foreground'} />
              <div className="flex-1">
                {coords ? (
                  <div className="text-sm">
                    <p className="font-medium">GPS Ativo</p>
                    <p className="text-muted-foreground">
                      Lat: {coords.latitude.toFixed(6)}, Lon: {coords.longitude.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aguardando localização GPS...</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Camera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Câmera
            </CardTitle>
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

            {!isStreaming ? (
              <Button onClick={startCamera} className="w-full" size="lg">
                <Camera className="w-4 h-4 mr-2" />
                Iniciar Câmera
              </Button>
            ) : (
              <Button
                onClick={captureAndSave}
                className="w-full"
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
        <Card>
          <CardHeader>
            <CardTitle>Anotações (Opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Adicione observações sobre esta foto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
