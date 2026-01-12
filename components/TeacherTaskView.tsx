import React, { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Clock, Search, Loader2, BookOpen } from 'lucide-react';
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

  useEffect(() => {
    const loadTeachers = async () => {
      setLoading(true);
      const data = await scheduleService.getTeachers();
      setTeachers(data);
      setLoading(false);
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

      setLoading(true);
      try {
        const publishedSchedules = await scheduleService.getPublished();
        const aggregated: AggregatedTask[] = [];

        publishedSchedules.forEach(pub => {
          pub.content.forEach(session => {
            if (session.instructor === selectedTeacher.name) {
              aggregated.push({
                ...session,
                className: pub.class
              });
            }
          });
        });

        setTeacherSchedule(aggregated);
      } catch (error) {
        console.error("Failed to aggregate teacher schedule", error);
      } finally {
        setLoading(false);
      }
    };

    aggregateSchedule();
  }, [selectedTeacherId, teachers]);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTasksForDay = (day: string) => {
    return teacherSchedule
      .filter(t => t.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="h-full flex flex-col bg-supabase-bg">
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="text-supabase-green" size={24} />
          <div>
            <h1 className="text-lg font-medium text-supabase-text leading-none">Teacher Tasks</h1>
            <p className="text-xs text-supabase-muted mt-1">Aggregated schedules & assignments</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Teacher Sidebar */}
        <div className="w-72 border-r border-supabase-border bg-supabase-sidebar flex flex-col">
          <div className="p-4 border-b border-supabase-border">
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
              <input 
                type="text" 
                placeholder="Search teachers..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-supabase-bg border border-supabase-border rounded-md pl-9 pr-3 py-1.5 text-xs text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTeachers.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeacherId(t.id)}
                className={`w-full text-left p-4 border-b border-supabase-border/30 transition-colors flex items-center gap-3 ${selectedTeacherId === t.id ? 'bg-supabase-green/5' : 'hover:bg-supabase-hover'}`}
              >
                <div className="w-8 h-8 rounded-full bg-supabase-bg border border-supabase-border flex items-center justify-center overflow-hidden shrink-0">
                  {t.profile_photo_url ? (
                    <img src={t.profile_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={14} className="text-supabase-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${selectedTeacherId === t.id ? 'text-supabase-green' : 'text-supabase-text'}`}>{t.name}</div>
                  <div className="text-[10px] text-supabase-muted truncate uppercase tracking-tighter">{t.subjects?.join(', ')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Display */}
        <div className="flex-1 overflow-y-auto p-6 bg-supabase-bg">
          {!selectedTeacherId ? (
            <div className="h-full flex flex-col items-center justify-center text-supabase-muted opacity-40">
              <Calendar size={64} strokeWidth={1} className="mb-4" />
              <p className="text-sm font-medium">Select a teacher to view their assigned tasks</p>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-supabase-green" size={32} />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-supabase-border bg-supabase-panel flex items-center justify-center overflow-hidden">
                   {selectedTeacher?.profile_photo_url ? (
                     <img src={selectedTeacher.profile_photo_url} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <User size={32} className="text-supabase-muted" />
                   )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-supabase-text">{selectedTeacher?.name}</h2>
                  <div className="flex items-center gap-2 text-supabase-muted text-sm">
                    <span className="text-supabase-green">Verified Faculty</span>
                    <span>•</span>
                    <span>{teacherSchedule.length} Assigned Sessions</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {DAYS.map(day => {
                  const tasks = getTasksForDay(day);
                  return (
                    <div key={day} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-supabase-border pb-2 mb-1">
                        <span className="text-xs font-bold text-supabase-muted uppercase tracking-widest">{day}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-supabase-panel border border-supabase-border text-supabase-muted font-mono">
                          {tasks.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {tasks.length === 0 && (
                          <div className="h-20 rounded-lg border border-dashed border-supabase-border flex items-center justify-center text-[10px] text-supabase-muted italic uppercase tracking-widest">
                            No assignments
                          </div>
                        )}
                        {tasks.map(task => (
                          <div key={task.id} className="bg-supabase-panel border border-supabase-border rounded-xl p-4 shadow-sm hover:border-supabase-green/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-sm text-supabase-text">{task.title}</h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-supabase-green/10 text-supabase-green border border-supabase-green/20">
                                {task.className}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                <Clock size={12} className="text-supabase-green" />
                                <span>{task.startTime} - {task.endTime}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                <MapPin size={12} />
                                <span>Room: {task.room}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherTaskView;