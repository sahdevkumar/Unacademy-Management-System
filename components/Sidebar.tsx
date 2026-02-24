
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
  CheckSquare, 
  Clock, 
  User, 
  ListChecks,
  Briefcase,
  Cpu,
  FileText,
  CreditCard,
  Book,
  Activity,
  Wallet,
  Coins,
  Percent,
  Calculator,
  Scale,
  PhoneCall,
  UserCheck,
  ClipboardList,
  BarChart3,
  MessageSquarePlus,
  History,
  ListTodo
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen = false, onClose }) => {
  const { hasPermission, user, branding } = useAuth();
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(true);
  const [isTeacherExpanded, setIsTeacherExpanded] = useState(false);
  const [isPayrollExpanded, setIsPayrollExpanded] = useState(false);

  // Group views
  const scheduleViews = [View.CLASS_SCHEDULE, View.TABLE_EDITOR, View.LIVE_SCHEDULE];
  const teacherViews = [View.TEACHER_TASKS, View.TODAY_TASK];
  const payrollViews = [View.PAYROLL, View.PAYROLL_SETUP, View.PAYROLL_BASE_SALARY, View.PAYROLL_DEDUCTIONS];
  
  // Auto-expand if current view is in the group
  useEffect(() => {
    if (scheduleViews.includes(currentView)) setIsScheduleExpanded(true);
    if (teacherViews.includes(currentView)) setIsTeacherExpanded(true);
    if (payrollViews.includes(currentView)) setIsPayrollExpanded(true);
  }, [currentView]);

  const handleNavClick = (viewId: View) => {
    onChangeView(viewId);
    if (onClose) onClose();
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
          <div className={`w-8 h-8 rounded flex items-center justify-center text-black font-bold mr-3 transition-colors overflow-hidden ${!branding.logoUrl ? (user?.role === 'superadmin' ? 'bg-purple-400' : 'bg-supabase-green') : 'bg-transparent'}`}>
            {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
                user?.role === 'superadmin' ? 'S' : 'U'
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-supabase-text truncate">{branding.orgName || 'Unacademy'}</div>
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
          {renderNavItem(View.ENQUIRE_CALL, 'Enquire Call', <MessageSquarePlus size={18} />, 'VIEW_TEACHER_TASKS')}
          {renderNavItem(View.STUDENT_ATTENDANCE, 'Student Attendance', <UserCheck size={18} />, 'VIEW_TEACHER_TASKS')}
          {renderNavItem(View.ABSENT_CALL, 'Absent Call', <PhoneCall size={18} />, 'VIEW_TEACHER_TASKS')}
          
          {/* Grouped Schedule Menu */}
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

          {/* Grouped Teacher Menu */}
          <div className="mb-1">
            <button 
              onClick={() => setIsTeacherExpanded(!isTeacherExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${teacherViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare size={18} className={teacherViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Teacher</span>
              </div>
              {isTeacherExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {isTeacherExpanded && (
              <div className="mt-1 space-y-0.5">
                {renderNavItem(View.TEACHER_TASKS, 'Teacher Tasks', null, 'VIEW_TEACHER_TASKS', true)}
                {renderNavItem(View.TODAY_TASK, 'Today Task', null, 'VIEW_TEACHER_TASKS', true)}
              </div>
            )}
          </div>
          
          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Operations
          </div>
          {renderNavItem(View.ATTENDANCE_DASHBOARD, 'Attendance Stats', <BarChart3 size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.ENQUIRE_CALL_LOG, 'Enquiry Call Log', <History size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.ABSENT_CALL_LOG, 'Absent Call Log', <ClipboardList size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.DOCUMENT, 'Documents', <FileText size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.BANKING, 'Banking', <CreditCard size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.LEDGER, 'Ledger', <Book size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.WORK_PROGRESS, 'Work Progress', <Activity size={18} />, 'VIEW_REPORTS')}

          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Management
          </div>
          
          {renderNavItem(View.TEACHERS, 'Teachers List', <GraduationCap size={18} />, 'MANAGE_TEACHERS')}
          {renderNavItem(View.EMPLOYEES, 'Employees', <Briefcase size={18} />, 'MANAGE_TEACHERS')}
          {renderNavItem(View.ACCESS_CONTROL, 'Access Control', <ShieldCheck size={18} />, 'MANAGE_ROLES')}
          {renderNavItem(View.TASK_MANAGEMENT, 'Task Management', <ListTodo size={18} />, 'VIEW_TEACHER_TASKS')}

          {renderNavItem(View.SQL_EDITOR, 'SQL Editor', <Terminal size={18} />, 'ACCESS_SQL_EDITOR')}
          {renderNavItem(View.MCP_CONSOLE, 'MCP Console', <Cpu size={18} />, 'ACCESS_SQL_EDITOR')}

          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Finance
          </div>
          
          <div className="mb-1">
            <button 
              onClick={() => setIsPayrollExpanded(!isPayrollExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${payrollViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <Wallet size={18} className={payrollViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Payroll</span>
              </div>
              {isPayrollExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {isPayrollExpanded && (
              <div className="mt-1 space-y-0.5">
                {renderNavItem(View.PAYROLL, 'Financial Ledger', null, 'ACCESS_SQL_EDITOR', true)}
                {renderNavItem(View.PAYROLL_SETUP, 'Salary Structure', null, 'ACCESS_SQL_EDITOR', true)}
                {renderNavItem(View.PAYROLL_BASE_SALARY, 'Base Scale Registry', null, 'ACCESS_SQL_EDITOR', true)}
                {renderNavItem(View.PAYROLL_DEDUCTIONS, 'Deduction Rules', null, 'ACCESS_SQL_EDITOR', true)}
              </div>
            )}
          </div>

          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Account
          </div>
          
          {renderNavItem(View.MY_TASK, 'My Task', <ListChecks size={18} />, 'VIEW_TEACHER_TASKS')}
          
          <button 
            onClick={() => handleNavClick(View.DASHBOARD)} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover text-sm font-medium mb-1"
          >
            <User size={18} />
            <span>My Profile</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover text-sm font-medium mt-4">
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
