import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, ChevronRight, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
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

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    contract: '',
    project_type: '' as '' | 'fauna' | 'flora',
    fauna_subtype: '',
  });

  useEffect(() => {
    loadProjects();
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      contract: '',
      project_type: '' as '' | 'fauna' | 'flora',
      fauna_subtype: '',
    });
    setEditingProject(null);
  };

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        location: project.location || '',
        contract: project.contract || '',
        project_type: (project.project_type || '') as '' | 'fauna' | 'flora',
        fauna_subtype: project.fauna_subtype || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome do projeto é obrigatório');
      return;
    }

    if (!formData.project_type) {
      toast.error('Tipo de projeto é obrigatório');
      return;
    }

    if (formData.project_type === 'fauna' && !formData.fauna_subtype) {
      toast.error('Subtipo de fauna é obrigatório');
      return;
    }

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            description: formData.description || null,
            location: formData.location || null,
            contract: formData.contract || null,
            project_type: formData.project_type,
            fauna_subtype: formData.project_type === 'fauna' ? formData.fauna_subtype : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProject.id);

        if (error) throw error;
        toast.success('Projeto atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('projects').insert({
          user_id: user!.id,
          name: formData.name,
          description: formData.description || null,
          location: formData.location || null,
          contract: formData.contract || null,
          project_type: formData.project_type,
          fauna_subtype: formData.project_type === 'fauna' ? formData.fauna_subtype : null,
        });

        if (error) throw error;
        toast.success('Projeto criado com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (error) {
      toast.error('Erro ao salvar projeto: ' + (error as Error).message);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

    const { error } = await supabase.from('projects').delete().eq('id', projectId);

    if (error) {
      toast.error('Erro ao excluir projeto');
      return;
    }

    toast.success('Projeto excluído com sucesso!');
    loadProjects();
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Projetos</h1>
            <p className="text-xs text-muted-foreground">{projects.length} projeto(s)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Projeto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Levantamento Fauna 2024"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do projeto..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Mata Atlântica - SP"
                  />
                </div>

                <div>
                  <Label htmlFor="contract">Contrato</Label>
                  <Input
                    id="contract"
                    value={formData.contract}
                    onChange={(e) => setFormData({ ...formData, contract: e.target.value })}
                    placeholder="Número ou nome do contrato"
                  />
                </div>

                <div>
                  <Label htmlFor="project_type">Tipo de Projeto *</Label>
                  <Select
                    value={formData.project_type}
                    onValueChange={(value: 'fauna' | 'flora') =>
                      setFormData({ ...formData, project_type: value, fauna_subtype: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fauna">Fauna</SelectItem>
                      <SelectItem value="flora">Flora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.project_type === 'fauna' && (
                  <div>
                    <Label htmlFor="fauna_subtype">Subtipo de Fauna *</Label>
                    <Select
                      value={formData.fauna_subtype}
                      onValueChange={(value) => setFormData({ ...formData, fauna_subtype: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o subtipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ictiofauna">Ictiofauna (Peixes)</SelectItem>
                        <SelectItem value="mastofauna">Mastofauna (Mamíferos)</SelectItem>
                        <SelectItem value="ornitofauna">Ornitofauna (Aves)</SelectItem>
                        <SelectItem value="herpetofauna">Herpetofauna (Répteis/Anfíbios)</SelectItem>
                        <SelectItem value="entomofauna">Entomofauna (Insetos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-primary hover:opacity-90">
                    {editingProject ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-6">
        {projects.length === 0 ? (
          <Card className="shadow-card border-dashed border-2 border-border bg-transparent">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Nenhum projeto ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro projeto para começar
              </p>
              <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Criar Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Card key={project.id} className="shadow-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}/map`)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{project.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {project.project_type === 'fauna'
                              ? `Fauna - ${project.fauna_subtype?.replace('fauna', '')}`
                              : 'Flora'}
                          </p>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.location && <span>{project.location}</span>}
                        <span>
                          {new Date(project.created_at!).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(project)}
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(project.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
