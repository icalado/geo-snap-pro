import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Obtém o status de usuário, carregamento E o status de administrador
  const { user, loading, isAdmin } = useAuth(); 

  if (loading) {
    // Exibir o skeleton de carregamento enquanto o status é verificado
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // CHECK 1: AUTENTICAÇÃO
  if (!user) { 
    // Se NÃO houver usuário, redireciona para login
    return <Navigate to="/login" replace />;
  }
  
  // CHECK 2: AUTORIZAÇÃO (Verifica se é Admin para a rota /admin)
  if (window.location.pathname.startsWith('/admin') && !isAdmin) {
    // Se for a rota /admin, mas o usuário não é admin, redireciona para a Home
    return <Navigate to="/" replace />; 
  }
  
  // Se for uma rota protegida comum OU se for a rota /admin E for Admin
  return <>{children}</>;
};