import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TableEditor from './components/TableEditor';
import ClassSchedule from './components/ClassSchedule';
import TeachersView from './components/TeachersView';
import LiveScheduleView from './components/LiveScheduleView';
import { View } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { ClassProvider } from './context/ClassContext';
import { ToastProvider } from './context/ToastContext';

const AppContent: React.FC = () => {
  // Initialize view from localStorage
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem('supabase-clone-view');
    // Validate if savedView is a valid View enum value
    if (savedView && Object.values(View).includes(savedView as View)) {
      return savedView as View;
    }
    return View.DASHBOARD;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Save view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('supabase-clone-view', currentView);
  }, [currentView]);

  const renderContent = () => {
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
      default:
        return (
          <div className="flex items-center justify-center h-full text-supabase-muted">
            <div className="text-center">
                <h2 className="text-xl font-medium text-supabase-text mb-2">Coming Soon</h2>
                <p>This module is not implemented in this demo.</p>
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

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ClassProvider>
          <AppContent />
        </ClassProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;