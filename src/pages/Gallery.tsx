import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Galeria de Fotos</h1>
              <p className="text-xs text-muted-foreground">
                {photos.length} foto(s) encontrada(s)
              </p>
            </div>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {photos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma foto encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <Card
                key={photo.id}
                className="cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
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
                      : 'Data não disponível'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.image_url}
                alt="Foto ampliada"
                className="w-full rounded-lg"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>
                    Lat: {selectedPhoto.latitude.toFixed(6)}, Lon:{' '}
                    {selectedPhoto.longitude.toFixed(6)}
                  </span>
                  {selectedPhoto.accuracy && (
                    <span className="text-muted-foreground">
                      (±{selectedPhoto.accuracy.toFixed(0)}m)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {selectedPhoto.timestamp
                      ? new Date(selectedPhoto.timestamp).toLocaleString('pt-BR')
                      : 'Data não disponível'}
                  </span>
                </div>
                {selectedPhoto.notes && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Anotações:</p>
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
    </div>
  );
}
