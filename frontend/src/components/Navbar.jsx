import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, LayoutDashboard, PlusCircle, Play, 
  History as HistoryIcon, LogOut, Menu, X,
  LogIn, UserPlus, Sun, Moon, Sparkles, Settings as SettingsIcon
} from 'lucide-react';
import { authService } from '../services/api';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = authService.isAuthenticated();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [scrolled, setScrolled] = useState(false);

  // Apply dark class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement; // This is the <html> element
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    authService.logout();
    setIsOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
      isActive(path)
        ? 'text-white'
        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
    }`;

  const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-indigo-500 to-purple-600' },
    { to: '/assistant', label: 'AI Tutor',   icon: Sparkles,        color: 'from-blue-500 to-indigo-650'  },
    { to: '/create',    label: 'Create',    icon: PlusCircle,       color: 'from-purple-500 to-pink-600'  },
    { to: '/review',    label: 'Review',    icon: Play,             color: 'from-emerald-500 to-cyan-600' },
    { to: '/history',   label: 'History',   icon: HistoryIcon,      color: 'from-amber-500 to-orange-600' },
    { to: '/settings',  label: 'Settings',  icon: SettingsIcon,     color: 'from-slate-500 to-slate-700'  },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'backdrop-blur-xl bg-white/75 dark:bg-slate-950/80 shadow-lg shadow-indigo-500/5 border-b border-white/40 dark:border-slate-800/60'
        : 'backdrop-blur-md bg-white/60 dark:bg-slate-950/60 border-b border-white/20 dark:border-slate-900/40'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-lg sm:text-xl tracking-tight">
                SmartFlash
              </span>
              <Sparkles className="w-3.5 h-3.5 text-pink-500 hidden sm:block animate-pulse" />
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated && NAV_LINKS.map(({ to, label, icon: Icon, color }) => (
              <Link key={to} to={to} className={navLinkClass(to)}>
                {isActive(to) && (
                  <span className={`absolute inset-0 rounded-xl bg-gradient-to-r ${color} opacity-90 shadow-md`} />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{label}</span>
              </Link>
            ))}

            {isAuthenticated && <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent mx-2" />}

            {/* Theme Toggle — animated pill */}
            <button
              onClick={toggleTheme}
              className="relative w-14 h-7 rounded-full transition-all duration-500 focus:outline-none cursor-pointer shadow-inner border border-white/30 dark:border-slate-700/50 overflow-hidden"
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
                  : 'linear-gradient(135deg, #fbbf24, #f97316)',
              }}
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-400 shadow-md ${
                theme === 'dark'
                  ? 'right-0.5 bg-slate-900 text-yellow-400'
                  : 'left-0.5 bg-white text-amber-500'
              }`}>
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </span>
            </button>

            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all ml-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 ml-1">
                <Link to="/login" className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 text-sm font-bold px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                </Link>
                <Link to="/register" className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="relative w-12 h-6 rounded-full transition-all duration-500 cursor-pointer shadow-inner overflow-hidden border border-white/30 dark:border-slate-700/50"
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
                  : 'linear-gradient(135deg, #fbbf24, #f97316)',
              }}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-400 shadow-md ${
                theme === 'dark' ? 'right-0.5 bg-slate-900 text-yellow-400' : 'left-0.5 bg-white text-amber-500'
              }`}>
                {theme === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              </span>
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 transition-all"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden animate-fade-in backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/60 dark:border-slate-800 px-4 pt-2 pb-4 space-y-1 shadow-xl">
          {isAuthenticated ? (
            <>
              {NAV_LINKS.map(({ to, label, icon: Icon, color }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-base font-bold transition-all ${
                    isActive(to)
                      ? `bg-gradient-to-r ${color} text-white shadow-md`
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center space-x-3 px-4 py-3 rounded-2xl text-base font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
              >
                <LogIn className="w-5 h-5" />
                <span>Log In</span>
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:opacity-90 font-bold shadow-lg shadow-indigo-500/20"
              >
                <UserPlus className="w-5 h-5" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
