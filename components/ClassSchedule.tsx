import React, { useState, useEffect, useRef } from 'react';
import { Plus, Clock, User, X, Edit2, Trash2, Calendar, Loader2, Cloud, Save, AlertCircle, ChevronDown, Check, AlertTriangle, UserCircle, MapPin, School } from 'lucide-react';
import { ClassSession, Teacher } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useClass } from '../context/ClassContext';
import { useToast } from '../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = [
  'bg-blue-50 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  'bg-purple-50 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  'bg-green-50 dark:bg-green-500/20 text-green-900 dark:text-green-300 border-green-200 dark:border-green-500/30',
  'bg-orange-50 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
  'bg-pink-50 dark:bg-pink-500/20 text-pink-900 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
];

const DRAFT_PREFIX = 'supabase-schedule-draft-';

interface ExtendedClassSession extends ClassSession {
    show_profiles?: boolean;
}

const ClassSchedule: React.FC = () => {
  const { selectedClassId, setSelectedClassId, availableClasses, addClass, selectedClass, currentLevelFilter, setLevelFilter } = useClass();
  const [schedule, setSchedule] = useState<ExtendedClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);

  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePasscode, setDeletePasscode] = useState('');
  
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Partial<ExtendedClassSession>>({
    title: '',
    instructor: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    room: '',
    color: COLORS[0],
    show_profiles: true
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
            setIsClassMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadData();
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId && hasUnsavedChanges && !isLoading) {
        const draftKey = DRAFT_PREFIX + selectedClassId;
        localStorage.setItem(draftKey, JSON.stringify(schedule));
    }
  }, [schedule, hasUnsavedChanges, selectedClassId, isLoading]);

  useEffect(() => {
    const fetchDropdownData = async () => {
        const subs = await scheduleService.getSubjects();
        setAvailableSubjects(subs);
        const teachers = await scheduleService.getTeachers();
        setAvailableTeachers(teachers);
    };
    fetchDropdownData();
  }, []);

  const loadData = async () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    setHasUnsavedChanges(false);
    try {
      const remoteData = await scheduleService.getAll(selectedClassId);
      const initialSchedule = Array.isArray(remoteData) ? remoteData : [];
      setSchedule(initialSchedule);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      showToast("Failed to load schedule data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!selectedClassId) return;
    setIsSaving(true);
    try {
      await scheduleService.save(selectedClassId, schedule as ClassSession[]);
      localStorage.removeItem(DRAFT_PREFIX + selectedClassId);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      showToast("Schedule saved successfully", "success");
    } catch (error) {
      showToast("Failed to save to database", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModal = (session?: ExtendedClassSession) => {
    if (session) {
      setEditingId(session.id);
      setFormData({
          ...session,
          show_profiles: session.show_profiles === true
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        instructor: '',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: selectedClass?.room_no || '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        show_profiles: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSchedule(prevSchedule => {
      let updated;
      if (editingId) {
        updated = prevSchedule.map(item => 
          item.id === editingId ? { ...item, ...formData, room: selectedClass?.room_no || item.room } as ExtendedClassSession : item
        );
      } else {
        const newSession = {
          ...formData as ExtendedClassSession,
          room: selectedClass?.room_no || '',
          id: Date.now().toString()
        };
        updated = [...prevSchedule, newSession];
      }
      return updated;
    });
    setHasUnsavedChanges(true);
    setIsModalOpen(false);
  };

  const initiateDelete = (id: string) => {
      setDeleteTargetId(id);
      setDeletePasscode('');
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    if (deletePasscode !== '1234') {
        showToast("Incorrect passcode", 'error');
        return;
    }
    setSchedule(prev => prev.filter(item => item.id !== deleteTargetId));
    setHasUnsavedChanges(true);
    showToast("Class removed locally", "info");
    setIsDeleteModalOpen(false);
  };

  const handleCreateProject = () => {
    const name = prompt("Enter new class name:");
    const section = prompt("Enter section (e.g., A, B):") || 'A';
    const room = prompt("Enter room number:") || '0';
    const levelInput = prompt("Enter level (junior or senior):")?.toLowerCase();
    const level = (levelInput === 'senior') ? 'senior' : 'junior';

    if (name) {
      addClass(name, section, room, level);
      setIsClassMenuOpen(false);
      showToast(`Class '${name}' (${level}) created`, "success");
    }
  };

  const getClassesForDay = (day: string) => {
    if (!Array.isArray(schedule)) return [];
    return schedule
      .filter(s => s && s.day === day)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  const filteredTeachers = availableTeachers.filter(teacher => 
    formData.title && teacher.subjects && teacher.subjects.includes(formData.title)
  );

  return (
    <div className="h-full flex flex-col bg-supabase-bg text-supabase-text relative">
      <div className="h-14 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
                <Calendar className="text-supabase-green" size={20} />
                <h1 className="text-base font-medium hidden lg:block">Class Schedule</h1>
                <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setLevelFilter('junior')}
                      className={`px-2 py-0.5 rounded-l border border-supabase-border text-[10px] font-bold transition-all ${currentLevelFilter === 'junior' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-supabase-sidebar text-supabase-muted opacity-50'}`}
                    >
                        JUNIOR (6-10)
                    </button>
                    <button 
                      onClick={() => setLevelFilter('senior')}
                      className={`px-2 py-0.5 rounded-r border border-l-0 border-supabase-border text-[10px] font-bold transition-all ${currentLevelFilter === 'senior' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-supabase-sidebar text-supabase-muted opacity-50'}`}
                    >
                        SENIOR (11-13)
                    </button>
                    {currentLevelFilter !== 'all' && (
                        <button onClick={() => setLevelFilter('all')} className="p-1 text-supabase-muted hover:text-supabase-text"><X size={10} /></button>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-supabase-muted border-l border-supabase-border pl-4">
                {isSaving ? (
                     <div className="flex items-center gap-1.5 text-supabase-green">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="hidden sm:inline">Saving to DB...</span>
                    </div>
                ) : hasUnsavedChanges ? (
                    <div className="flex items-center gap-1.5 text-yellow-500 font-medium">
                        <AlertCircle size={12} />
                        <span className="hidden sm:inline">Unsaved changes (Draft)</span>
                        <span className="sm:hidden">Draft</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5" title={lastSaved ? `Last synced: ${lastSaved.toLocaleTimeString()}` : ''}>
                        <Cloud size={12} />
                        <span className="hidden sm:inline">{lastSaved ? 'All saved' : 'Synced'}</span>
                    </div>
                )}
            </div>

            <div className="relative border-l border-supabase-border pl-4" ref={classDropdownRef}>
                <button 
                    onClick={() => setIsClassMenuOpen(!isClassMenuOpen)}
                    className="flex flex-col items-start hover:bg-supabase-hover px-2 py-1 rounded transition-colors text-supabase-text group"
                >
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm max-w-[120px] sm:max-w-[200px] truncate">{selectedClassId || 'Select Class'}</span>
                        <ChevronDown size={14} className="text-supabase-muted group-hover:text-supabase-text" />
                    </div>
                    {selectedClass && (
                        <div className="flex items-center gap-2 text-[10px] text-supabase-muted -mt-0.5">
                            <span className={`px-1 rounded ${selectedClass.level === 'senior' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                {selectedClass.level?.toUpperCase()}
                            </span>
                            <span className="flex items-center gap-0.5"><MapPin size={10} /> {selectedClass.room_no}</span>
                        </div>
                    )}
                </button>
                
                {isClassMenuOpen && (
                    <div className="absolute top-full left-4 mt-1 w-64 bg-supabase-panel border border-supabase-border rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-xs font-semibold text-supabase-muted border-b border-supabase-border mb-1 uppercase tracking-wider flex justify-between">
                            Switch Class ({currentLevelFilter})
                        </div>
                        {availableClasses.length === 0 && (
                            <div className="px-3 py-4 text-xs text-supabase-muted italic">No classes in this level</div>
                        )}
                        {availableClasses.map(cls => (
                            <button 
                                key={cls.id}
                                onClick={() => { setSelectedClassId(cls.name); setIsClassMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover flex items-center justify-between transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{cls.name}</span>
                                    <span className="text-[10px] opacity-70">Sec: {cls.section} • Room: {cls.room_no}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-bold px-1 rounded ${cls.level === 'senior' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>{cls.level?.toUpperCase()}</span>
                                    {selectedClassId === cls.name && <Check size={14} className="text-supabase-green" />}
                                </div>
                            </button>
                        ))}
                        <div className="border-t border-supabase-border mt-1 pt-1">
                            <button 
                            onClick={handleCreateProject}
                            className="w-full text-left px-3 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover transition-colors flex items-center gap-2"
                            >
                                <Plus size={14} />
                                New Class Profile
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
            <button 
            onClick={handleManualSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border
                ${hasUnsavedChanges 
                    ? 'bg-supabase-text text-supabase-bg border-supabase-text hover:bg-opacity-90' 
                    : 'bg-transparent text-supabase-muted border-supabase-border opacity-50 cursor-not-allowed'
                }`}
            >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
            </button>
            
            <button 
            onClick={() => handleOpenModal()}
            className="bg-supabase-green text-black px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium hover:bg-supabase-greenHover transition-colors flex items-center gap-2"
            >
            <Plus size={16} fill="currentColor" />
            <span className="hidden sm:inline">Add Session</span>
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {!selectedClassId ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <School size={64} strokeWidth={1} className="mb-4" />
                <p className="text-sm font-medium">Select a class from the level-filtered list to start editing.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 pb-6">
            {DAYS.map(day => (
                <div key={day} className="flex flex-col gap-4 min-w-0">
                <div className="sticky top-0 z-0 pb-2 bg-supabase-bg border-b-2 border-supabase-border">
                    <h3 className="font-medium text-supabase-text uppercase tracking-wider text-xs flex justify-between items-center">
                        {day}
                        <span className="text-[10px] text-supabase-muted bg-supabase-panel px-1.5 py-0.5 rounded border border-supabase-border">{getClassesForDay(day).length}</span>
                    </h3>
                </div>
                
                <div className="flex flex-col gap-3">
                    {getClassesForDay(day).length === 0 && (
                        <div className="h-24 rounded-lg border border-dashed border-supabase-border flex items-center justify-center text-xs text-supabase-muted bg-supabase-panel/30">
                            No sessions
                        </div>
                    )}
                    {getClassesForDay(day).map(session => (
                    <div 
                        key={session.id} 
                        className={`group relative p-4 rounded-lg border transition-all hover:shadow-lg ${session.color} border-opacity-50 hover:bg-opacity-80`}
                    >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(session); }}
                            className="p-1 hover:bg-black/20 rounded"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); initiateDelete(session.id); }}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                        >
                            <Trash2 size={12} />
                        </button>
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-sm leading-tight truncate pr-6">{session.title}</div>
                                {session.show_profiles === true && (
                                    <UserCircle size={14} className="text-emerald-400 shrink-0" />
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs opacity-80 mt-1">
                                <User size={12} />
                                <span>{session.instructor}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs opacity-80">
                                <Clock size={12} />
                                <span>{session.startTime} - {session.endTime}</span>
                            </div>
                            {(session.room || selectedClass?.room_no) && (
                                <div className="flex items-center gap-1.5 text-[10px] opacity-70 mt-1 italic">
                                    <MapPin size={10} />
                                    <span>Room {session.room || selectedClass?.room_no}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-supabase-border bg-supabase-sidebar">
              <h2 className="text-sm font-semibold text-supabase-text">
                {editingId ? 'Edit Session' : 'Add New Session'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-supabase-muted">Day of Week</label>
                <select 
                  value={formData.day}
                  onChange={e => setFormData({...formData, day: e.target.value})}
                  className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                >
                  {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-supabase-muted">Subject</label>
                <select 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value, instructor: ''})}
                    className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                >
                    <option value="" disabled>Select a subject</option>
                    {availableSubjects.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                    ))}
                </select>
              </div>

               <div className="space-y-1.5">
                    <label className="text-xs font-medium text-supabase-muted">Teacher</label>
                    <select 
                        required
                        value={formData.instructor}
                        onChange={e => setFormData({...formData, instructor: e.target.value})}
                        disabled={!formData.title}
                        className={`w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green 
                            ${!formData.title ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <option value="" disabled>
                            {!formData.title ? 'Select a subject first' : 'Select a teacher'}
                        </option>
                        {filteredTeachers.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-supabase-muted">Start Time</label>
                  <input 
                    type="time" 
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-supabase-muted">End Time</label>
                  <input 
                    type="time" 
                    required
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                  />
                </div>
              </div>

              <div className="pt-2">
                   <button 
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, show_profiles: !prev.show_profiles}))}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        formData.show_profiles 
                            ? 'bg-supabase-green/5 border-supabase-green/30 text-supabase-green' 
                            : 'bg-supabase-sidebar border-supabase-border text-supabase-muted'
                    }`}
                   >
                       <div className="flex items-center gap-3">
                           <UserCircle size={18} />
                           <span className="text-xs font-medium">Show Profile Picture</span>
                       </div>
                       <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.show_profiles ? 'bg-supabase-green' : 'bg-supabase-muted'}`}>
                           <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${formData.show_profiles ? 'left-4.5' : 'left-0.5'}`} style={{ left: formData.show_profiles ? '1.125rem' : '0.125rem' }}></div>
                       </div>
                   </button>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-supabase-green text-black px-4 py-2 rounded text-sm font-medium hover:bg-supabase-greenHover transition-colors flex items-center gap-2"
                >
                  {editingId ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-supabase-border flex justify-between items-center bg-supabase-sidebar">
                       <div className="flex items-center gap-2 text-red-500">
                           <AlertTriangle size={18} />
                           <h3 className="text-sm font-semibold text-supabase-text">Security Check</h3>
                       </div>
                       <button onClick={() => setIsDeleteModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                           <X size={18} />
                       </button>
                   </div>
                   <div className="p-6">
                       <p className="text-sm text-supabase-muted mb-4">
                           Enter the admin passcode to remove this session.
                       </p>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-supabase-muted">Admin Passcode</label>
                           <input 
                               type="password" 
                               autoFocus
                               value={deletePasscode}
                               onChange={(e) => setDeletePasscode(e.target.value)}
                               className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                               placeholder="1234"
                               onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                           />
                       </div>
                       <div className="mt-6 flex justify-end gap-3">
                           <button 
                               onClick={() => setIsDeleteModalOpen(false)}
                               className="px-4 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded transition-colors"
                           >
                               Cancel
                           </button>
                           <button 
                               onClick={confirmDelete}
                               className="bg-red-500/10 text-red-500 border border-red-500/50 px-4 py-2 rounded text-sm font-medium hover:bg-red-500/20 transition-colors"
                           >
                               Remove Session
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default ClassSchedule;