
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { View } from './types';
import { BookOpen, CreditCard, Book, Activity, WifiOff, Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { ClassProvider } from './context/ClassContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase, reinitializeSupabase } from './services/supabaseClient';

// Lazy load views for better performance
const DashboardView = lazy(() => import('./components/DashboardView'));
const TableEditor = lazy(() => import('./components/TableEditor'));
const ClassSchedule = lazy(() => import('./components/ClassSchedule'));
const TeachersView = lazy(() => import('./components/TeachersView'));
const EmployeesView = lazy(() => import('./components/EmployeesView'));
const TeacherTaskView = lazy(() => import('./components/TeacherTaskView'));
const TodayTaskView = lazy(() => import('./components/TodayTaskView'));
const MyTaskView = lazy(() => import('./components/MyTaskView'));
const LiveScheduleView = lazy(() => import('./components/LiveScheduleView'));
const AccessControlView = lazy(() => import('./components/AccessControlView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const PayrollView = lazy(() => import('./components/PayrollView'));
const DeductionManagement = lazy(() => import('./components/DeductionManagement'));
const SalarySetup = lazy(() => import('./components/SalarySetup'));
const BaseSalaryRegistry = lazy(() => import('./components/BaseSalaryRegistry'));
const AbsentCallView = lazy(() => import('./components/AbsentCallView'));
const AbsentCallLogView = lazy(() => import('./components/AbsentCallLogView'));
const AttendanceDashboardView = lazy(() => import('./components/AttendanceDashboardView'));
const EnquiryCallView = lazy(() => import('./components/EnquiryCallView'));
const EnquiryCallLogView = lazy(() => import('./components/EnquiryCallLogView'));
const TaskManagementView = lazy(() => import('./components/TaskManagementView'));
const StudentsView = lazy(() => import('./components/StudentsView'));
const RegistrationView = lazy(() => import('./components/RegistrationView'));
const AdmissionView = lazy(() => import('./components/AdmissionView'));
const ParentsView = lazy(() => import('./components/ParentsView'));
const StudentFeedbackView = lazy(() => import('./components/StudentFeedbackView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const FeeCollectionView = lazy(() => import('./components/FeeCollectionView'));
const FeeStructureView = lazy(() => import('./components/FeeStructureView'));
const BillingView = lazy(() => import('./components/BillingView'));
const LoginView = lazy(() => import('./components/LoginView'));

const ViewLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-supabase-green" size={32} />
      <span className="text-[10px] font-bold text-supabase-muted uppercase tracking-[0.2em]">Initializing Module...</span>
    </div>
  </div>
);

const MainLayout: React.FC<{ 
  currentView: View, 
  setCurrentView: (view: View) => void,
  isSidebarOpen: boolean,
  setIsSidebarOpen: (open: boolean) => void
}> = ({ currentView, setCurrentView, isSidebarOpen, setIsSidebarOpen }) => {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-supabase-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-supabase-green rounded-lg flex items-center justify-center text-black font-bold text-2xl animate-pulse">
            U
          </div>
          <div className="flex items-center gap-2 text-supabase-muted">
            <span className="animate-spin text-supabase-green">
              <Activity size={16} />
            </span>
            <span className="text-sm font-mono tracking-widest">AUTHENTICATING...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="h-screen bg-supabase-bg" />}>
        <LoginView />
      </Suspense>
    );
  }

  const renderView = () => {
    return (
      <Suspense fallback={<ViewLoader />}>
        {(() => {
          switch (currentView) {
            case View.DASHBOARD: return <DashboardView />;
            case View.TABLE_EDITOR: return <TableEditor />;
            case View.CLASS_SCHEDULE: return <ClassSchedule />;
            case View.TEACHERS: return <TeachersView />;
            case View.EMPLOYEES: return <EmployeesView />;
            case View.TEACHER_TASKS: return <TeacherTaskView />;
            case View.TODAY_TASK: return <TodayTaskView />;
            case View.MY_TASK: return <MyTaskView />;
            case View.LIVE_SCHEDULE: return <LiveScheduleView />;
            case View.ACCESS_CONTROL: return <AccessControlView />;
            case View.SETTINGS: return <SettingsView />;
            case View.PAYROLL: return <PayrollView />;
            case View.PAYROLL_DEDUCTIONS: return <DeductionManagement />;
            case View.PAYROLL_SETUP: return <SalarySetup />;
            case View.PAYROLL_BASE_SALARY: return <BaseSalaryRegistry />;
            case View.ABSENT_CALL: return <AbsentCallView />;
            case View.ABSENT_CALL_LOG: return <AbsentCallLogView />;
            case View.ATTENDANCE_DASHBOARD: return <AttendanceDashboardView />;
            case View.ENQUIRE_CALL: return <EnquiryCallView />;
            case View.ENQUIRE_CALL_LOG: return <EnquiryCallLogView />;
            case View.TASK_MANAGEMENT: return <TaskManagementView />;
            case View.STUDENTS: return <StudentsView />;
            case View.REGISTRATION: return <RegistrationView />;
            case View.ADMISSION: return <AdmissionView />;
            case View.PARENTS: return <ParentsView />;
            case View.STUDENT_FEEDBACK: return <StudentFeedbackView />;
            case View.PROFILE: return <ProfileView />;
            case View.FEE_COLLECTION: return <FeeCollectionView />;
            case View.FEE_STRUCTURE: return <FeeStructureView />;
            case View.BILLING: return <BillingView />;
            default: return <DashboardView />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="flex h-screen bg-supabase-bg text-supabase-text overflow-hidden font-sans selection:bg-supabase-green/30">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          onMenuToggle={() => setIsSidebarOpen(true)} 
          currentView={currentView}
          onChangeView={setCurrentView}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-supabase-bg/50">
          <div className="max-w-[1600px] mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [supabaseInstance, setSupabaseInstance] = useState(supabase);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  
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

  // Check for saved credentials on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('supabase_manual_url');
    const savedKey = localStorage.getItem('supabase_manual_key');
    if (savedUrl && savedKey && !supabaseInstance) {
      console.log("App: Found saved manual credentials, initializing...");
      const instance = reinitializeSupabase(savedUrl, savedKey);
      if (instance) setSupabaseInstance(instance);
    } else if (!supabaseInstance) {
      // Try to re-initialize from window.env if it's null
      console.log("App: Supabase is null, attempting re-initialization from environment...");
      const instance = reinitializeSupabase();
      if (instance) {
        setSupabaseInstance(instance);
      }
    }
  }, [supabaseInstance]);

  const handleManualConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl && manualKey) {
      localStorage.setItem('supabase_manual_url', manualUrl);
      localStorage.setItem('supabase_manual_key', manualKey);
      const instance = reinitializeSupabase(manualUrl, manualKey);
      if (instance) {
        setSupabaseInstance(instance);
        setShowManualConfig(false);
        window.location.reload(); // Reload to ensure all services pick up the new instance
      }
    }
  };

  if (!supabaseInstance) {
    return (
      <div className="min-h-screen bg-supabase-bg flex items-center justify-center p-4">
        <div className="bg-supabase-panel border border-supabase-border p-8 rounded-lg max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="text-red-500 flex justify-center">
            <WifiOff size={48} />
          </div>
          <h1 className="text-xl font-bold text-supabase-text uppercase tracking-tight">Supabase Not Configured</h1>
          
          {!showManualConfig ? (
            <>
              <p className="text-supabase-muted text-sm">
                Please add your <code className="bg-supabase-bg px-1 rounded text-supabase-green">VITE_SUPABASE_URL</code> and <code className="bg-supabase-bg px-1 rounded text-supabase-green">VITE_SUPABASE_ANON_KEY</code> to your environment variables.
              </p>
              <div className="bg-supabase-sidebar p-3 rounded text-[10px] text-left font-mono text-supabase-muted space-y-2 border border-supabase-border/50">
                <p className="text-supabase-green font-bold uppercase">Deployment Tip (Coolify):</p>
                <p>1. Go to your Coolify Dashboard.</p>
                <p>2. Add the variables in the "Environment Variables" tab.</p>
                <p>3. Click "Save" and then **Restart** your container.</p>
                <p className="opacity-50 italic">Note: If you just added them, a restart is required to inject them into the running app.</p>
              </div>
              <div className="pt-4 space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-supabase-green text-supabase-bg font-bold py-2.5 rounded uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg shadow-supabase-green/20"
                >
                  Retry Connection
                </button>
                <button 
                  onClick={() => setShowManualConfig(true)}
                  className="w-full bg-transparent border border-supabase-border text-supabase-text font-bold py-2.5 rounded uppercase tracking-widest hover:bg-supabase-sidebar transition-all"
                >
                  Configure Manually
                </button>
                <div className="pt-4 border-t border-supabase-border/30">
                  <p className="text-[9px] text-supabase-muted mb-2 italic">
                    Advanced Debugging:
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/debug-env');
                        const data = await res.json();
                        alert(JSON.stringify(data, null, 2));
                      } catch (e) {
                        alert("Failed to fetch debug info. Is the server running?");
                      }
                    }}
                    className="text-[10px] text-supabase-green hover:underline"
                  >
                    Check Server Environment Variables
                  </button>
                  <button
                    onClick={async () => {
                      const url = localStorage.getItem('supabase_manual_url') || 
                                 (window as any).env?.VITE_SUPABASE_URL || 
                                 (import.meta as any).env?.VITE_SUPABASE_URL;
                      
                      if (!url) {
                        alert("Supabase URL not found in environment or local storage.");
                        return;
                      }

                      try {
                        const start = Date.now();
                        // mode: 'no-cors' is key here to avoid CORS issues for a simple reachability check
                        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
                        const latency = Date.now() - start;
                        alert(`Network Check: SUCCESS\nYour browser can reach ${url}\nLatency: ${latency}ms`);
                      } catch (e: any) {
                        alert(`Network Check: FAILED\nYour browser could NOT reach ${url}\nError: ${e.message}\n\nThis usually means your local network or a firewall is blocking access to Supabase.`);
                      }
                    }}
                    className="block w-full text-[10px] text-supabase-green hover:underline mt-2"
                  >
                    Check Browser Network Reachability
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/supabase-health');
                        const data = await res.json();
                        alert(JSON.stringify(data, null, 2));
                      } catch (e) {
                        alert("Failed to fetch health info. Is the server running?");
                      }
                    }}
                    className="block w-full text-[10px] text-supabase-green hover:underline mt-2"
                  >
                    Check Server Health (Supabase Connection)
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('supabase_manual_url');
                      localStorage.removeItem('supabase_manual_key');
                      window.location.reload();
                    }}
                    className="block w-full text-[10px] text-red-400 hover:underline mt-2"
                  >
                    Reset & Clear Local Storage
                  </button>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleManualConfig} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Supabase URL</label>
                <input 
                  type="text" 
                  required
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full bg-supabase-sidebar border border-supabase-border rounded p-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Anon Key</label>
                <input 
                  type="password" 
                  required
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-supabase-sidebar border border-supabase-border rounded p-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowManualConfig(false)}
                  className="flex-1 bg-transparent border border-supabase-border text-supabase-text font-bold py-2 rounded uppercase tracking-widest hover:bg-supabase-sidebar transition-all"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-supabase-green text-supabase-bg font-bold py-2 rounded uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg shadow-supabase-green/20"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthProvider key={supabaseInstance.supabaseUrl}>
      <ClassProvider key={supabaseInstance.supabaseUrl}>
        <MainLayout 
          currentView={currentView}
          setCurrentView={setCurrentView}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      </ClassProvider>
    </AuthProvider>
  );
};

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
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
