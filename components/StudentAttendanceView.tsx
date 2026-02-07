
import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Filter, Check, X, Clock, Calendar, User, Users, Save, Loader2, Database } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { ClassInfo } from '../types';

interface StudentRecord {
  id: string;
  full_name: string;
  roll_number: string;
  status: 'present' | 'absent' | 'late' | 'none';
  last_updated?: string;
}

const StudentAttendanceView: React.FC = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const data = await scheduleService.getClasses();
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].name);
      setIsLoading(false);
    };
    fetchClasses();
  }, []);

  const fetchAttendanceData = async () => {
    if (!selectedClass || !supabase) return;
    setIsLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Fetch Students from the 'students' table filtered by class_name
      const { data: studentList, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, roll_number')
        .eq('class_name', selectedClass);

      if (studentError) throw studentError;

      // 2. Fetch today's logs
      const { data: logs, error: logError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('class_name', selectedClass)
        .eq('date', today);

      if (logError) throw logError;

      // 3. Map students to their attendance status
      const mapped = (studentList || []).map(s => {
        const log = logs?.find(l => l.student_id === s.id);
        return {
          id: s.id,
          full_name: s.full_name,
          roll_number: s.roll_number,
          status: (log?.status || 'none') as StudentRecord['status'],
          last_updated: log?.updated_at ? new Date(log.updated_at).toLocaleTimeString() : undefined
        };
      });

      setStudents(mapped);
    } catch (e: any) {
      showToast("Database Sync Failed: " + e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedClass]);

  const updateStatusLocally = (id: string, status: StudentRecord['status']) => {
    setStudents(prev => prev.map(s => 
      s.id === id ? { ...s, status } : s
    ));
  };

  const handleBulkPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' as const })));
    showToast("Bulk selection applied locally.", "info");
  };

  const handleSave = async () => {
    if (!supabase) return;
    setIsSaving(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = students
        .filter(s => s.status !== 'none')
        .map(s => ({
          student_id: s.id,
          student_name: s.full_name,
          class_name: selectedClass,
          status: s.status,
          date: today,
          updated_at: new Date().toISOString()
        }));

      const { error } = await supabase
        .from('attendance_logs')
        .upsert(payload, { onConflict: 'student_id, date' });

      if (error) throw error;
      
      showToast(`Attendance synchronized for ${selectedClass}`, "success");
      fetchAttendanceData();
    } catch (e: any) {
      showToast("Persistence Error: " + e.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: students.length,
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    percent: students.length ? Math.round((students.filter(s => s.status === 'present').length / students.length) * 100) : 0
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500">
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-supabase-green/10 rounded-lg">
            <UserCheck className="text-supabase-green" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">Student Attendance</h1>
            <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-tighter flex items-center gap-1.5">
               <Database size={10} /> DB: students_matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" />
            <input 
              type="text" 
              placeholder="Find by name or roll..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-48 transition-all"
            />
          </div>
          <button 
            onClick={handleBulkPresent}
            className="px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[10px] font-black uppercase text-supabase-muted hover:text-supabase-green transition-all flex items-center gap-2"
          >
            Mark All Present
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || students.length === 0}
            className="bg-supabase-green text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all shadow-lg flex items-center gap-2 disabled:opacity-30"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Commit Attendance
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-supabase-panel p-4 rounded-xl border border-supabase-border">
             <div className="flex items-center gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">Selected Unit</p>
                    <select 
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none min-w-[150px]"
                    >
                      {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div className="h-8 w-px bg-supabase-border hidden md:block"></div>
                <div className="flex items-center gap-2 text-supabase-muted">
                    <Calendar size={14} />
                    <span className="text-xs font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
             </div>

             <div className="flex items-center gap-6">
                <div className="text-center">
                    <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Present</p>
                    <p className="text-lg font-black text-supabase-green">{stats.present}</p>
                </div>
                <div className="text-center">
                    <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Absent</p>
                    <p className="text-lg font-black text-red-400">{stats.absent}</p>
                </div>
                <div className="text-center">
                    <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Rate</p>
                    <p className="text-lg font-black text-supabase-text">{stats.percent}%</p>
                </div>
             </div>
          </div>

          <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-supabase-sidebar/50 text-[10px] uppercase font-black text-supabase-muted tracking-[0.2em] border-b border-supabase-border">
                  <th className="px-6 py-5">Roll No</th>
                  <th className="px-6 py-5">Student Identity</th>
                  <th className="px-6 py-5 text-center">Protocol Status</th>
                  <th className="px-6 py-5 text-right">Last Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-supabase-border/50">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-20 text-center text-xs text-supabase-muted font-mono tracking-widest animate-pulse">QUERYING STUDENTS...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-20 text-center text-xs text-supabase-muted italic uppercase tracking-widest">No matching student profiles found</td></tr>
                ) : filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-supabase-hover/20 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-supabase-muted">{student.roll_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-colors font-bold">
                          {student.full_name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-supabase-text uppercase tracking-tight">{student.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => updateStatusLocally(student.id, 'present')}
                          className={`p-2 rounded-lg border transition-all ${student.status === 'present' ? 'bg-supabase-green text-black border-supabase-green shadow-[0_0_12px_rgba(62,207,142,0.3)]' : 'bg-supabase-sidebar border-supabase-border text-supabase-muted hover:border-supabase-green'}`}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button 
                          onClick={() => updateStatusLocally(student.id, 'late')}
                          className={`p-2 rounded-lg border transition-all ${student.status === 'late' ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.3)]' : 'bg-supabase-sidebar border-supabase-border text-supabase-muted hover:border-yellow-500'}`}
                        >
                          <Clock size={16} strokeWidth={3} />
                        </button>
                        <button 
                          onClick={() => updateStatusLocally(student.id, 'absent')}
                          className={`p-2 rounded-lg border transition-all ${student.status === 'absent' ? 'bg-red-500 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'bg-supabase-sidebar border-supabase-border text-supabase-muted hover:border-red-500'}`}
                        >
                          <X size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[10px] font-mono text-supabase-muted italic">{student.last_updated || 'Awaiting Sync'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceView;
