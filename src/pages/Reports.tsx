import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  contract: string | null;
  project_type: string | null;
  fauna_subtype: string | null;
  created_at: string | null;
}

interface Photo {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string | null;
  notes: string | null;
  accuracy: number | null;
}

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadPhotos();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    setProjects(data || []);
  };

  const loadPhotos = async () => {
    if (!user || !selectedProject) return;

    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', selectedProject)
      .order('timestamp', { ascending: true });

    setPhotos(data || []);
  };

  const generatePDF = async () => {
    if (!selectedProject || photos.length === 0) {
      toast.error('Selecione um projeto com fotos para gerar o relatório');
      return;
    }

    setIsGenerating(true);

    try {
      const project = projects.find((p) => p.id === selectedProject);
      if (!project) return;

      const pdf = new jsPDF();
      let yPosition = 20;

      // Título
      pdf.setFontSize(18);
      pdf.text('Relatório de Campo - BioGeo Photo Log', 20, yPosition);
      yPosition += 15;

      // Informações do Projeto
      pdf.setFontSize(12);
      pdf.text(`Projeto: ${project.name}`, 20, yPosition);
      yPosition += 7;

      if (project.description) {
        pdf.setFontSize(10);
        pdf.text(`Descrição: ${project.description}`, 20, yPosition);
        yPosition += 7;
      }

      if (project.location) {
        pdf.text(`Localização: ${project.location}`, 20, yPosition);
        yPosition += 7;
      }

      if (project.contract) {
        pdf.text(`Contrato: ${project.contract}`, 20, yPosition);
        yPosition += 7;
      }

      pdf.text(
        `Tipo: ${project.project_type === 'fauna' ? `Fauna - ${project.fauna_subtype}` : 'Flora'}`,
        20,
        yPosition
      );
      yPosition += 7;

      pdf.text(`Total de Fotos: ${photos.length}`, 20, yPosition);
      yPosition += 10;

      // Lista de Fotos
      pdf.setFontSize(14);
      pdf.text('Registros Fotográficos:', 20, yPosition);
      yPosition += 10;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(11);
        pdf.text(`${i + 1}. Foto`, 20, yPosition);
        yPosition += 6;

        pdf.setFontSize(9);
        pdf.text(
          `Data: ${photo.timestamp ? new Date(photo.timestamp).toLocaleString('pt-BR') : 'N/A'}`,
          25,
          yPosition
        );
        yPosition += 5;

        pdf.text(
          `Coordenadas: Lat ${photo.latitude.toFixed(6)}, Lon ${photo.longitude.toFixed(6)}`,
          25,
          yPosition
        );
        yPosition += 5;

        if (photo.accuracy) {
          pdf.text(`Precisão: ±${photo.accuracy.toFixed(0)}m`, 25, yPosition);
          yPosition += 5;
        }

        if (photo.notes) {
          const lines = pdf.splitTextToSize(`Notas: ${photo.notes}`, 170);
          pdf.text(lines, 25, yPosition);
          yPosition += lines.length * 5;
        }

        yPosition += 5;
      }

      // Rodapé
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(
          `Gerado em ${new Date().toLocaleDateString('pt-BR')} - Página ${i} de ${pageCount}`,
          20,
          290
        );
      }

      pdf.save(`relatorio-${project.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Relatórios</h1>
            <p className="text-xs text-muted-foreground">Gerar relatórios de projetos</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Projeto</CardTitle>
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
          </CardContent>
        </Card>

        {currentProject && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Informações do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Nome:</span> {currentProject.name}
                </div>
                {currentProject.description && (
                  <div>
                    <span className="font-medium">Descrição:</span> {currentProject.description}
                  </div>
                )}
                {currentProject.location && (
                  <div>
                    <span className="font-medium">Localização:</span> {currentProject.location}
                  </div>
                )}
                {currentProject.contract && (
                  <div>
                    <span className="font-medium">Contrato:</span> {currentProject.contract}
                  </div>
                )}
                <div>
                  <span className="font-medium">Tipo:</span>{' '}
                  {currentProject.project_type === 'fauna'
                    ? `Fauna - ${currentProject.fauna_subtype}`
                    : 'Flora'}
                </div>
                <div>
                  <span className="font-medium">Total de Fotos:</span> {photos.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Gerar Relatório
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O relatório incluirá todas as informações do projeto e registros fotográficos com
                  coordenadas GPS.
                </p>
                <Button
                  onClick={generatePDF}
                  disabled={isGenerating || photos.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    'Gerando...'
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Gerar Relatório PDF
                    </>
                  )}
                </Button>
                {photos.length === 0 && (
                  <p className="text-sm text-amber-600">
                    Este projeto não possui fotos registradas.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
