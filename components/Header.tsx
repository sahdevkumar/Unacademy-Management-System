import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, HelpCircle, User, ChevronRight, Settings, FlaskConical, Menu } from 'lucide-react';
import { View } from '../types';
import { useTheme, Theme } from '../context/ThemeContext';
import { useClass } from '../context/ClassContext';

interface HeaderProps {
  currentView: View;
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onMenuToggle }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { selectedClassId } = useClass();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getBreadcrumb = () => {
    switch (currentView) {
      case View.DASHBOARD: return 'Dashboard';
      case View.TABLE_EDITOR: return 'Schedule List';
      case View.LIVE_SCHEDULE: return 'Live Schedule';
      case View.AUTH: return 'Authentication';
      case View.CLASS_SCHEDULE: return 'Schedule';
      case View.SETTINGS: return 'Settings';
      default: return 'Dashboard';
    }
  };

  const renderThemeOption = (value: Theme, label: string) => {
    const isActive = theme === value;
    return (
      <button 
        onClick={() => setTheme(value)}
        className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-3 transition-colors ${isActive ? 'text-supabase-text' : 'text-supabase-muted hover:bg-supabase-hover hover:text-supabase-text'}`}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-supabase-text"></div>}
        </div>
        {label}
      </button>
    );
  };

  return (
    <header className="h-14 bg-supabase-bg border-b border-supabase-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-supabase-muted overflow-hidden">
        <button 
            onClick={onMenuToggle}
            className="mr-3 md:hidden text-supabase-muted hover:text-supabase-text p-1"
        >
            <Menu size={20} />
        </button>

        <span className="hover:text-supabase-text cursor-pointer transition-colors block truncate max-w-[150px] sm:max-w-none">Management System</span>
        
        <ChevronRight size={16} className="mx-2 flex-shrink-0" />
        <span className="text-supabase-muted font-normal truncate">{getBreadcrumb()}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-4 pl-2 shrink-0">
        <div className="relative hidden md:block group">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-text" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-supabase-sidebar border border-supabase-border rounded-full py-1.5 pl-9 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green w-64 transition-all"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-supabase-muted border border-supabase-border rounded px-1.5 py-0.5">/</span>
        </div>
        
        <button className="text-supabase-green border border-supabase-green px-3 py-1.5 rounded text-xs font-medium hover:bg-supabase-green/10 transition-colors hidden sm:block">
          Feedback
        </button>

        <div className="h-6 w-px bg-supabase-border mx-1 hidden sm:block"></div>

        <button className="text-supabase-muted hover:text-supabase-text transition-colors hidden sm:block">
          <Bell size={18} />
        </button>
        <button className="text-supabase-muted hover:text-supabase-text transition-colors hidden sm:block">
          <HelpCircle size={18} />
        </button>
        
        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`w-8 h-8 rounded-full bg-supabase-panel border flex items-center justify-center transition-colors ${isUserMenuOpen ? 'border-supabase-green text-supabase-text' : 'border-supabase-border text-supabase-muted hover:text-supabase-text hover:border-supabase-muted'}`}
            >
                <User size={16} />
            </button>

            {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right ring-1 ring-white/5">
                    <div className="px-4 py-3 border-b border-supabase-border">
                        <div className="text-sm text-supabase-text font-medium truncate">akanksharoy505@gmail.com</div>
                    </div>
                    
                    <div className="py-1 border-b border-supabase-border">
                        <button className="w-full text-left px-4 py-2 text-sm text-supabase-muted hover:bg-supabase-hover hover:text-supabase-text flex items-center gap-3 transition-colors">
                            <Settings size={16} />
                            Account preferences
                        </button>
                         <button className="w-full text-left px-4 py-2 text-sm text-supabase-muted hover:bg-supabase-hover hover:text-supabase-text flex items-center gap-3 transition-colors">
                            <FlaskConical size={16} />
                            Feature previews
                        </button>
                    </div>

                    <div className="py-2 border-b border-supabase-border">
                        <div className="px-4 py-1 text-xs text-supabase-muted mb-1">Theme</div>
                        {renderThemeOption('dark', 'Dark')}
                        {renderThemeOption('light', 'Light')}
                        {renderThemeOption('classic-dark', 'Classic Dark')}
                        {renderThemeOption('system', 'System')}
                    </div>

                    <div className="py-1">
                        <button className="w-full text-left px-4 py-2 text-sm text-supabase-muted hover:bg-supabase-hover hover:text-supabase-text transition-colors">
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;