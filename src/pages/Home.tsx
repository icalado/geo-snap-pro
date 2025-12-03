import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, FolderOpen, LogOut, Leaf, Image, Plus, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState(0);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setRecentProjects(data);
        setProjectCount(data.length);
      }
    };

    loadProjects();
  }, [user]);

  const getUserInitials = () => {
    if (!user?.user_metadata?.name) return 'U';
    return user.user_metadata.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const getUserName = () => {
    return user?.user_metadata?.name?.split(' ')[0] || 'Pesquisador';
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">BioGeo</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 ring-2 ring-primary/20">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Greeting Section */}
        <div className="space-y-1 animate-fade-in">
          <p className="text-sm text-muted-foreground capitalize">{formatDate()}</p>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {getUserName()}!
          </h1>
          <p className="text-muted-foreground">
            {projectCount > 0 
              ? `${projectCount} projeto${projectCount > 1 ? 's' : ''} ativo${projectCount > 1 ? 's' : ''}`
              : 'Comece seu primeiro projeto de campo'
            }
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="shadow-card hover:shadow-soft transition-all cursor-pointer active:scale-[0.98] border-0"
            onClick={() => navigate('/gallery')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Galeria</p>
                <p className="text-xs text-muted-foreground">Ver fotos</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-card hover:shadow-soft transition-all cursor-pointer active:scale-[0.98] border-0"
            onClick={() => navigate('/projects')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Projetos</p>
                <p className="text-xs text-muted-foreground">Gerenciar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Projetos Recentes</h2>
            {recentProjects.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/projects')}
                className="text-primary hover:text-primary/80 -mr-2"
              >
                Ver todos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {recentProjects.length > 0 ? (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="shadow-card hover:shadow-soft transition-all cursor-pointer active:scale-[0.99] border-0"
                  onClick={() => navigate(`/projects/${project.id}/map`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.location || 'Sem localização'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-card border-dashed border-2 border-border bg-transparent">
              <CardContent className="py-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Nenhum projeto ainda</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie seu primeiro projeto para organizar suas fotos de campo
                </p>
                <Button 
                  onClick={() => navigate('/projects')}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Projeto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AppLayout>
  );
};

export default Home;
