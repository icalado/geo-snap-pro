import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Obtém o status de usuário, carregamento E o status de administrador
  // Este assume que o AuthContext.tsx foi atualizado para retornar 'isAdmin'
  const { user, loading, isAdmin } = useAuth(); 

  // 1. Exibir o Skeleton enquanto o status é carregado
  if (loading) {
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

  // 2. CHECK: AUTENTICAÇÃO (Usuário deslogado)
  if (!user) { 
    // Corrigido: Se NÃO houver usuário, redireciona para login
    return <Navigate to="/login" replace />;
  }
  
  // 3. CHECK: AUTORIZAÇÃO (Usuário logado, mas não é Admin)
  // Este é o ponto que protege a rota de usuários comuns
  if (user && !isAdmin) {
    // Redireciona para a página inicial para negar acesso
    return <Navigate to="/" replace />; 
  }

  // 4. ACESSO PERMITIDO (Usuário logado E é Admin)
  return <>{children}</>;
};