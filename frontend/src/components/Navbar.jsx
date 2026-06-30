import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LayoutDashboard, 
  PlusCircle, 
  Play, 
  History as HistoryIcon, 
  LogOut, 
  Menu, 
  X,
  LogIn,
  UserPlus
} from 'lucide-react';
import { authService } from '../services/api';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = () => {
    authService.logout();
    setIsOpen(false);
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    return `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-indigo-50 text-indigo-600 shadow-sm'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;
  };

  const mobileNavLinkClass = (path) => {
    return `flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform duration-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 text-lg sm:text-xl">
                SmartFlash
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link to="/create" className={navLinkClass('/create')}>
                <PlusCircle className="w-4 h-4" />
                <span>Create</span>
              </Link>
              <Link to="/review" className={navLinkClass('/review')}>
                <Play className="w-4 h-4" />
                <span>Review</span>
              </Link>
              <Link to="/history" className={navLinkClass('/history')}>
                <HistoryIcon className="w-4 h-4" />
                <span>History</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 mx-2" />
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/login"
                className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center space-x-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all duration-200"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden animate-fade-in bg-white border-b border-slate-200/80 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className={mobileNavLinkClass('/dashboard')}
              >
                <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/create"
                onClick={() => setIsOpen(false)}
                className={mobileNavLinkClass('/create')}
              >
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span>Create Cards</span>
              </Link>
              <Link
                to="/review"
                onClick={() => setIsOpen(false)}
                className={mobileNavLinkClass('/review')}
              >
                <Play className="w-5 h-5 text-amber-500" />
                <span>Review Queue</span>
              </Link>
              <Link
                to="/history"
                onClick={() => setIsOpen(false)}
                className={mobileNavLinkClass('/history')}
              >
                <HistoryIcon className="w-5 h-5 text-violet-500" />
                <span>History</span>
              </Link>
              <div className="border-t border-slate-100 my-2" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-rose-600 hover:bg-rose-50 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 text-rose-500" />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <LogIn className="w-5 h-5 text-slate-500" />
                <span>Log In</span>
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm"
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
