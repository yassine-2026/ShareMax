import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UploadCloud, Sun, Moon, Menu, X, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Upload', path: '/upload' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-500">
          <UploadCloud className="w-8 h-8" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">ShareMax</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary-600",
                location.pathname === link.path ? "text-primary-600 dark:text-primary-500" : "text-muted-foreground"
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-background overflow-hidden"
          >
            <nav className="flex flex-col p-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary-600",
                    location.pathname === link.path ? "text-primary-600" : "text-muted-foreground"
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-primary-600"
              >
                Settings
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
