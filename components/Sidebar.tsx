
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { View, NavItem } from '../types';
import { useAuth, PermissionKey } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Table, 
  Settings, 
  Users, 
  Radio, 
  ChevronDown, 
  ChevronRight, 
  CalendarDays, 
  GraduationCap, 
  ShieldCheck, 
  CheckSquare, 
  Clock, 
  User, 
  ListChecks,
  Briefcase,
  Cpu,
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
  ListTodo,
  UserPlus,
  MessageSquare,
  BookOpen,
  DollarSign,
  Receipt,
  FileText
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen = false, onClose }) => {
  const { hasPermission, user, designations } = useAuth();
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(true);
  const [isTeacherExpanded, setIsTeacherExpanded] = useState(false);
  const [isAcademicExpanded, setIsAcademicExpanded] = useState(false);
  const [isPayrollExpanded, setIsPayrollExpanded] = useState(false);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Group views
  const scheduleViews = [View.CLASS_SCHEDULE, View.TABLE_EDITOR, View.LIVE_SCHEDULE];
  const teacherViews = [View.TEACHER_TASKS, View.TODAY_TASK];
  const academicViews = [View.STUDENTS, View.STUDENT_ATTENDANCE, View.REGISTRATION, View.ADMISSION, View.STUDENT_FEEDBACK];
  const payrollViews = [View.PAYROLL, View.PAYROLL_SETUP, View.PAYROLL_BASE_SALARY, View.PAYROLL_DEDUCTIONS];
  const financeViews = [View.FEE_COLLECTION, View.FEE_STRUCTURE, View.BILLING];
  
  // Auto-expand if current view is in the group and collapse others
  useEffect(() => {
    setIsScheduleExpanded(scheduleViews.includes(currentView));
    setIsTeacherExpanded(teacherViews.includes(currentView));
    setIsAcademicExpanded(academicViews.includes(currentView));
    setIsPayrollExpanded(payrollViews.includes(currentView));
    setIsFinanceExpanded(financeViews.includes(currentView));
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
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar Content */}
      <motion.div 
        initial={false}
        animate={{ 
          x: isMobile ? (isOpen ? 0 : -256) : 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          mass: 1
        }}
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-supabase-sidebar border-r border-supabase-border flex flex-col flex-shrink-0 
          md:static
        `}
      >
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
          {renderNavItem(View.ENQUIRE_CALL, 'Enquire Call', <MessageSquarePlus size={18} />, 'VIEW_TEACHER_TASKS')}
          {renderNavItem(View.STUDENT_ATTENDANCE, 'Student Attendance', <UserCheck size={18} />, 'VIEW_TEACHER_TASKS')}
          {renderNavItem(View.ABSENT_CALL, 'Absent Call', <PhoneCall size={18} />, 'VIEW_TEACHER_TASKS')}

          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Academic
          </div>
          
          <div className="mb-1">
            <button 
              onClick={() => {
                const newState = !isAcademicExpanded;
                setIsAcademicExpanded(newState);
                if (newState) {
                  setIsScheduleExpanded(false);
                  setIsTeacherExpanded(false);
                  setIsPayrollExpanded(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${academicViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={18} className={academicViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Academic</span>
              </div>
              <motion.div
                animate={{ rotate: isAcademicExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isAcademicExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-1 space-y-0.5 overflow-hidden"
                >
                  {renderNavItem(View.STUDENTS, "Student's", <Users size={18} />, 'VIEW_ACADEMIC', true)}
                  {renderNavItem(View.STUDENT_ATTENDANCE, 'Attendance', <UserCheck size={18} />, 'VIEW_ACADEMIC', true)}
                  {renderNavItem(View.REGISTRATION, 'Registration', <ClipboardList size={18} />, 'VIEW_ACADEMIC', true)}
                  {renderNavItem(View.ADMISSION, 'Admission', <UserPlus size={18} />, 'VIEW_ACADEMIC', true)}
                  {renderNavItem(View.STUDENT_FEEDBACK, "Student's Feedback", <MessageSquare size={18} />, 'VIEW_ACADEMIC', true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Grouped Schedule Menu */}
          <div className="mb-1">
            <button 
              onClick={() => {
                const newState = !isScheduleExpanded;
                setIsScheduleExpanded(newState);
                if (newState) {
                  setIsAcademicExpanded(false);
                  setIsTeacherExpanded(false);
                  setIsPayrollExpanded(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${scheduleViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className={scheduleViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Schedule</span>
              </div>
              <motion.div
                animate={{ rotate: isScheduleExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isScheduleExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-1 space-y-0.5 overflow-hidden"
                >
                  {renderNavItem(View.CLASS_SCHEDULE, 'Class Schedule', null, 'VIEW_CLASS_SCHEDULE', true)}
                  {renderNavItem(View.TABLE_EDITOR, 'Schedule List', null, 'VIEW_SCHEDULE_LIST', true)}
                  {renderNavItem(View.LIVE_SCHEDULE, 'Live Schedule', null, 'VIEW_LIVE_SCHEDULE', true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grouped Teacher Menu */}
          <div className="mb-1">
            <button 
              onClick={() => {
                const newState = !isTeacherExpanded;
                setIsTeacherExpanded(newState);
                if (newState) {
                  setIsAcademicExpanded(false);
                  setIsScheduleExpanded(false);
                  setIsPayrollExpanded(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${teacherViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare size={18} className={teacherViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Teacher</span>
              </div>
              <motion.div
                animate={{ rotate: isTeacherExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isTeacherExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-1 space-y-0.5 overflow-hidden"
                >
                  {renderNavItem(View.TEACHER_TASKS, 'Teacher Tasks', null, 'VIEW_TEACHER_TASKS', true)}
                  {renderNavItem(View.TODAY_TASK, 'Today Task', null, 'VIEW_TEACHER_TASKS', true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Operations
          </div>
          {renderNavItem(View.ATTENDANCE_DASHBOARD, 'Attendance Stats', <BarChart3 size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.ENQUIRE_CALL_LOG, 'Enquiry Call Log', <History size={18} />, 'VIEW_REPORTS')}
          {renderNavItem(View.ABSENT_CALL_LOG, 'Absent Call Log', <ClipboardList size={18} />, 'VIEW_REPORTS')}
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

          {renderNavItem(View.MCP_CONSOLE, 'MCP Console', <Cpu size={18} />, 'ACCESS_SQL_EDITOR')}

          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Finance
          </div>
          
          <div className="mb-1">
            <button 
              onClick={() => {
                const newState = !isPayrollExpanded;
                setIsPayrollExpanded(newState);
                if (newState) {
                  setIsAcademicExpanded(false);
                  setIsScheduleExpanded(false);
                  setIsTeacherExpanded(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${payrollViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <Wallet size={18} className={payrollViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Payroll</span>
              </div>
              <motion.div
                animate={{ rotate: isPayrollExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isPayrollExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-1 space-y-0.5 overflow-hidden"
                >
                  {renderNavItem(View.PAYROLL, 'Financial Ledger', null, 'ACCESS_SQL_EDITOR', true)}
                  {renderNavItem(View.PAYROLL_SETUP, 'Salary Structure', null, 'ACCESS_SQL_EDITOR', true)}
                  {renderNavItem(View.PAYROLL_BASE_SALARY, 'Base Scale Registry', null, 'ACCESS_SQL_EDITOR', true)}
                  {renderNavItem(View.PAYROLL_DEDUCTIONS, 'Deduction Rules', null, 'ACCESS_SQL_EDITOR', true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-1">
            <button 
              onClick={() => {
                const newState = !isFinanceExpanded;
                setIsFinanceExpanded(newState);
                if (newState) {
                  setIsAcademicExpanded(false);
                  setIsScheduleExpanded(false);
                  setIsTeacherExpanded(false);
                  setIsPayrollExpanded(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium 
                ${financeViews.includes(currentView) ? 'text-supabase-text' : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'}`}
            >
              <div className="flex items-center gap-3">
                <DollarSign size={18} className={financeViews.includes(currentView) ? 'text-supabase-green' : ''} />
                <span>Student Finance</span>
              </div>
              <motion.div
                animate={{ rotate: isFinanceExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isFinanceExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-1 space-y-0.5 overflow-hidden"
                >
                  {renderNavItem(View.FEE_COLLECTION, 'Fee Collection', null, 'VIEW_REPORTS', true)}
                  {renderNavItem(View.FEE_STRUCTURE, 'Fee Structure', null, 'VIEW_REPORTS', true)}
                  {renderNavItem(View.BILLING, 'Billing & Invoices', null, 'VIEW_REPORTS', true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 mb-2 text-xs font-semibold text-supabase-muted uppercase tracking-wider px-3 pb-2">
            Account
          </div>
          
          {renderNavItem(View.MY_TASK, 'My Task', <ListChecks size={18} />, 'VIEW_TEACHER_TASKS')}
          
          <button 
            onClick={() => handleNavClick(View.PROFILE)} 
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium mb-1
              ${currentView === View.PROFILE 
                ? 'bg-supabase-green/10 text-supabase-green' 
                : 'text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover'
              }`}
          >
            <User size={18} />
            <span>My Profile</span>
          </button>
        </div>

        {/* Bottom Nav */}
        <div className="p-3 border-t border-supabase-border flex flex-col gap-2">
            {renderNavItem(View.SETTINGS, 'Settings', <Settings size={18} />, 'VIEW_SETTINGS')}
            
            <div className="mt-2 px-3 flex items-center justify-between text-[10px] text-supabase-muted font-mono uppercase tracking-widest">
              <span>Version</span>
              <span>v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</span>
            </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
