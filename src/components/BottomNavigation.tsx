import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Route, FolderOpen, FileText, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Route, label: 'Tracker', path: '/tracker' },
  { icon: null, label: '', path: '' }, // Placeholder for FAB
  { icon: FolderOpen, label: 'Projetos', path: '/projects' },
  { icon: FileText, label: 'Relatórios', path: '/reports' },
];

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      {/* Glassmorphism background */}
      <div className="glass border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
          {navItems.map((item, index) => {
            if (index === 2) {
              // FAB Button - Floating Camera
              return (
                <button
                  key="fab"
                  onClick={() => navigate('/capture')}
                  className="absolute -top-7 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary shadow-glow flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:shadow-elevation"
                  aria-label="Nova Captura"
                >
                  <Camera className="w-7 h-7 text-primary-foreground" />
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
                  "flex flex-col items-center justify-center flex-1 h-full transition-all",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 mb-1 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[11px] font-medium",
                  isActive && "text-primary"
                )}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;