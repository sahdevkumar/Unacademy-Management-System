import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TableEditor from './components/TableEditor';
import ClassSchedule from './components/ClassSchedule';
import TeachersView from './components/TeachersView';
import TeacherTaskView from './components/TeacherTaskView';
import LiveScheduleView from './components/LiveScheduleView';
import SqlEditor from './components/SqlEditor';
import AccessControlView from './components/AccessControlView';
import PermissionDenied from './components/PermissionDenied';
import LoginView from './components/LoginView';
import { View } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { ClassProvider } from './context/ClassContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth, PermissionKey } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { isLoading: authLoading, hasPermission, isAuthenticated } = useAuth();
  
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
    // Mapping every View to its required PermissionKey
    const guards: Partial<Record<View, PermissionKey>> = {
      [View.DASHBOARD]: 'VIEW_DASHBOARD',
      [View.TABLE_EDITOR]: 'VIEW_SCHEDULE_LIST',
      [View.LIVE_SCHEDULE]: 'VIEW_LIVE_SCHEDULE',
      [View.CLASS_SCHEDULE]: 'VIEW_CLASS_SCHEDULE',
      [View.TEACHER_TASKS]: 'VIEW_TEACHER_TASKS',
      [View.TEACHERS]: 'MANAGE_TEACHERS',
      [View.SETTINGS]: 'VIEW_SETTINGS',
      [View.SQL_EDITOR]: 'ACCESS_SQL_EDITOR',
      [View.ACCESS_CONTROL]: 'MANAGE_ROLES',
    };

    const requiredPermission = guards[currentView];
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return <PermissionDenied onBack={() => setCurrentView(View.DASHBOARD)} />;
    }

    switch (currentView) {
      case View.DASHBOARD:
        return <DashboardView />;
      case View.CLASS_SCHEDULE:
        return <ClassSchedule />;
      case View.TEACHERS:
        return <TeachersView />;
      case View.TABLE_EDITOR:
        return <TableEditor />;
      case View.LIVE_SCHEDULE:
        return <LiveScheduleView />;
      case View.TEACHER_TASKS:
        return <TeacherTaskView />;
      case View.SQL_EDITOR:
        return <SqlEditor />;
      case View.ACCESS_CONTROL:
        return <AccessControlView />;
      case View.SETTINGS:
        return <div className="p-8 text-supabase-muted">Settings Module - Coming Soon</div>;
      default:
        return (
          <div className="flex items-center justify-center h-full text-supabase-muted p-8">
            <div className="text-center">
                <h2 className="text-xl font-medium text-supabase-text mb-2">Module Offline</h2>
                <p>This view ({currentView}) is either currently in development or restricted.</p>
                <button 
                  onClick={() => setCurrentView(View.DASHBOARD)}
                  className="mt-4 px-4 py-2 bg-supabase-green text-black rounded font-medium"
                >
                    Back to Dashboard
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