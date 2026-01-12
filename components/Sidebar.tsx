import React, { useState, useEffect } from 'react';
import { View, NavItem } from '../types';
import { useAuth, PermissionKey } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Table, 
  Database, 
  Settings, 
  Users, 
  Radio, 
  ChevronDown,
  ChevronRight,
  Archive,
  CalendarDays,
  GraduationCap,
  Terminal,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen = false, onClose }) => {
  const { hasPermission, user } = useAuth();
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(true);

  // Group schedule views
  const scheduleViews = [View.CLASS_SCHEDULE, View.TABLE_EDITOR, View.LIVE_SCHEDULE];
  
  // Auto-expand if current view is a schedule view
  useEffect(() => {
    if (scheduleViews.includes(currentView)) {
      setIsScheduleExpanded(true);
    }
  }, [currentView]);

  const handleNavClick = (viewId: string) => {
    if (Object.values(View).includes(viewId as any)) {
      onChangeView(viewId as View);
      if (onClose) onClose();
    }
  };

  const renderNavItem = (id: View, label: string, icon: React.ReactNode, permission: PermissionKey, isSubItem = false) => {
    if (!hasPermission(permission)) return null;

    const isActive = currentView === id;

    return (
      <button
        key={id}
        onClick={() => handleNavClick(id)}
        className={`w-full flex items-center gap-3 py-2 rounded-md transition-all text-sm font-medium mb-1
          ${isSubItem ? 'pl-9 pr-3' : 'px-3'}
          ${isActive 
            ? 'bg-supabase-green/10 text-supabase-green' 
            : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'
          }`}
        title={label}
      >
        {!isSubItem && <span className={isActive ? 'text-supabase-green' : ''}>{icon}</span>}
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const canSeeAnySchedule = 
    hasPermission('VIEW_CLASS_SCHEDULE') || 
    hasPermission('VIEW_SCHEDULE_LIST') || 
    hasPermission('VIEW_LIVE_SCHEDULE');

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
          <div className={`w-8 h-8 rounded flex items-center justify-center text-black font-bold mr-3 transition-colors ${user?.role === 'superadmin' ? 'bg-purple-400' : 'bg-supabase-green'}`}>
            {user?.role === 'superadmin' ? 'S' : 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-supabase-text truncate">Unacademy</div>
            <div className="text-[10px] text-supabase-muted uppercase tracking-tighter truncate">
                {user?.role === 'superadmin' ? 'System Superadmin' : 'Management System'}
            </div>
          </div>
        </div>

        {/* Main Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Workspace
          </div>
          
          {renderNavItem(View.DASHBOARD, 'Dashboard', <LayoutDashboard size={18} />, 'VIEW_DASHBOARD')}
          
          {/* Grouped Schedule Menu */}
          {canSeeAnySchedule && (
            <div className="mb-1">
              <button 
                onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                  ${scheduleViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays size={18} className={scheduleViews.includes(currentView) ? 'text-supabase-green' : ''} />
                  <span>Schedule</span>
                </div>
                {isScheduleExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {isScheduleExpanded && (
                <div className="mt-1 space-y-0.5">
                  {renderNavItem(View.CLASS_SCHEDULE, 'Class Schedule', null, 'VIEW_CLASS_SCHEDULE', true)}
                  {renderNavItem(View.TABLE_EDITOR, 'Schedule List', null, 'VIEW_SCHEDULE_LIST', true)}
                  {renderNavItem(View.LIVE_SCHEDULE, 'Live Schedule', null, 'VIEW_LIVE_SCHEDULE', true)}
                </div>
              )}
            </div>
          )}

          {renderNavItem(View.TEACHER_TASKS, 'Teacher Task', <CheckSquare size={18} />, 'VIEW_TEACHER_TASKS')}
          
          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Management
          </div>
          
          {renderNavItem(View.TEACHERS, 'Teachers', <GraduationCap size={18} />, 'MANAGE_TEACHERS')}
          {renderNavItem(View.ACCESS_CONTROL, 'Access Control', <ShieldCheck size={18} />, 'MANAGE_ROLES')}
          {renderNavItem(View.SQL_EDITOR, 'SQL Editor', <Terminal size={18} />, 'ACCESS_SQL_EDITOR')}

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover text-sm font-medium mb-1">
            <Database size={18} />
            <span>Database</span>
          </button>
        </div>

        {/* Bottom Nav */}
        <div className="p-3 border-t border-supabase-border">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover text-sm font-medium mb-1">
                <Archive size={18} />
                <span>Storage</span>
            </button>
            {renderNavItem(View.SETTINGS, 'Settings', <Settings size={18} />, 'VIEW_SETTINGS')}
        </div>
      </div>
    </>
  );
};

export default Sidebar;