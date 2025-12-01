import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface Photo {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string | null;
  notes: string | null;
}

interface Project {
  id: string;
  name: string;
}

export default function ProjectMap() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadPhotos();
    }
  }, [projectId]);

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
    if (!mapRef.current || photos.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for all photos
    const bounds: [number, number][] = [];
    
    photos.forEach(photo => {
      const latlng: [number, number] = [photo.latitude, photo.longitude];
      bounds.push(latlng);
      
      const marker = L.marker(latlng)
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="p-2">
            <img src="${photo.image_url}" alt="Foto" class="w-32 h-32 object-cover rounded mb-2" />
            <p class="text-sm"><strong>Coordenadas:</strong></p>
            <p class="text-xs">Lat: ${photo.latitude.toFixed(6)}</p>
            <p class="text-xs">Lon: ${photo.longitude.toFixed(6)}</p>
            ${photo.timestamp ? `<p class="text-xs mt-1">${new Date(photo.timestamp).toLocaleString('pt-BR')}</p>` : ''}
            ${photo.notes ? `<p class="text-xs mt-1">${photo.notes}</p>` : ''}
          </div>
        `);
      
      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [photos]);

  const loadProject = async () => {
    if (!user || !projectId) return;

    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      toast.error('Erro ao carregar projeto');
      return;
    }

    setProject(data);
  };

  const loadPhotos = async () => {
    if (!user || !projectId) return;

    const { data, error } = await supabase
      .from('photos')
      .select('id, image_url, latitude, longitude, timestamp, notes')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar fotos');
      return;
    }

    setPhotos(data || []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Mapa do Projeto
              </h1>
              {project && (
                <p className="text-sm text-muted-foreground">{project.name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-0">
            <div 
              ref={mapContainerRef} 
              className="w-full h-[calc(100vh-200px)] rounded-lg overflow-hidden"
            />
          </CardContent>
        </Card>
        
        {photos.length === 0 && (
          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhuma foto com localização encontrada neste projeto
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
