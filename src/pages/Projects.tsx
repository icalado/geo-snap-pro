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
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Meus Projetos</h1>
              <p className="text-xs text-muted-foreground">Gerencie seus projetos de campo</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

                <div className="flex gap-2 justify-end">
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
                  <Button type="submit">
                    {editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhum projeto criado ainda</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{project.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.project_type === 'fauna'
                          ? `Fauna - ${project.fauna_subtype?.replace('fauna', '')}`
                          : 'Flora'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDialog(project)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {project.description && (
                      <p className="text-muted-foreground">{project.description}</p>
                    )}
                    {project.location && (
                      <p>
                        <span className="font-medium">Localização:</span> {project.location}
                      </p>
                    )}
                    {project.contract && (
                      <p>
                        <span className="font-medium">Contrato:</span> {project.contract}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(project.created_at!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
