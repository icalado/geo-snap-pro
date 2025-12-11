import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean; // NOVO: Status de Admin
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // NOVO: Estado para isAdmin
  const navigate = useNavigate();

  // 1. FUNÇÃO PARA BUSCAR O STATUS DE ADMIN
  const fetchAdminStatus = async (userId: string) => {
    try {
      // Assumindo que a tabela 'profiles' tem uma coluna 'is_admin: boolean'
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Atualiza o estado: true se data.is_admin for true, caso contrário false
      setIsAdmin(data?.is_admin || false);

    } catch (error) {
      console.error("Erro ao buscar status de admin:", error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true; // Para evitar atualizações de estado em componente desmontado

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session) {
          if (currentUser) fetchAdminStatus(currentUser.id); // Chamada no login
          navigate('/home');
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false); // Limpa o status no logout
          navigate('/login');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        fetchAdminStatus(currentUser.id); // Chamada na sessão existente
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      mounted = false;
    };
  }, [navigate]);
  
  // ... (signIn, signUp, signOut functions permanecem as mesmas)

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    // 2. NOVO: Exponha o isAdmin no valor do contexto
    <AuthContext.Provider 
      value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ... (useAuth permanece o mesmo, mas agora ele retorna isAdmin)

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};