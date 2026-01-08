import React from 'react';
import { View, NavItem } from '../types';
import { 
  LayoutDashboard, 
  Table, 
  Database, 
  Settings, 
  Users, 
  Radio, 
  BarChart3, 
  Globe, 
  Archive,
  CalendarDays,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen = false, onClose }) => {
  const navItems: NavItem[] = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: View.CLASS_SCHEDULE, label: 'Class Schedule', icon: <CalendarDays size={20} /> },
    { id: View.TABLE_EDITOR, label: 'Schedule List', icon: <Table size={20} /> },
    { id: View.LIVE_SCHEDULE, label: 'Live Schedule', icon: <Radio size={20} /> },
    { id: View.AUTH, label: 'Authentication', icon: <Users size={20} /> },
  ];

  const bottomItems = [
     { id: 'storage', label: 'Storage', icon: <Archive size={20} /> },
     { id: 'api', label: 'API Docs', icon: <Globe size={20} /> },
     { id: View.SETTINGS, label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleNavClick = (viewId: string) => {
    if (Object.values(View).includes(viewId as any)) {
      onChangeView(viewId as View);
      if (onClose) onClose();
    }
  };

  const renderItem = (item: NavItem | { id: string, label: string, icon: React.ReactNode }) => {
    const isActive = 'id' in item && typeof item.id === 'string' && Object.values(View).includes(item.id as View) 
      ? (item.id as View) === currentView 
      : false;

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium mb-1
          ${isActive 
            ? 'bg-supabase-green/10 text-supabase-green' 
            : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'
          }`}
        title={item.label}
      >
        <span className={isActive ? 'text-supabase-green' : ''}>{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
      )}
      
      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-supabase-sidebar border-r border-supabase-border flex flex-col flex-shrink-0 
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Project Header */}
        <div className="h-14 flex items-center px-4 border-b border-supabase-border">
          <div className="w-8 h-8 bg-supabase-green rounded flex items-center justify-center text-black font-bold mr-3">
            U
          </div>
          <div>
            <div className="text-sm font-medium text-supabase-text">Unacademy</div>
            <div className="text-xs text-supabase-muted">Management System</div>
          </div>
        </div>

        {/* Main Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Project
          </div>
          {navItems.map(renderItem)}
          
          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Management
          </div>
          <button 
            onClick={() => handleNavClick(View.TEACHERS)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium mb-1
              ${currentView === View.TEACHERS 
                ? 'bg-supabase-green/10 text-supabase-green' 
                : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'
              }`}
          >
            <GraduationCap size={20} />
            <span>Teachers</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover text-sm font-medium mb-1">
            <Database size={20} />
            <span>Database</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover text-sm font-medium mb-1">
            <BarChart3 size={20} />
            <span>Reports</span>
          </button>
        </div>

        {/* Bottom Nav */}
        <div className="p-3 border-t border-supabase-border">
          {bottomItems.map(renderItem)}
        </div>
      </div>
    </>
  );
};

export default Sidebar;