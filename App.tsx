
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TableEditor from './components/TableEditor';
import ClassSchedule from './components/ClassSchedule';
import TeachersView from './components/TeachersView';
import EmployeesView from './components/EmployeesView';
import TeacherTaskView from './components/TeacherTaskView';
import TodayTaskView from './components/TodayTaskView';
import MyTaskView from './components/MyTaskView';
import LiveScheduleView from './components/LiveScheduleView';
import SqlEditor from './components/SqlEditor';
import AccessControlView from './components/AccessControlView';
import SettingsView from './components/SettingsView';
import McpConsole from './components/McpConsole';
import PayrollView from './components/PayrollView';
import DeductionManagement from './components/DeductionManagement';
import SalarySetup from './components/SalarySetup';
import BaseSalaryRegistry from './components/BaseSalaryRegistry';
import AbsentCallView from './components/AbsentCallView';
import AbsentCallLogView from './components/AbsentCallLogView';
import StudentAttendanceView from './components/StudentAttendanceView';
import AttendanceDashboardView from './components/AttendanceDashboardView';
import EnquiryCallView from './components/EnquiryCallView';
import EnquiryCallLogView from './components/EnquiryCallLogView';
import TaskManagementView from './components/TaskManagementView';
import LoginView from './components/LoginView';
import { View } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { ClassProvider } from './context/ClassContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FileText, CreditCard, Book, Activity } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem('supabase-clone-view');
    if (savedView && Object.values(View).includes(savedView as View)) {
      return savedView as View;
    }
    return View.DASHBOARD;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('supabase-clone-view', currentView);
  }, [currentView]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-supabase-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-supabase-green rounded-lg flex items-center justify-center text-black font-bold text-2xl animate-pulse">
            U
          </div>
          <div className="flex items-center gap-2 text-supabase-muted">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-sm font-mono tracking-widest">LOADING SYSTEM...</span>
          </div>
        </div>
      </div>
    );
  }

  // Gate access with LoginView
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <DashboardView />;
      case View.CLASS_SCHEDULE:
        return <ClassSchedule />;
      case View.TEACHERS:
        return <TeachersView />;
      case View.EMPLOYEES:
        return <EmployeesView />;
      case View.TABLE_EDITOR:
        return <TableEditor />;
      case View.LIVE_SCHEDULE:
        return <LiveScheduleView />;
      case View.TEACHER_TASKS:
        return <TeacherTaskView />;
      case View.TODAY_TASK:
        return <TodayTaskView />;
      case View.MY_TASK:
        return <MyTaskView />;
      case View.SQL_EDITOR:
        return <SqlEditor />;
      case View.ACCESS_CONTROL:
        return <AccessControlView />;
      case View.SETTINGS:
        return <SettingsView />;
      case View.MCP_CONSOLE:
        return <McpConsole />;
      case View.PAYROLL:
        return <PayrollView />;
      case View.PAYROLL_DEDUCTIONS:
        return <DeductionManagement />;
      case View.PAYROLL_SETUP:
        return <SalarySetup />;
      case View.PAYROLL_BASE_SALARY:
        return <BaseSalaryRegistry />;
      case View.ABSENT_CALL:
        return <AbsentCallView />;
      case View.ABSENT_CALL_LOG:
        return <AbsentCallLogView />;
      case View.STUDENT_ATTENDANCE:
        return <StudentAttendanceView />;
      case View.ATTENDANCE_DASHBOARD:
        return <AttendanceDashboardView />;
      case View.ENQUIRE_CALL:
        return <EnquiryCallView />;
      case View.ENQUIRE_CALL_LOG:
        return <EnquiryCallLogView />;
      case View.TASK_MANAGEMENT:
        return <TaskManagementView />;
      case View.DOCUMENT:
      case View.BANKING:
      case View.LEDGER:
      case View.WORK_PROGRESS:
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-supabase-bg">
            <div className="w-20 h-20 bg-supabase-green/10 rounded-3xl flex items-center justify-center text-supabase-green mb-6 animate-bounce">
              {currentView === View.DOCUMENT && <FileText size={40} />}
              {currentView === View.BANKING && <CreditCard size={40} />}
              {currentView === View.LEDGER && <Book size={40} />}
              {currentView === View.WORK_PROGRESS && <Activity size={40} />}
            </div>
            <h2 className="text-2xl font-black text-supabase-text uppercase tracking-widest mb-4">{currentView.replace('_', ' ')} MODULE</h2>
            <p className="text-sm text-supabase-muted max-w-md leading-relaxed mb-8">
              Access individual {currentView.toLowerCase().replace('_', ' ')} records directly from the <strong>Employees</strong> matrix for deep-dive organizational insights.
            </p>
            <button 
              onClick={() => setCurrentView(View.EMPLOYEES)}
              className="bg-supabase-green text-black px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
            >
              Open Employees Directory
            </button>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-supabase-muted p-8 bg-supabase-bg/50">
            <div className="text-center p-8 bg-supabase-panel border border-supabase-border rounded-xl shadow-2xl max-w-md">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-supabase-text mb-2 tracking-tight">Module Offline</h2>
                <p className="text-sm leading-relaxed mb-6">
                  The requested module (<strong>{currentView}</strong>) is currently disconnected from the system core.
                </p>
                <button 
                  onClick={() => setCurrentView(View.DASHBOARD)}
                  className="w-full py-2 bg-supabase-green text-black rounded-lg font-bold hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
                >
                    Restore Dashboard Session
                </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-supabase-bg text-supabase-text overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
            currentView={currentView} 
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        <main className="flex-1 overflow-auto scrollbar-hide relative">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AlertTriangle = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ClassProvider>
            <AppContent />
          </ClassProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
