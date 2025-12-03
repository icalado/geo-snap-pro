import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MapPin, Calendar, Trash2, Upload, Wifi, WifiOff, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';
import { extractGeoFromImage } from '@/lib/geo';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import AppLayout from '@/components/layout/AppLayout';

interface Photo {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string | null;
  notes: string | null;
  project_id: string;
  accuracy: number | null;
}

interface Project {
  id: string;
  name: string;
}

export default function Gallery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline, isSyncing, pendingCount } = useOfflineSync(user?.id);

  useEffect(() => {
    loadProjects();
    loadPhotos();
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [selectedProject]);

  const loadProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');

    setProjects(data || []);
  };

  const loadPhotos = async () => {
    if (!user) return;

    let query = supabase
      .from('photos')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (selectedProject !== 'all') {
      query = query.eq('project_id', selectedProject);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Erro ao carregar fotos');
      return;
    }

    setPhotos(data || []);
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

    const { error } = await supabase.from('photos').delete().eq('id', photoId);

    if (error) {
      toast.error('Erro ao excluir foto');
      return;
    }

    toast.success('Foto excluída com sucesso!');
    loadPhotos();
    setSelectedPhoto(null);
  };

  const handleImportPhotos = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    if (selectedProject === 'all') {
      toast.error('Selecione um projeto específico para importar fotos');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: files.length });
    let successCount = 0;
    let errorCount = 0;

    toast.info(`Iniciando importação de ${files.length} foto(s)...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setImportProgress({ current: i + 1, total: files.length });
      
      try {
        toast.info(`Processando foto ${i + 1}/${files.length}...`);
        
        const geoData = await extractGeoFromImage(file);

        if (!geoData) {
          toast.warning(`Foto ${i + 1}: sem dados de GPS`);
          errorCount++;
          continue;
        }

        const fileName = `${user.id}/${selectedProject}/${Date.now()}-${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase.from('photos').insert({
          user_id: user.id,
          project_id: selectedProject,
          image_url: publicUrl,
          latitude: geoData.lat,
          longitude: geoData.lon,
          altitude: typeof geoData.alt === 'number' ? geoData.alt : null,
          timestamp: geoData.datetime || new Date().toISOString(),
        });

        if (dbError) throw dbError;

        successCount++;
        toast.success(`Foto ${i + 1}/${files.length} importada!`);
      } catch (error) {
        console.error('Error importing photo:', error);
        toast.error(`Erro na foto ${i + 1}: ${(error as Error).message}`);
        errorCount++;
      }
    }

    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    
    if (successCount > 0) {
      toast.success(`${successCount} foto(s) importada(s) com sucesso!`);
      await loadPhotos();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} foto(s) não puderam ser importadas`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Galeria</h1>
              <p className="text-xs text-muted-foreground">
                {photos.length} foto(s)
              </p>
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
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isImporting}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Filtrar por projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleImportPhotos}
              disabled={isImporting || selectedProject === 'all'}
              variant="outline"
              className="shrink-0"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {importProgress.current}/{importProgress.total}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </header>

      <main className="px-4 py-6">
        {photos.length === 0 ? (
          <Card className="shadow-card border-dashed border-2 border-border bg-transparent">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Nenhuma foto</h3>
              <p className="text-sm text-muted-foreground">
                Capture ou importe fotos para começar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <Card
                key={photo.id}
                className="cursor-pointer overflow-hidden shadow-card hover:shadow-soft transition-all active:scale-[0.98] border-0"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.image_url}
                  alt="Foto do projeto"
                  className="w-full aspect-square object-cover"
                />
                <CardContent className="p-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {photo.timestamp
                      ? new Date(photo.timestamp).toLocaleDateString('pt-BR')
                      : 'Sem data'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg">
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.image_url}
                alt="Foto ampliada"
                className="w-full rounded-lg"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs">
                    {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                  </span>
                  {selectedPhoto.accuracy && (
                    <span className="text-muted-foreground text-xs">
                      (±{selectedPhoto.accuracy.toFixed(0)}m)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {selectedPhoto.timestamp
                      ? new Date(selectedPhoto.timestamp).toLocaleString('pt-BR')
                      : 'Data não disponível'}
                  </span>
                </div>
                {selectedPhoto.notes && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Notas:</p>
                    <p className="text-sm text-muted-foreground">{selectedPhoto.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps?q=${selectedPhoto.latitude},${selectedPhoto.longitude}`,
                      '_blank'
                    )
                  }
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Ver no Mapa
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedPhoto.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
