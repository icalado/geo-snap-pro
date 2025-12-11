import { useNavigate } from 'react-router-dom'; // Usamos useNavigate para evitar o erro do 404
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Obtém o status de usuário, carregamento E o status de administrador
  // Assume que o AuthContext.tsx foi atualizado para retornar 'isAdmin'
  const { user, loading, isAdmin } = useAuth(); 
  const navigate = useNavigate(); // Hook para redirecionamento imperativo

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
    // Redirecionamento imperativo (em vez de retornar <Navigate>)
    navigate("/login", { replace: true });
    return null; // Retorna null enquanto o redirecionamento ocorre
  }
  
  // 3. CHECK: AUTORIZAÇÃO (Usuário logado, mas não é Admin)
  // Esta lógica só é executada se houver um usuário logado.
  // Assumimos que esta rota (ProtectedRoute) é usada para a área Admin.
  // Se você usar esta rota para Home/Profile, talvez precise de outro componente.

  // Se for a rota /admin, e o usuário não for admin:
  if (window.location.pathname.startsWith('/admin') && !isAdmin) {
    // Redireciona para a Home para negar acesso
    navigate("/", { replace: true }); 
    return null; 
  }

  // 4. ACESSO PERMITIDO (Usuário logado E passa pelas verificações)
  return <>{children}</>;
};