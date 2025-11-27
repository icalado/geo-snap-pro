import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Leaf } from 'lucide-react';

const Splash = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        navigate(user ? '/home' : '/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-primary">
      <div className="animate-pulse space-y-8">
        <div className="flex items-center justify-center space-x-4">
          <Leaf className="w-16 h-16 text-primary-foreground" />
          <MapPin className="w-16 h-16 text-accent-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-primary-foreground text-center">
          BioGeo Photo Log
        </h1>
        <p className="text-primary-foreground/80 text-center">
          Fotografia Georreferenciada para Biologia e Geografia
        </p>
      </div>
    </div>
  );
};

export default Splash;