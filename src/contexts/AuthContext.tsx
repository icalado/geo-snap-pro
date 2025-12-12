import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Usa a função is_admin() do banco de dados
  const fetchAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error("Erro ao buscar status de admin:", error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session) {
          if (currentUser) fetchAdminStatus();
          navigate('/home');
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          navigate('/login');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      
      if (currentUser) {
        fetchAdminStatus();
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
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { emailRedirectTo: redirectUrl } 
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider 
      value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
