import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, FolderOpen, FileText, Camera, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Route, label: 'Tracker', path: '/tracker' },
  { icon: null, label: '', path: '' }, // Placeholder for FAB
  { icon: Map, label: 'Mapa', path: '/gallery' },
  { icon: FolderOpen, label: 'Projetos', path: '/projects' },
];

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
        {navItems.map((item, index) => {
          if (index === 2) {
            // FAB Button
            return (
              <button
                key="fab"
                onClick={() => navigate('/capture')}
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-primary shadow-elevation flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                aria-label="Nova Captura"
              >
                <Camera className="w-6 h-6 text-primary-foreground" />
              </button>
            );
          }

          const isActive = location.pathname === item.path;
          const Icon = item.icon!;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "animate-scale-in")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
