import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Search, User, LogOut, Menu, X, Briefcase, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, loading } = useAuth();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {user && !user.emailVerified && location.pathname !== '/verify-email' && (
        <div className="bg-amber-500 text-white py-2.5 px-4 text-center font-semibold flex items-center justify-center gap-3 shadow-lg relative z-[60]">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="animate-pulse" />
            <span className="hidden sm:inline">Your email is not verified. Please check your inbox for the verification link.</span>
            <span className="sm:hidden text-xs">Email not verified. Check inbox.</span>
          </div>
          <Link 
            to="/verify-email" 
            className="bg-white text-amber-600 px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider hover:bg-amber-50 transition-all shadow-sm hover:scale-105 active:scale-95"
          >
            Verify Now
          </Link>
        </div>
      )}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              {settings.siteLogo ? (
                <img src={settings.siteLogo} alt={settings.siteName} className="h-8 w-auto" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground group-hover:rotate-12 transition-transform">
                  <Briefcase size={18} />
                </div>
              )}
              <span className="text-xl font-bold text-primary">{settings.siteName}</span>
            </Link>
            <div className="hidden lg:flex items-center gap-6">
              {settings.headerLinks.map((link, idx) => (
                <Link key={idx} to={link.href} className="text-sm font-medium hover:text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</Link>
              )}
              {user && (
                <Link to="/profile" className="text-sm font-medium hover:text-primary transition-colors">Profile</Link>
              )}
              {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors">Admin</Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-accent transition-colors text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </motion.button>

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-foreground leading-none">
                    {profile?.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider mt-1">
                    {profile?.role || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-destructive/10 transition-colors text-destructive"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            )}

            <button
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t bg-background p-6 space-y-6 shadow-xl animate-in slide-in-from-top duration-300">
          <div className="space-y-4">
            {settings.headerLinks.map((link, idx) => (
              <Link 
                key={idx} 
                to={link.href} 
                className="block text-lg font-semibold hover:text-primary transition-colors" 
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link to="/dashboard" className="block text-lg font-semibold hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
            )}
            {user && (
              <Link to="/profile" className="block text-lg font-semibold hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Profile</Link>
            )}
            {(profile?.role === 'admin' || profile?.role === 'moderator') && (
              <Link to="/admin" className="block text-lg font-semibold hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Admin</Link>
            )}
          </div>
          <div className="pt-6 border-t">
            {user ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-tight">
                      {profile?.displayName || user.email}
                    </p>
                    <p className="text-xs text-primary font-medium uppercase tracking-widest mt-0.5">
                      {profile?.role || 'User'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-2 py-3 rounded-lg text-lg font-bold text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut size={22} />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-3 text-lg font-bold text-primary hover:opacity-80 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                <User size={22} />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
