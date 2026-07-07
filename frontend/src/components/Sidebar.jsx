import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Sparkles, Library, FileText, 
  HelpCircle, Network, Calendar, BarChart3,
  ChevronLeft, ChevronRight, BookOpen,
  PlusCircle, Play, History as HistoryIcon,
  Moon, Sun, LogOut, Menu, X, Settings as SettingsIcon
} from 'lucide-react';
import { authService } from '../services/api';

const Sidebar = () => {
  // State
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 280;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  // Theme
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  // Sections
  const SECTIONS = [
    {
      title: 'WORKSPACE',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null, isDashboard: true },
        { to: '/library', label: 'Document Library', icon: Library, badge: null },
        { to: '/assistant', label: 'Study Assistant', icon: Sparkles, badge: null },
      ]
    },
    {
      title: 'LEARNING',
      items: [
        { to: '/create', label: 'Create Cards', icon: PlusCircle, badge: null },
        { to: '/review', label: 'Review Cards', icon: Play, badge: { text: '12', color: 'bg-rose-500' } },
        { to: '/summary', label: 'Smart Summaries', icon: FileText, badge: null },
        { to: '/quiz', label: 'AI Quiz', icon: HelpCircle, badge: null },
        { to: '/mindmap', label: 'Mind Maps', icon: Network, badge: null },
      ]
    },
    {
      title: 'PRODUCTIVITY',
      items: [
        { to: '/planner', label: 'Study Planner', icon: Calendar, badge: null },
        { to: '/analytics', label: 'Analytics', icon: BarChart3, badge: { text: 'Updated', color: 'bg-emerald-500 text-slate-900' } },
        { to: '/history', label: 'History', icon: HistoryIcon, badge: { text: 'New', color: 'bg-slate-700 text-white' } },
      ]
    }
  ];

  // Resizing Logic
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    let newWidth = e.clientX;
    
    // Limits
    if (newWidth < 72) newWidth = 72;
    if (newWidth > 340) newWidth = 340;
    
    // Auto collapse threshold
    if (newWidth < 140) {
      if (!isCollapsed) {
        setIsCollapsed(true);
        localStorage.setItem('sidebarCollapsed', 'true');
      }
      setSidebarWidth(72);
    } else {
      if (isCollapsed) {
        setIsCollapsed(false);
        localStorage.setItem('sidebarCollapsed', 'false');
      }
      setSidebarWidth(newWidth);
    }
  }, [isDragging, isCollapsed]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (!isCollapsed) {
      localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    }
  }, [isDragging, isCollapsed, sidebarWidth]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(parseInt(localStorage.getItem('sidebarWidth') || '280', 10));
      localStorage.setItem('sidebarCollapsed', 'false');
    } else {
      setIsCollapsed(true);
      setSidebarWidth(72);
      localStorage.setItem('sidebarCollapsed', 'true');
    }
  };

  const currentWidth = isCollapsed ? 72 : sidebarWidth;
  const transitionClass = isDragging ? '' : 'transition-all duration-250 ease-in-out';

  return (
    <>
      <style>{`
        .scrollbar-minimal::-webkit-scrollbar {
          width: 2px;
        }
        .scrollbar-minimal::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-minimal::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        .scrollbar-minimal:hover::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
        }
        .group:hover .tooltip-label {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }
      `}</style>

      {/* Mobile Hamburger */}
      <div className="md:hidden fixed bottom-6 right-6 z-[60]">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="bg-[#6D5DF6] text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform"
        >
          <Menu size={24} />
        </button>
      </div>
      
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <aside 
        className={`fixed md:relative top-0 left-0 z-[60] h-screen bg-[#0B1020] border-r border-white/[0.06] flex flex-col text-[#E5E7EB] font-sans shrink-0
        ${transitionClass}
        ${isMobileOpen ? 'translate-x-0 w-[280px]' : 'md:translate-x-0'}
        `}
        style={{ width: isMobileOpen ? 280 : currentWidth, transform: (!isMobileOpen && window.innerWidth < 768) ? 'translateX(-100%)' : '' }}
      >
        
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 h-full w-[6px] translate-x-[3px] cursor-col-resize z-50 group hover:bg-[#6D5DF6]/20 hidden md:block"
        >
          {isDragging && <div className="absolute top-0 right-0 w-[2px] h-full bg-[#6D5DF6] shadow-[0_0_8px_#6D5DF6]" />}
        </div>

        {/* Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={`absolute top-[22px] w-[40px] h-[40px] rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 shadow-lg hover:scale-105 hover:bg-white/10 hover:text-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all z-[70] hidden md:flex
            ${transitionClass}`}
          style={{ right: -20 }}
        >
          <ChevronLeft size={20} className={`${transitionClass} ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
        </button>

        {/* Mobile Close */}
        <button 
          className="md:hidden absolute right-4 top-6 text-white/50 hover:text-white"
          onClick={() => setIsMobileOpen(false)}
        >
          <X size={24} />
        </button>

        {/* Header - Fixed Height 84px */}
        <div className={`h-[84px] flex items-center px-[22px] border-b border-white/[0.06] shrink-0 ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'justify-start'}`}>
          <div className="flex items-center space-x-3 overflow-hidden whitespace-nowrap w-full justify-center md:justify-start">
            <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-tr from-[#6D5DF6] to-[#8B5CF6] flex items-center justify-center shadow-lg shrink-0">
              <BookOpen className="w-[20px] h-[20px] text-white" />
            </div>
            <div className={`flex flex-col transition-opacity duration-250 ${isCollapsed && !isMobileOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              <span className="text-[17px] font-[700] text-white tracking-tight leading-tight">SmartFlash</span>
              <span className="text-[12px] font-[500] text-[#94A3B8] leading-tight mt-0.5">AI Learning Platform</span>
            </div>
          </div>
        </div>

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-minimal py-6">
          {SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="mb-[24px]">
              {(!isCollapsed || isMobileOpen) && (
                <div className="text-[12px] font-[600] text-[#94A3B8] uppercase tracking-[0.15em] px-[24px] mb-[12px] sticky top-0 bg-[#0B1020]/90 backdrop-blur-sm z-10 py-1">
                  {section.title}
                </div>
              )}
              
              <div className="space-y-[6px] px-[12px]">
                {section.items.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <div key={item.to} className="relative group">
                      <Link
                        to={item.to}
                        onClick={() => setIsMobileOpen(false)}
                        className={`relative flex items-center h-[52px] rounded-[16px] transition-all duration-200 ease-out cursor-pointer
                          ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-[16px] gap-[14px]'}
                          ${active 
                            ? 'bg-gradient-to-r from-[#6D5DF6] to-[#8B5CF6] text-white shadow-[0_4px_16px_rgba(109,93,246,0.25)]' 
                            : 'text-[#94A3B8] hover:bg-[#141B34] hover:text-[#E5E7EB] hover:translate-x-[4px]'
                          }
                        `}
                      >
                        {active && (
                          <div className="absolute left-0 top-[12%] bottom-[12%] w-[4px] rounded-r-md bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                        )}
                        <div className="shrink-0 flex items-center justify-center">
                          <item.icon className="w-[24px] h-[24px]" strokeWidth={2} />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                          <div className="flex flex-1 items-center justify-between whitespace-nowrap overflow-hidden">
                            <span className="text-[16px] font-[600] truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badge.color}`}>
                                {item.badge.text}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                      
                      {/* Tooltip for collapsed mode */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="tooltip-label absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-[#141B34] border border-white/10 text-white px-3 py-1.5 rounded-lg text-[14px] font-[600] whitespace-nowrap opacity-0 invisible -translate-x-2 transition-all duration-200 shadow-xl z-50">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-[12px] border-t border-white/[0.06] shrink-0 space-y-[6px]">
          {(!isCollapsed || isMobileOpen) && (
            <div className="text-[12px] font-[600] text-[#94A3B8] uppercase tracking-[0.15em] px-[12px] mb-[8px]">
              SETTINGS
            </div>
          )}

          <div className="relative group">
            <Link
              to="/settings"
              onClick={() => setIsMobileOpen(false)}
              className={`relative flex items-center h-[52px] rounded-[16px] transition-all duration-200 ease-out cursor-pointer text-[#94A3B8] hover:bg-[#141B34] hover:text-[#E5E7EB] hover:translate-x-[4px] ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-[16px] gap-[14px]'}`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <SettingsIcon className="w-[24px] h-[24px]" strokeWidth={2} />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-1 items-center whitespace-nowrap overflow-hidden">
                  <span className="text-[16px] font-[600] truncate">Settings</span>
                </div>
              )}
            </Link>
            {isCollapsed && !isMobileOpen && (
              <div className="tooltip-label absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-[#141B34] border border-white/10 text-white px-3 py-1.5 rounded-lg text-[14px] font-[600] whitespace-nowrap opacity-0 invisible -translate-x-2 transition-all duration-200 shadow-xl z-50">
                Settings
              </div>
            )}
          </div>

          <div className="relative group">
            <button
              onClick={toggleTheme}
              className={`w-full relative flex items-center h-[52px] rounded-[16px] transition-all duration-200 ease-out cursor-pointer text-[#94A3B8] hover:bg-[#141B34] hover:text-[#E5E7EB] hover:translate-x-[4px] ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-[16px] gap-[14px]'}`}
            >
              <div className="shrink-0 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-[24px] h-[24px]" strokeWidth={2} /> : <Sun className="w-[24px] h-[24px]" strokeWidth={2} />}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-1 items-center whitespace-nowrap overflow-hidden">
                  <span className="text-[16px] font-[600] truncate">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
              )}
            </button>
            {isCollapsed && !isMobileOpen && (
              <div className="tooltip-label absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-[#141B34] border border-white/10 text-white px-3 py-1.5 rounded-lg text-[14px] font-[600] whitespace-nowrap opacity-0 invisible -translate-x-2 transition-all duration-200 shadow-xl z-50">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </div>
            )}
          </div>

          <div className="relative group">
            <button
              onClick={handleLogout}
              className={`w-full relative flex items-center h-[52px] rounded-[16px] transition-all duration-200 ease-out cursor-pointer text-rose-400 hover:bg-[#141B34] hover:text-rose-300 hover:translate-x-[4px] ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-[16px] gap-[14px]'}`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <LogOut className="w-[24px] h-[24px]" strokeWidth={2} />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-1 items-center whitespace-nowrap overflow-hidden">
                  <span className="text-[16px] font-[600] truncate">Log Out</span>
                </div>
              )}
            </button>
            {isCollapsed && !isMobileOpen && (
              <div className="tooltip-label absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-[#141B34] border border-white/10 text-white px-3 py-1.5 rounded-lg text-[14px] font-[600] whitespace-nowrap opacity-0 invisible -translate-x-2 transition-all duration-200 shadow-xl z-50">
                Log Out
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
