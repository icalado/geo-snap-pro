import { ReactNode } from 'react';
import BottomNavigation from '@/components/BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

const AppLayout = ({ children, showNav = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className={showNav ? "pb-20" : ""}>
        {children}
      </div>
      {showNav && <BottomNavigation />}
    </div>
  );
};

export default AppLayout;
