import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2, Image, MapPin, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import AppLayout from '@/components/layout/AppLayout';

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
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);

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

  const extractFileName = (url: string): string => {
    try {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1] || 'sem_nome';
    } catch {
      return 'sem_nome';
    }
  };

  const exportCSV = async () => {
    if (!selectedProject || photos.length === 0) {
      toast.error('Selecione um projeto com fotos para exportar');
      return;
    }

    setIsExportingCSV(true);

    try {
      const project = projects.find((p) => p.id === selectedProject);
      if (!project) return;

      // CSV Header
      const headers = ['Nome do Arquivo', 'Data', 'Latitude', 'Longitude', 'Notas', 'Nome do Projeto'];
      
      // CSV Rows
      const rows = photos.map((photo) => {
        const fileName = extractFileName(photo.image_url);
        const date = photo.timestamp 
          ? new Date(photo.timestamp).toLocaleString('pt-BR') 
          : 'N/A';
        const latitude = photo.latitude.toFixed(6);
        const longitude = photo.longitude.toFixed(6);
        const notes = photo.notes ? `"${photo.notes.replace(/"/g, '""')}"` : '';
        const projectName = `"${project.name.replace(/"/g, '""')}"`;

        return [fileName, date, latitude, longitude, notes, projectName].join(',');
      });

      // Combine header and rows
      const csvContent = [headers.join(','), ...rows].join('\n');

      // Add BOM for Excel UTF-8 compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dados-${project.name.replace(/\s+/g, '-')}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV: ' + (error as Error).message);
    } finally {
      setIsExportingCSV(false);
    }
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

      pdf.setFontSize(18);
      pdf.text('Relatório de Campo - BioGeo Photo Log', 20, yPosition);
      yPosition += 15;

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
    <AppLayout>
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground">Relatórios</h1>
          <p className="text-xs text-muted-foreground">Gerar relatórios PDF e exportar CSV</p>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {/* Project Selection */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecionar Projeto</CardTitle>
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
            {/* Project Info */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informações do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{currentProject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentProject.project_type === 'fauna'
                        ? `Fauna - ${currentProject.fauna_subtype}`
                        : 'Flora'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Fotos</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{photos.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Localização</span>
                    </div>
                    <p className="text-sm text-foreground truncate">
                      {currentProject.location || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export CSV */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  Exportar Dados (CSV)
                </CardTitle>
                <CardDescription>
                  Exportar todas as observações em formato planilha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O arquivo CSV incluirá: Nome do Arquivo, Data, Latitude, Longitude, Notas e Nome do Projeto.
                </p>
                <Button
                  onClick={exportCSV}
                  disabled={isExportingCSV || photos.length === 0}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  size="lg"
                >
                  {isExportingCSV ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Exportar CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generate PDF Report */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Gerar Relatório PDF
                </CardTitle>
                <CardDescription>
                  Exportar dados do projeto em formato PDF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O relatório incluirá todas as informações do projeto e registros fotográficos com
                  coordenadas GPS.
                </p>
                <Button
                  onClick={generatePDF}
                  disabled={isGenerating || photos.length === 0}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Gerar Relatório PDF
                    </>
                  )}
                </Button>
                {photos.length === 0 && (
                  <p className="text-sm text-center text-destructive">
                    Este projeto não possui fotos registradas.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </AppLayout>
  );
}
