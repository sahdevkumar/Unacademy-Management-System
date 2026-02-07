import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, Loader2, Calendar, BookOpen, AlertCircle, Activity } from 'lucide-react';
import { scheduleService } from '../services/scheduleService';
import { ClassSession } from '../types';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AggregatedTask extends ClassSession {
  className: string;
}

const MyTaskView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AggregatedTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const published = await scheduleService.getPublished();
      const myName = user.name;
      
      const aggregated: AggregatedTask[] = [];
      published.forEach(pub => {
        if (Array.isArray(pub.content)) {
          pub.content.forEach(session => {
            if (session.instructor === myName) {
              aggregated.push({
                ...session,
                className: pub.class
              });
            }
          });
        }
      });

      aggregated.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTasks(aggregated);
    } catch (error) {
      console.error("Failed to load my tasks", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const getTasksForDay = (day: string) => {
    return tasks.filter(t => t.day === day);
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500">
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-supabase-green/10 rounded-lg">
            <BookOpen className="text-supabase-green" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">My Teaching Schedule</h1>
            <p className="text-[10px] text-supabase-muted font-mono">Personalized Workload Aggregation</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-supabase-green" size={32} />
            <p className="text-xs font-mono text-supabase-muted uppercase tracking-widest">Compiling My Data...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-supabase-muted space-y-4 opacity-60">
            <Activity size={48} strokeWidth={1} />
            <div className="text-center">
              <h3 className="text-lg font-bold text-supabase-text">No Tasks Assigned</h3>
              <p className="text-sm">You aren't listed as the instructor in any published schedules.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
            {DAYS.map(day => {
              const dayTasks = getTasksForDay(day);
              if (dayTasks.length === 0) return null;

              return (
                <div key={day} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-supabase-border pb-2">
                    <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest">{day}</h3>
                    <span className="text-[10px] bg-supabase-panel border border-supabase-border px-2 py-0.5 rounded-full font-bold">
                        {dayTasks.length} {dayTasks.length === 1 ? 'Class' : 'Classes'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {dayTasks.map(task => (
                      <div key={task.id} className="bg-supabase-panel border border-supabase-border rounded-xl p-5 hover:border-supabase-green/30 transition-all group shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <span className="px-2 py-0.5 bg-supabase-sidebar border border-supabase-border rounded text-[9px] font-black text-supabase-green uppercase tracking-tighter">
                            {task.className}
                          </span>
                          <span className="text-[10px] font-mono text-supabase-muted opacity-40">#{task.id.slice(-4)}</span>
                        </div>
                        
                        <h4 className="text-sm font-bold text-supabase-text group-hover:text-supabase-green transition-colors mb-4 leading-tight">
                            {task.title}
                        </h4>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-supabase-border/50">
                          <div className="flex items-center gap-2 text-xs">
                            <Clock size={14} className="text-supabase-green opacity-70" />
                            <span className="font-mono font-bold">{task.startTime} - {task.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <MapPin size={14} className="text-supabase-muted opacity-40" />
                            <span className="font-medium text-supabase-muted truncate">RM {task.room}</span>
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

      <div className="p-4 bg-supabase-panel border-t border-supabase-border flex items-center gap-3 text-supabase-muted shrink-0">
        <AlertCircle size={16} className="text-supabase-green" />
        <p className="text-[10px] font-medium uppercase tracking-wider">
            This schedule is synchronized in real-time with the administrative master list.
        </p>
      </div>
    </div>
  );
};

export default MyTaskView;