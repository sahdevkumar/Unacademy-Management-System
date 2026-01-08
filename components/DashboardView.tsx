import React, { useEffect, useState } from 'react';
import { MetricData, ClassSession } from '../types';
import { Activity, Database, Server, CheckCircle2, Clock, MapPin, User, Calendar, Cloud, MonitorPlay } from 'lucide-react';
import { scheduleService } from '../services/scheduleService';
import { supabase } from '../services/supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Color themes for empty state cards
const EMPTY_THEMES = [
    { wrapper: 'border-blue-500/30 bg-blue-500/5', overlay: 'bg-blue-500/5', text: 'text-blue-400/60' },
    { wrapper: 'border-purple-500/30 bg-purple-500/5', overlay: 'bg-purple-500/5', text: 'text-purple-400/60' },
    { wrapper: 'border-emerald-500/30 bg-emerald-500/5', overlay: 'bg-emerald-500/5', text: 'text-emerald-400/60' },
    { wrapper: 'border-amber-500/30 bg-amber-500/5', overlay: 'bg-amber-500/5', text: 'text-amber-400/60' },
    { wrapper: 'border-pink-500/30 bg-pink-500/5', overlay: 'bg-pink-500/5', text: 'text-pink-400/60' },
    { wrapper: 'border-cyan-500/30 bg-cyan-500/5', overlay: 'bg-cyan-500/5', text: 'text-cyan-400/60' },
];

