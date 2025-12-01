import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Camera, FolderOpen, LogOut, Leaf, FileText, Image } from 'lucide-react';

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const getUserInitials = () => {
    if (!user?.user_metadata?.name) return 'U';
    return user.user_metadata.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Leaf className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-xl font-bold">BioGeo Photo Log</h1>
              <p className="text-xs text-muted-foreground">Seus projetos de campo</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="shadow-elevation hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Nova Foto</CardTitle>
              <CardDescription>
                Capturar foto com localização GPS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="default" onClick={() => navigate('/capture')}>
                Abrir Câmera
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevation hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle>Meus Projetos</CardTitle>
              <CardDescription>
                Gerenciar projetos existentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => navigate('/projects')}>
                Ver Projetos
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevation hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
                <Image className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Galeria</CardTitle>
              <CardDescription>
                Ver todas as fotos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary" onClick={() => navigate('/gallery')}>
                Abrir Galeria
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevation hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Mapa</CardTitle>
              <CardDescription>
                Visualizar fotos no mapa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">
                Abrir Mapa
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevation hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>
                Gerar relatórios PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => navigate('/reports')}>
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Projetos Recentes</h2>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum projeto ainda</p>
              <p className="text-sm">Crie seu primeiro projeto para começar</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;