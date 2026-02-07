import React, { useState, useEffect, useMemo } from 'react';
import { User, Calendar, MapPin, Clock, Search, Loader2, BookOpen, AlertCircle, ShieldCheck } from 'lucide-react';
import { Teacher, ClassSession } from '../types';
import { scheduleService } from '../services/scheduleService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AggregatedTask extends ClassSession {
  className: string;
}

const TeacherTaskView: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherSchedule, setTeacherSchedule] = useState<AggregatedTask[]>([]);
  const [isAggregating, setIsAggregating] = useState(false);

  useEffect(() => {
    const loadTeachers = async () => {
      setLoading(true);
      const data = await scheduleService.getTeachers();
      setTeachers(data);
      setLoading(false);
      
      // Auto-select first teacher if available
      if (data.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(data[0].id);
      }
    };
    loadTeachers();
  }, []);

  useEffect(() => {
    const aggregateSchedule = async () => {
      if (!selectedTeacherId) {
        setTeacherSchedule([]);
        return;
      }

      const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
      if (!selectedTeacher) return;

      setIsAggregating(true);
      try {
        const publishedSchedules = await scheduleService.getPublished();
        const aggregated: AggregatedTask[] = [];

        publishedSchedules.forEach(pub => {
          if (Array.isArray(pub.content)) {
            pub.content.forEach(session => {
              if (session.instructor === selectedTeacher.name) {
                aggregated.push({
                  ...session,
                  className: pub.class
                });
              }
            });
          }
        });

        setTeacherSchedule(aggregated);
      } catch (error) {
        console.error("Failed to aggregate teacher schedule", error);
      } finally {
        setIsAggregating(false);
      }
    };

    aggregateSchedule();
  }, [selectedTeacherId, teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subjects?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [teachers, searchTerm]);

  const getTasksForDay = (day: string) => {
    return teacherSchedule
      .filter(t => t.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="h-full flex flex-col bg-supabase-bg">
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-supabase-green/10 rounded-lg">
            <BookOpen className="text-supabase-green" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">Faculty Task Console</h1>
            <p className="text-[10px] text-supabase-muted font-mono">Cross-module workload aggregation</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Teacher Sidebar */}
        <div className="w-80 border-r border-supabase-border bg-supabase-sidebar flex flex-col shrink-0 shadow-xl">
          <div className="p-4 border-b border-supabase-border bg-supabase-sidebar/50 sticky top-0 z-10">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" />
              <input 
                type="text" 
                placeholder="Search faculty or subjects..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-supabase-bg border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green transition-all placeholder-supabase-muted/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-supabase-muted animate-pulse font-mono text-xs uppercase tracking-widest">
                Loading Directory...
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-8 text-center text-supabase-muted italic text-xs">
                No faculty found matching your search.
              </div>
            ) : (
              filteredTeachers.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeacherId(t.id)}
                  className={`w-full text-left p-4 border-b border-supabase-border/20 transition-all flex items-center gap-4 group ${selectedTeacherId === t.id ? 'bg-supabase-green/5 border-r-2 border-r-supabase-green' : 'hover:bg-supabase-hover'}`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-supabase-bg border flex items-center justify-center overflow-hidden shrink-0 transition-all shadow-md ${selectedTeacherId === t.id ? 'border-supabase-green scale-110' : 'border-supabase-border'}`}>
                    {t.profile_photo_url ? (
                      <img src={t.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-sm font-bold text-supabase-muted">{t.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold truncate transition-colors ${selectedTeacherId === t.id ? 'text-supabase-green' : 'text-supabase-text'}`}>{t.name}</div>
                    <div className="text-[10px] text-supabase-muted truncate font-mono uppercase tracking-tighter mt-0.5 opacity-60">
                        {t.subjects?.join(' • ')}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Schedule Display */}
        <div className="flex-1 overflow-y-auto bg-supabase-bg relative">
          {!selectedTeacherId ? (
            <div className="h-full flex flex-col items-center justify-center text-supabase-muted opacity-40 p-8 text-center">
              <Calendar size={80} strokeWidth={1} className="mb-6 text-supabase-green/20" />
              <h2 className="text-xl font-black text-supabase-text uppercase tracking-widest mb-2">Assignment Overview</h2>
              <p className="text-xs font-medium max-w-xs">Select a faculty member from the directory to inspect their active published workload.</p>
            </div>
          ) : isAggregating ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-supabase-green" size={40} />
              <p className="text-xs font-mono text-supabase-muted uppercase tracking-[0.3em]">Querying Active Schedules...</p>
            </div>
          ) : (
            <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center gap-6 bg-supabase-panel p-6 rounded-2xl border border-supabase-border shadow-xl ring-1 ring-white/5">
                <div className="w-24 h-24 rounded-2xl border-2 border-supabase-green shadow-[0_0_20px_rgba(62,207,142,0.1)] flex items-center justify-center overflow-hidden shrink-0 bg-supabase-bg">
                   {selectedTeacher?.profile_photo_url ? (
                     <img src={selectedTeacher.profile_photo_url} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <User size={48} className="text-supabase-muted opacity-30" />
                   )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-black text-supabase-text tracking-tight uppercase">{selectedTeacher?.name}</h2>
                    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-supabase-green/10 text-supabase-green border border-supabase-green/20 uppercase tracking-widest">
                        <ShieldCheck size={12} />
                        Verified Active
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-supabase-muted text-xs font-mono">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-supabase-green"></div>{teacherSchedule.length} Active Sessions</div>
                    <div className="opacity-40">|</div>
                    <div>Expertise: {selectedTeacher?.subjects?.join(', ')}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {DAYS.map(day => {
                  const tasks = getTasksForDay(day);
                  return (
                    <div key={day} className="flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-supabase-border pb-3 mb-1">
                        <span className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em]">{day}</span>
                        <div className="text-[10px] px-2 py-1 rounded-full bg-supabase-sidebar border border-supabase-border text-supabase-green font-bold shadow-sm">
                          {tasks.length} {tasks.length === 1 ? 'TASK' : 'TASKS'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-4">
                        {tasks.length === 0 && (
                          <div className="h-24 rounded-2xl border-2 border-dashed border-supabase-border/50 flex flex-col items-center justify-center p-4 bg-supabase-panel/10 group hover:border-supabase-green/20 transition-colors">
                            <span className="text-[10px] text-supabase-muted font-black tracking-widest opacity-40 uppercase">No Assignments</span>
                          </div>
                        )}
                        {tasks.map(task => (
                          <div key={task.id} className="bg-supabase-panel border border-supabase-border rounded-2xl p-5 shadow-lg hover:border-supabase-green/40 hover:shadow-supabase-green/5 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-1">
                                <div className="text-[8px] font-black text-supabase-muted font-mono opacity-20 uppercase tracking-tighter">REF_{task.id.slice(-4)}</div>
                            </div>
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="font-black text-sm text-supabase-text uppercase tracking-tight leading-tight group-hover:text-supabase-green transition-colors">{task.title}</h4>
                              <span className="text-[9px] font-black px-2 py-1 rounded bg-supabase-sidebar text-supabase-muted border border-supabase-border uppercase tracking-widest group-hover:text-supabase-text group-hover:border-supabase-muted transition-colors">
                                {task.className}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-supabase-text">
                                <Clock size={14} className="text-supabase-green/60" />
                                <span className="font-mono">{task.startTime} - {task.endTime}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-supabase-muted">
                                <MapPin size={14} className="opacity-40" />
                                <span className="truncate">RM {task.room}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-5 bg-supabase-sidebar/50 border border-supabase-border border-dashed rounded-2xl flex items-start gap-4 text-supabase-muted">
                <AlertCircle size={20} className="text-supabase-green mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-supabase-text uppercase tracking-widest">Workspace Insight</p>
                    <p className="text-xs leading-relaxed opacity-70 italic font-medium">
                        Workloads are automatically synchronized with the global class directory. If a teacher is reassigned in the <strong>Teachers List</strong>, their aggregated task board will update within seconds.
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherTaskView;