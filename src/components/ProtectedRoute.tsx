// NOVO PROTECTEDROUTE.TSX - REVERTIDO PARA O FORMATO DECLARATIVO
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth(); 

  if (loading) {
    // ... (Loading Skeleton)
    return ( /* ... */ );
  }

  // CHECK 1: AUTENTICAÇÃO
  if (!user) { 
    return <Navigate to="/login" replace />; // Retorna o componente Navigate
  }
  
  // CHECK 2: AUTORIZAÇÃO (Verifica se é Admin para rotas protegidas)
  if (user && !isAdmin) {
    // Se não for admin, redireciona para a Home
    return <Navigate to="/" replace />; 
  }

  // ACESSO PERMITIDO
  return <>{children}</>;
};