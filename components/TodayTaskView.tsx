import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, MapPin, User, Loader2, Sparkles, Activity, Info, RefreshCw, ChevronRight } from 'lucide-react';
import { scheduleService } from '../services/scheduleService';
import { ClassSession } from '../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TodayTask extends ClassSession {
  className: string;
  isLive: boolean;
}

const TodayTaskView: React.FC = () => {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTodayTasks = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const todayDayName = DAYS[new Date().getDay()];
      const published = await scheduleService.getPublished();
      
      const now = new Date();
      const currentHHmm = now.getHours().toString().padStart(2, '0') + ':' + 
                         now.getMinutes().toString().padStart(2, '0');

      const aggregated: TodayTask[] = [];
      
      published.forEach(pub => {
        const content = pub.content;
        if (content && Array.isArray(content)) {
          content.forEach((session: any) => {
            if (session.day === todayDayName) {
              const startTime = session.startTime || "00:00";
              const endTime = session.endTime || "23:59";
              const isLive = currentHHmm >= startTime && currentHHmm <= endTime;
              
              aggregated.push({
                ...session,
                className: pub.class,
                isLive
              });
            }
          });
        }
      });

      aggregated.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setTasks(aggregated);
    } catch (error) {
      console.error("Failed to load today's tasks", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      fetchTodayTasks(false);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchTodayTasks]);

  useEffect(() => {
    fetchTodayTasks();
  }, [fetchTodayTasks]);

  // Group tasks by teacher
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TodayTask[]> = {};
    tasks.forEach(task => {
      const name = task.instructor || 'Unassigned';
      if (!groups[name]) groups[name] = [];
      groups[name].push(task);
    });
    return groups;
  }, [tasks]);

  const liveCount = tasks.filter(t => t.isLive).length;
  const todayDayName = DAYS[new Date().getDay()];

  return (
    <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500">
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-supabase-green/10 rounded-lg">
            <Activity className="text-supabase-green" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">Teacher's Daily Agenda</h1>
            <p className="text-[10px] text-supabase-muted font-mono">{todayDayName}, {currentTime.toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchTodayTasks()} 
              disabled={loading}
              className="p-2 text-supabase-muted hover:text-supabase-green transition-colors disabled:opacity-30"
              title="Refresh Pulse"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-supabase-sidebar border border-supabase-border rounded-md shadow-inner">
                <Clock size={14} className="text-supabase-green" />
                <span className="text-xs font-mono font-bold text-supabase-text tracking-tighter">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            {liveCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-md animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{liveCount} LIVE NOW</span>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-supabase-green" size={32} />
            <p className="text-xs font-mono text-supabase-muted tracking-widest uppercase">Fetching Global Pulse...</p>
          </div>
        ) : Object.keys(groupedTasks).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-supabase-muted space-y-6 opacity-60">
            <div className="w-20 h-20 bg-supabase-panel border border-supabase-border rounded-3xl flex items-center justify-center shadow-2xl">
                <Sparkles size={40} className="text-supabase-green/40" strokeWidth={1.5} />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-supabase-text tracking-tight">System Idle</h3>
                <p className="text-sm text-supabase-muted mt-1">No published classes detected for any faculty today.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-10 pb-20">
            {Object.entries(groupedTasks).map(([teacherName, teacherTasks]: [string, TodayTask[]]) => (
              <div key={teacherName} className="space-y-4">
                {/* Teacher Header */}
                <div className="flex items-center justify-between border-b border-supabase-border pb-3">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-supabase-panel border border-supabase-border overflow-hidden shadow-md">
                                {teacherTasks[0].instructorPhotoUrl ? (
                                    <img src={teacherTasks[0].instructorPhotoUrl} alt={teacherName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-supabase-muted font-bold text-lg bg-supabase-sidebar">
                                        {teacherName.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-supabase-bg ${teacherTasks[0].instructorStatus === 'active' ? 'bg-supabase-green' : 'bg-red-500'}`}></div>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-supabase-text uppercase tracking-tight">{teacherName}</h2>
                            <p className="text-[10px] text-supabase-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
                                {teacherTasks.length} {teacherTasks.length === 1 ? 'Assignment' : 'Assignments'} Scheduled
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tasks for this teacher */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherTasks.map(task => (
                    <div 
                      key={`${task.className}-${task.id}`}
                      className={`relative group bg-supabase-panel border rounded-xl p-5 transition-all duration-300 hover:shadow-xl ${
                        task.isLive 
                        ? 'border-supabase-green ring-1 ring-supabase-green/20 bg-supabase-green/[0.03]' 
                        : 'border-supabase-border hover:border-supabase-green/30'
                      }`}
                    >
                      {task.isLive && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-supabase-green text-black text-[8px] font-black uppercase tracking-widest rounded-bl-lg animate-pulse">
                          LIVE
                        </div>
                      )}
                      
                      <div className="flex flex-col h-full gap-4">
                        <div className="flex justify-between items-start">
                          <div className="px-2 py-0.5 bg-supabase-sidebar border border-supabase-border rounded text-[9px] font-black text-supabase-green uppercase tracking-tighter">
                            {task.className}
                          </div>
                          <div className="text-[9px] text-supabase-muted font-mono opacity-40">#ID-{task.id.slice(-4).toUpperCase()}</div>
                        </div>

                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-supabase-text leading-snug group-hover:text-supabase-green transition-colors line-clamp-2" title={task.title}>
                            {task.title}
                          </h4>
                        </div>

                        <div className="pt-3 border-t border-supabase-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-supabase-green opacity-70" />
                            <span className="text-xs font-mono font-bold text-supabase-text tracking-tighter">{task.startTime} — {task.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-supabase-muted opacity-40" />
                            <span className="text-xs text-supabase-muted font-medium uppercase tracking-tighter">RM {task.room || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="p-4 bg-supabase-panel border border-supabase-border border-dashed rounded-xl flex items-start gap-4 text-supabase-muted shadow-sm mt-10">
                <Info size={18} className="text-supabase-green shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-supabase-text uppercase tracking-wider">Teacher Aggregation Mode</p>
                    <p className="text-[11px] leading-relaxed opacity-80">
                        This view groups published sessions by faculty name to simplify daily scheduling oversight. 
                        Live status is automatically updated based on current server time.
                    </p>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayTaskView;