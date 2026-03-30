import React, { useEffect, useState, lazy, Suspense } from 'react';
import { MetricData, ClassSession, ClassInfo } from '../types';
import { Activity, Database, CheckCircle2, Clock, MapPin, User, Calendar, Cloud, Sparkles, Book, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scheduleService } from '../services/scheduleService';
import { supabase } from '../services/supabaseClient';
import DashboardReports from './DashboardReports';
import RecentActivity from './RecentActivity';
import UpcomingTests from './UpcomingTests';

// Lazy load non-critical dashboard components
// const Animated3D = lazy(() => import('./Animated3D'));

const DashboardView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState({ total: 0, present: 0, absent: 0, onLeave: 0 });
  const [studentStats, setStudentStats] = useState({ total: 0, present: 0, absent: 0, boys: 0, girls: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);

  useEffect(() => {
      fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
      setLoading(true);
      try {
          if (supabase) {
              // Fetch stats in parallel for better performance
              const [employeesResponse, studentsResponse, publishedSchedules] = await Promise.all([
                  supabase.from('employees').select('status'),
                  supabase.from('students').select('status, gender'),
                  scheduleService.getPublished()
              ]);

              const employees = employeesResponse.data;
              const students = studentsResponse.data;

              if (employees) {
                setEmployeeStats({
                  total: employees.length,
                  present: employees.filter(e => e.status === 'active').length,
                  absent: employees.filter(e => e.status === 'inactive').length,
                  onLeave: employees.filter(e => e.status === 'on_leave').length || 0
                });
              }

              if (students) {
                setStudentStats({
                  total: students.length,
                  present: students.filter(s => s.status === 'active').length,
                  absent: students.filter(s => s.status === 'inactive').length,
                  boys: students.filter(s => s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'boy').length,
                  girls: students.filter(s => s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'girl').length
                });
              }

              // Mock Activities if none in DB
              setActivities([
                { id: '1', type: 'attendance', title: 'Morning Attendance Completed', user: 'Admin', time: '10 mins ago', status: 'success' },
                { id: '2', type: 'registration', title: 'New Student Registered', user: 'Admission Office', time: '45 mins ago', status: 'info' },
                { id: '3', type: 'fee', title: 'Fee Collection Alert', user: 'Finance', time: '2 hours ago', status: 'warning' },
                { id: '4', type: 'task', title: 'Weekly Report Generated', user: 'System', time: '5 hours ago', status: 'success' },
              ]);

              // Mock Tests
              setTests([
                { id: '1', subject: 'Mathematics', class: 'Grade 10-A', date: 'APR 05', time: '09:00 AM', room: 'Room 101', type: 'midterm' },
                { id: '2', subject: 'Physics', class: 'Grade 11-B', date: 'APR 07', time: '11:30 AM', room: 'Lab 02', type: 'quiz' },
                { id: '3', subject: 'History', class: 'Grade 09-C', date: 'APR 12', time: '01:00 PM', room: 'Room 204', type: 'final' },
              ]);

              // Process Upcoming Classes
              const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();

              const todayClasses: any[] = [];
              publishedSchedules.forEach(p => {
                p.content.forEach((session: any) => {
                  if (session.day === today) {
                    const [hour, minute] = session.startTime.split(':').map(Number);
                    if (hour > currentHour || (hour === currentHour && minute > currentMinute)) {
                      todayClasses.push({
                        ...session,
                        className: p.class
                      });
                    }
                  }
                });
              });

              // Sort by start time
              todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
              setUpcomingClasses(todayClasses.slice(0, 4)); // Show top 4
          }
      } catch (e) {
          console.error("Dashboard load failed", e);
      } finally {
          setLoading(false);
      }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-supabase-muted gap-4 bg-supabase-bg">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-supabase-green"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-supabase-green animate-pulse" size={20} />
          </div>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm font-mono tracking-[0.3em] uppercase animate-pulse"
        >
          Initializing Intelligence...
        </motion.p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8"
    >
      {/* Header Section */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-20 h-20 bg-supabase-panel border border-supabase-border rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden group"
          >
            <div className="relative z-10 text-supabase-green font-black text-3xl">U</div>
          </motion.div>
          <div>
            <h1 className="text-3xl font-black text-supabase-text uppercase tracking-tighter flex items-center gap-3">
              Dashboard
              <span className="text-[10px] px-2 py-0.5 bg-supabase-green/10 text-supabase-green border border-supabase-green/20 rounded-full font-bold tracking-widest">v2.0 LIVE</span>
            </h1>
            <p className="text-xs text-supabase-muted mt-1 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={12} className="text-supabase-green" />
              Real-time Academic Intelligence & Management
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-supabase-panel border border-supabase-border rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-supabase-green animate-pulse"></div>
            <div className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">System Status: Optimal</div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={fetchDashboardData}
            className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green hover:border-supabase-green/30 transition-all"
          >
            <Sparkles size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Reports Section */}
      <DashboardReports employeeStats={employeeStats} studentStats={studentStats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Activity & Tests */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <RecentActivity activities={activities} />
            </motion.div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <UpcomingTests tests={tests} />
            </motion.div>
          </div>
        </div>

        {/* Right Column: Upcoming Classes */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-supabase-text uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-supabase-green" />
              Upcoming Classes
            </h2>
          </div>

          <div className="space-y-4">
            {upcomingClasses.length > 0 ? (
              upcomingClasses.map((cls, idx) => (
                <motion.div
                  key={cls.id || idx}
                  whileHover={{ x: 4 }}
                  className="bg-supabase-panel border border-supabase-border rounded-xl p-4 relative overflow-hidden group"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${cls.color?.split(' ')[0] || 'bg-supabase-green'}`}></div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-supabase-bg border border-supabase-border flex items-center justify-center text-supabase-green">
                        <Book size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-supabase-text truncate max-w-[120px]">{cls.title}</h4>
                        <p className="text-[10px] text-supabase-muted uppercase font-bold tracking-tighter">{cls.className}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-supabase-green bg-supabase-green/10 px-1.5 py-0.5 rounded border border-supabase-green/20">
                      {cls.startTime}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-supabase-muted font-bold uppercase tracking-tight">
                      <User size={12} className="text-supabase-green/60" />
                      <span className="truncate">{cls.instructor}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-supabase-muted font-bold uppercase tracking-tight">
                      <MapPin size={12} className="text-supabase-green/60" />
                      <span>{cls.room}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-supabase-border/50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full bg-supabase-bg border border-supabase-border flex items-center justify-center text-[8px] font-bold text-supabase-muted">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                      <div className="w-5 h-5 rounded-full bg-supabase-green/10 border border-supabase-green/20 flex items-center justify-center text-[8px] font-bold text-supabase-green">
                        +12
                      </div>
                    </div>
                    <button className="text-[9px] text-supabase-green font-black uppercase tracking-widest hover:underline">
                      Details
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-8 bg-supabase-panel/30 border border-dashed border-supabase-border rounded-xl flex flex-col items-center justify-center text-center">
                <Clock className="text-supabase-muted mb-2 opacity-20" size={32} />
                <p className="text-[10px] text-supabase-muted uppercase font-bold tracking-widest">No more classes</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Personnel Work Progress Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 pt-8 border-t border-supabase-border"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-supabase-text uppercase tracking-widest leading-none">Personnel Work Progress</h2>
              <p className="text-[10px] text-supabase-muted uppercase font-bold tracking-tighter mt-1">Real-time Task Distribution</p>
            </div>
          </div>
          <button className="text-[10px] font-black text-supabase-green uppercase tracking-widest hover:underline">
            View All Tasks
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Global Completion Rate</span>
              <span className="text-xs font-black text-supabase-green">84%</span>
            </div>
            <div className="w-full h-1.5 bg-supabase-sidebar rounded-full overflow-hidden mb-2">
              <div className="h-full bg-supabase-green shadow-[0_0_8px_#3ecf8e]" style={{ width: '84%' }}></div>
            </div>
            <p className="text-[9px] text-supabase-muted font-bold uppercase tracking-tighter italic">Aggregated from 24 active nodes</p>
          </div>

          <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Pending High Priority</span>
              <span className="text-xs font-black text-red-400">07</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-black text-supabase-text leading-none">07</div>
              <div className="text-[10px] text-supabase-muted font-bold uppercase tracking-tighter mb-0.5">Critical Items</div>
            </div>
            <p className="text-[9px] text-supabase-muted font-bold uppercase tracking-tighter italic mt-2">Requires immediate oversight</p>
          </div>

          <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Active Projects</span>
              <span className="text-xs font-black text-blue-400">12</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-black text-supabase-text leading-none">12</div>
              <div className="text-[10px] text-supabase-muted font-bold uppercase tracking-tighter mb-0.5">In Progress</div>
            </div>
            <p className="text-[9px] text-supabase-muted font-bold uppercase tracking-tighter italic mt-2">Across 4 departments</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardView;