interface PublishedSchedule {
    id: string;
    class: string;
    content: ClassSession[];
    updated_at: string;
}

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bg-supabase-panel border border-supabase-border rounded-md p-5 flex flex-col ${className}`}>
    <h3 className="text-sm font-medium text-supabase-muted mb-4 uppercase tracking-wider">{title}</h3>
    {children}
  </div>
);

const Stat: React.FC<{ label: string; value: string; icon: React.ReactNode; sub?: string }> = ({ label, value, icon, sub }) => (
  <div className="flex items-start justify-between">
    <div>
      <div className="text-2xl font-medium text-supabase-text mb-1">{value}</div>
      <div className="text-sm text-supabase-muted">{label}</div>
      {sub && <div className="text-xs text-supabase-green mt-1">{sub}</div>}
    </div>
    <div className="text-supabase-muted bg-supabase-bg p-2 rounded-md border border-supabase-border">
      {icon}
    </div>
  </div>
);

const DashboardView: React.FC = () => {
  const [publishedSchedules, setPublishedSchedules] = useState<PublishedSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats State
  const [stats, setStats] = useState({
      active: 0,
      drafts: 0,
      total: 0
  });

  useEffect(() => {
      fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
      setLoading(true);
      
      // 1. Fetch Published Schedules
      const published = await scheduleService.getPublished();
      setPublishedSchedules(published);
      if (published.length > 0) {
          setSelectedScheduleId(published[0].id);
      }

      // 2. Fetch Stats (if connected)
      if (supabase) {
          const { count: activeCount } = await supabase.from('weekly_schedules').select('*', { count: 'exact', head: true }).eq('status', 'true');
          const { count: draftCount } = await supabase.from('weekly_schedules').select('*', { count: 'exact', head: true }).eq('status', 'false');
          const { count: totalCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
          
          setStats({
              active: activeCount || 0,
              drafts: draftCount || 0,
              total: totalCount || 0
          });
      }

      setLoading(false);
  };

  const getClassesForDay = (schedule: ClassSession[], day: string) => {
    return schedule
      .filter(s => s.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const currentSchedule = publishedSchedules.find(s => s.id === selectedScheduleId);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-supabase-text">Dashboard</h1>
          <p className="text-supabase-muted mt-1">System Overview & Active Schedules</p>
        </div>
        <div className="flex gap-3">
             <span className="flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-900">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                Live System
             </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Active Schedules">
           <Stat 
             label="Published & Live" 
             value={stats.active.toString()} 
             icon={<MonitorPlay size={20} />} 
             sub="Visible to students"
           />
        </Card>
        <Card title="Draft Workspaces">
           <Stat 
             label="In Progress" 
             value={stats.drafts.toString()} 
             icon={<Activity size={20} />}
             sub="Pending publication" 
           />
        </Card>
        <Card title="Total Projects">
           <Stat 
             label="All Classes" 
             value={stats.total.toString()} 
             icon={<Database size={20} />}
             sub="Registered classes" 
           />
        </Card>
      </div>

      {/* Main Content Area: Published Schedule View */}
      <div className="flex-1 min-h-0 flex flex-col bg-supabase-panel border border-supabase-border rounded-md overflow-hidden">
          {/* Header / Tabs */}
          <div className="px-6 py-4 border-b border-supabase-border flex flex-col sm:flex-row items-center justify-between bg-supabase-sidebar gap-4">
              <div className="flex items-center gap-2 self-start sm:self-auto">
                   <Calendar className="text-supabase-green" size={20} />
                   <h2 className="text-sm font-semibold text-supabase-text uppercase tracking-wide">Live Schedule View</h2>
              </div>
              
              {/* Schedule Selector Tabs */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {publishedSchedules.length === 0 && !loading && (
                      <span className="text-xs text-supabase-muted italic">No active schedules found</span>
                  )}
                  {publishedSchedules.map(sch => (
                      <button
                        key={sch.id}
                        onClick={() => setSelectedScheduleId(sch.id)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                            selectedScheduleId === sch.id 
                            ? 'bg-supabase-green/10 text-supabase-green border-supabase-green/30' 
                            : 'text-supabase-muted border-transparent hover:bg-supabase-hover hover:text-supabase-text'
                        }`}
                      >
                          {sch.class}
                      </button>
                  ))}
              </div>
          </div>

          {/* Schedule Grid Content */}
          <div className="flex-1 overflow-auto p-4 md:p-6 bg-supabase-bg">
              {loading ? (
                   <div className="h-full flex flex-col items-center justify-center text-supabase-muted gap-3">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-supabase-green"></div>
                       <p className="text-sm">Loading live data...</p>
                   </div>
              ) : !currentSchedule ? (
                   <div className="h-full flex flex-col items-center justify-center text-supabase-muted gap-4 opacity-60">
                       <Cloud size={48} strokeWidth={1} />
                       <div className="text-center">
                           <p className="text-lg font-medium text-supabase-text">No Published Schedules</p>
                           <p className="text-sm mt-1">Publish a schedule from the Table Editor to see it here.</p>
                       </div>
                   </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {DAYS.map((day, index) => {
                        const classes = getClassesForDay(currentSchedule.content, day);
                        const theme = EMPTY_THEMES[index % EMPTY_THEMES.length];
                        
                        return (
                            <div key={day} className="flex flex-col gap-3 min-w-0">
                                <div className="sticky top-0 z-10 pb-2 bg-supabase-bg border-b border-supabase-border/50">
                                    <h3 className="font-medium text-supabase-text uppercase tracking-wider text-xs flex justify-between items-center opacity-80">
                                        {day}
                                        <span className="text-[10px] text-supabase-muted bg-supabase-panel border border-supabase-border px-1.5 py-0.5 rounded-full">{classes.length}</span>
                                    </h3>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                    {classes.length === 0 && (
                                        <div className={`h-24 rounded-lg border border-dashed ${theme.wrapper} flex items-center justify-center group overflow-hidden relative`}>
                                            <div className={`absolute inset-0 ${theme.overlay} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                            <span className={`text-lg font-bold ${theme.text} tracking-wide select-none animate-pulse`}>
                                                Comming Soon..
                                            </span>
                                        </div>
                                    )}
                                    {classes.map(session => (
                                        <div 
                                            key={session.id} 
                                            className={`p-3 rounded-lg border ${session.color} border-opacity-40 bg-opacity-5 bg-supabase-panel hover:bg-opacity-10 transition-colors`}
                                        >
                                            <div className="flex flex-col gap-1.5">
                                                <div className="font-medium text-sm leading-tight text-supabase-text">{session.title}</div>
                                                <div className="flex items-center gap-2 text-xs opacity-70">
                                                    <Clock size={12} />
                                                    <span>{session.startTime} - {session.endTime}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs opacity-70 pt-1 border-t border-current border-opacity-20 mt-1">
                                                     <div className="flex items-center gap-1.5">
                                                        <MapPin size={12} />
                                                        <span>{session.room}</span>
                                                     </div>
                                                     <div className="flex items-center gap-1.5">
                                                        <User size={12} />
                                                        <span className="truncate max-w-[80px]">{session.instructor}</span>
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
              )}
          </div>
          
          {/* Footer Metadata */}
          {currentSchedule && (
              <div className="bg-supabase-sidebar border-t border-supabase-border px-6 py-2 text-xs text-supabase-muted flex justify-between">
                  <div>ID: <span className="font-mono">{currentSchedule.id}</span></div>
                  <div>Last Updated: {new Date(currentSchedule.updated_at).toLocaleString()}</div>
              </div>
          )}
      </div>
    </div>
  );
};

export default DashboardView;