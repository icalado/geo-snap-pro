import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, FolderOpen, LogOut, Image, ChevronRight, Crown, Settings, Trees } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'ilberto.antonio.calado@gmail.com';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const loadData = async () => {
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

      const { data: userData } = await supabase
        .from('users')
        .select('is_pro')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        setIsPro(userData.is_pro || false);
      }
    };

    loadData();
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

  const getUserName = () => {
    return user?.user_metadata?.name?.split(' ')[0] || 'Pesquisador';
  };

  return (
    <AppLayout>
      <main className="px-5 pt-8 pb-6 space-y-8 min-h-screen">
        {/* Header - Simple greeting */}
        <header className="space-y-1 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center shadow-glow">
                <Trees className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Geo Snap Pro</h1>
                <p className="text-sm text-muted-foreground">
                  {getGreeting()}, {getUserName()}!
                  {isPro && <Crown className="inline w-4 h-4 ml-1.5 text-amber-400" />}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/admin')} 
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              )}
              <Avatar className="w-10 h-10 ring-2 ring-primary/30 rounded-xl">
                <AvatarImage src={user?.user_metadata?.avatar_url} className="rounded-xl" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold rounded-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={signOut} 
                className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* PRO Banner */}
        {!isPro && (
          <Card 
            className="bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border-amber-500/20 cursor-pointer hover:shadow-soft transition-all rounded-2xl"
            onClick={() => navigate('/subscribe')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Seja PRO</p>
                  <p className="text-xs text-muted-foreground">Desbloqueie recursos ilimitados</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400" />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid - Two large square cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="aspect-square shadow-card hover:shadow-soft transition-all cursor-pointer active:scale-[0.98] border-0 bg-secondary/50 hover:bg-secondary/70 rounded-3xl"
            onClick={() => navigate('/gallery')}
          >
            <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Image className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground text-lg">Galeria</p>
            </CardContent>
          </Card>

          <Card 
            className="aspect-square shadow-card hover:shadow-soft transition-all cursor-pointer active:scale-[0.98] border-0 bg-secondary/50 hover:bg-secondary/70 rounded-3xl"
            onClick={() => navigate('/projects')}
          >
            <CardContent className="p-0 h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground text-lg">Projetos</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Projetos Recentes</h2>
            {recentProjects.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/projects')}
                className="text-primary hover:text-primary/80 hover:bg-primary/10 -mr-2 rounded-xl"
              >
                Ver todos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="shadow-card hover:shadow-soft transition-all cursor-pointer active:scale-[0.99] border-0 bg-card/80 rounded-2xl overflow-hidden"
                  onClick={() => navigate(`/projects/${project.id}/map`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Thumbnail placeholder */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-primary flex-shrink-0 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{project.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.location || 'Sem localização definida'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-border bg-transparent rounded-2xl">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Nenhum projeto ainda</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-[200px]">
                  Crie seu primeiro projeto para organizar suas fotos de campo
                </p>
                <Button 
                  onClick={() => navigate('/projects')}
                  className="bg-gradient-primary hover:opacity-90 rounded-xl px-6"
                >
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