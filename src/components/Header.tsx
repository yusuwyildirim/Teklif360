import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Home, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isSettings = location.pathname === '/settings';
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/Teklif360-PNG-ICO.png" 
              alt="Teklif360 Logo" 
              className="w-10 h-10 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">Teklif360</h1>
              <p className="text-xs text-muted-foreground">İhale Doküman Sistemi</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{user.email}</span>
              </div>
            )}
            
            {isSettings ? (
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Ana Sayfa
                </Button>
              </Link>
            ) : (
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Ayarlar
                </Button>
              </Link>
            )}
            
            {user && (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Çıkış</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
