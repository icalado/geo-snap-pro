import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Users, FolderOpen, AlertCircle, Crown, Calendar, RefreshCw } from 'lucide-react';

// REMOVIDO: const ADMIN_EMAIL foi removida. A permissão é verificada via AuthContext.

interface UserData {
  id: string;
  email: string;
  name: string | null;
  is_pro: boolean;
  trial_end_date: string | null;
  created_at: string;
}

interface LogData {
  id: string;
  user_id: string | null;
  level: string;
  message: string;
  details: any;
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth(); // Assume-se que o usuário é Admin, pois a ProtectedRoute o permitiu entrar.
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newTrialDate, setNewTrialDate] = useState('');

  useEffect(() => {
    // O ProtectedRoute já garante que apenas Admins logados cheguem aqui.
    if (user) { 
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, name, is_pro, trial_end_date, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch total projects count
      const { count, error: projectsError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (projectsError) throw projectsError;
      setTotalProjects(count || 0);

      // Fetch recent logs
      const { data: logsData, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoadingData(false);
    }
  };

  const updateTrialDate = async (userId: string) => {
    if (!newTrialDate) {
      toast.error('Selecione uma data');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ trial_end_date: new Date(newTrialDate).toISOString() })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Data de trial atualizada!');
      setEditingUser(null);
      setNewTrialDate('');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar data');
    }
  };

  const toggleProStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_pro: !currentStatus,
          pro_activated_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Status PRO ${!currentStatus ? 'ativado' : 'desativado'}!`);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const isTrialExpired = (trialEnd: string | null) => {
    if (!trialEnd) return true;
    return new Date(trialEnd) < new Date();
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gestão de usuários e monetização</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Usuários</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
                <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.is_pro).length}
                </p>
                <p className="text-xs text-muted-foreground">Usuários PRO</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <FolderOpen className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalProjects}</p>
                <p className="text-xs text-muted-foreground">Total Projetos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {logs.filter(l => l.level === 'error').length}
                </p>
                <p className="text-xs text-muted-foreground">Erros Recentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Gestão de Usuários</TabsTrigger>
            <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fim Trial</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userData) => (
                        <TableRow key={userData.id}>
                          <TableCell className="font-medium text-sm">
                            {userData.email}
                          </TableCell>
                          <TableCell>{userData.name || '-'}</TableCell>
                          <TableCell>
                            {userData.is_pro ? (
                              <Badge className="bg-amber-500 text-white">PRO</Badge>
                            ) : isTrialExpired(userData.trial_end_date) ? (
                              <Badge variant="destructive">Expirado</Badge>
                            ) : (
                              <Badge variant="secondary">Trial</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUser === userData.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={newTrialDate}
                                  onChange={(e) => setNewTrialDate(e.target.value)}
                                  className="w-36 h-8 text-xs"
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => updateTrialDate(userData.id)}
                                  className="h-8"
                                >
                                  Salvar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setEditingUser(null)}
                                  className="h-8"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={isTrialExpired(userData.trial_end_date) ? 'text-destructive' : ''}>
                                  {formatDate(userData.trial_end_date)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingUser(userData.id);
                                    setNewTrialDate(userData.trial_end_date?.split('T')[0] || '');
                                  }}
                                  className="h-6 px-2"
                                >
                                  <Calendar className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(userData.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={userData.is_pro ? "destructive" : "default"}
                              onClick={() => toggleProStatus(userData.id, userData.is_pro)}
                              className="h-7 text-xs"
                            >
                              {userData.is_pro ? 'Remover PRO' : 'Ativar PRO'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Logs Recentes</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nível</Tablehead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhum log registrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Badge