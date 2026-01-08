import React, { useState, useEffect, useRef } from 'react';
import { Plus, Clock, MapPin, User, X, Edit2, Trash2, Calendar, Loader2, Cloud, Save, AlertCircle, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { ClassSession, Teacher } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useClass } from '../context/ClassContext';
import { useToast } from '../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
];

const DRAFT_PREFIX = 'supabase-schedule-draft-';

const ClassSchedule: React.FC = () => {
  const { selectedClassId, setSelectedClassId, availableClasses, addClass } = useClass();
  const [schedule, setSchedule] = useState<ClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Lists State (Fetched from DB)
  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);

  // Dropdown State
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePasscode, setDeletePasscode] = useState('');
  
  // Toast
  const { showToast } = useToast();

  // Form State
  const [formData, setFormData] = useState<Partial<ClassSession>>({
    title: '',
    instructor: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    room: '',
    color: COLORS[0]
  });

  // Handle click outside for dropdown
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

  // Fetch initial data whenever selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      // Clear state immediately to avoid cross-project contamination before loading
      setHasUnsavedChanges(false);
      setSchedule([]); 
      loadData();
    }
  }, [selectedClassId]);

  // Save draft to localStorage whenever schedule changes and is marked unsaved
  useEffect(() => {
    if (selectedClassId && hasUnsavedChanges && !isLoading) {
        const draftKey = DRAFT_PREFIX + selectedClassId;
        localStorage.setItem(draftKey, JSON.stringify(schedule));
    }
  }, [schedule, hasUnsavedChanges, selectedClassId, isLoading]);

  // Fetch subjects and teachers on mount
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
    try {
      // 1. Check for unsaved draft first
      const draftKey = DRAFT_PREFIX + selectedClassId;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
           const parsedDraft = JSON.parse(savedDraft);
           if (Array.isArray(parsedDraft)) {
               setSchedule(parsedDraft);
               setHasUnsavedChanges(true); // Mark as unsaved because it's from a draft
               setLastSaved(null);
               showToast("Restored unsaved draft", "info");
               setIsLoading(false);
               return; // Skip DB fetch if draft exists
           }
        } catch (e) {
           console.error("Failed to parse draft", e);
           localStorage.removeItem(draftKey); // Clean up corrupt draft
        }
      }

      // 2. Fetch from DB if no draft
      const data = await scheduleService.getAll(selectedClassId);
      setSchedule(data);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to load schedule", error);
      showToast("Failed to load schedule data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!selectedClassId) return;

    setIsSaving(true);
    try {
      await scheduleService.save(selectedClassId, schedule);
      
      // Clear draft on successful save
      localStorage.removeItem(DRAFT_PREFIX + selectedClassId);
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      showToast("Schedule saved successfully", "success");
    } catch (error) {
      console.error("Failed to save schedule", error);
      showToast("Failed to save to database. Check connection.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModal = (session?: ClassSession) => {
    if (session) {
      setEditingId(session.id);
      setFormData(session);
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        instructor: '',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let newSchedule: ClassSession[];
    
    if (editingId) {
      newSchedule = schedule.map(item => 
        item.id === editingId ? { ...formData, id: editingId } as ClassSession : item
      );
    } else {
      const newSession = {
        ...formData as ClassSession,
        id: Date.now().toString()
      };
      newSchedule = [...schedule, newSession];
    }

    // Update local state only
    setSchedule(newSchedule);
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

    const newSchedule = schedule.filter(item => item.id !== deleteTargetId);
    // Update local state only
    setSchedule(newSchedule);
    setHasUnsavedChanges(true);
    showToast("Class removed locally. Don't forget to save.", "info");
    setIsDeleteModalOpen(false);
  };

  const handleCreateProject = () => {
    const name = prompt("Enter new project/schedule name:");
    if (name) {
      addClass(name);
      setIsClassMenuOpen(false);
      showToast(`Project '${name}' created`, "success");
    }
  };

  const getClassesForDay = (day: string) => {
    return schedule
      .filter(s => s.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Filter teachers based on the selected subject in formData
  const filteredTeachers = availableTeachers.filter(teacher => 
    formData.title && teacher.subjects && teacher.subjects.includes(formData.title)
  );

  if (!selectedClassId) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-supabase-muted gap-3">
             <p className="text-sm">Please select a project/class to view schedule.</p>
        </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-supabase-muted gap-3">
        <Loader2 className="animate-spin text-supabase-green" size={32} />
        <p className="text-sm">Loading schedule for {selectedClassId}...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-supabase-bg text-supabase-text relative">
      {/* Header */}
      <div className="h-14 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
                <Calendar className="text-supabase-green" size={20} />
                <h1 className="text-base font-medium hidden md:block">Class Schedule</h1>
                <span className="text-xs text-supabase-muted bg-supabase-sidebar px-2 py-0.5 rounded border border-supabase-border">
                    {schedule.length} Sessions
                </span>
            </div>
            
            {/* Sync Status Indicator */}
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
                        <span className="hidden sm:inline">{lastSaved ? 'All changes saved' : 'Synced'}</span>
                    </div>
                )}
            </div>

            {/* Class Dropdown */}
            <div className="relative border-l border-supabase-border pl-4" ref={classDropdownRef}>
                <button 
                    onClick={() => setIsClassMenuOpen(!isClassMenuOpen)}
                    className="flex items-center gap-2 hover:bg-supabase-hover px-2 py-1 rounded transition-colors text-supabase-text"
                >
                    <span className="font-medium max-w-[100px] sm:max-w-[150px] truncate">{selectedClassId}</span>
                    <ChevronDown size={14} className="text-supabase-muted" />
                </button>
                
                {isClassMenuOpen && (
                    <div className="absolute top-full left-4 mt-1 w-56 bg-supabase-panel border border-supabase-border rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-xs font-semibold text-supabase-muted border-b border-supabase-border mb-1 uppercase tracking-wider">
                            Switch Project
                        </div>
                        {availableClasses.map(cls => (
                            <button 
                                key={cls}
                                onClick={() => { setSelectedClassId(cls); setIsClassMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover flex items-center justify-between transition-colors"
                            >
                                {cls}
                                {selectedClassId === cls && <Check size={14} className="text-supabase-green" />}
                            </button>
                        ))}
                        <div className="border-t border-supabase-border mt-1 pt-1">
                            <button 
                            onClick={handleCreateProject}
                            className="w-full text-left px-3 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover transition-colors flex items-center gap-2"
                            >
                                <Plus size={14} />
                                Create Project
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
            <span className="hidden sm:inline">Save Changes</span>
            </button>
            
            <button 
            onClick={() => handleOpenModal()}
            className="bg-supabase-green text-black px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium hover:bg-supabase-greenHover transition-colors flex items-center gap-2"
            >
            <Plus size={16} fill="currentColor" />
            <span className="hidden sm:inline">Add Class</span>
            </button>
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 pb-6">
          {DAYS.map(day => (
            <div key={day} className="flex flex-col gap-4 min-w-0">
              <div className="sticky top-0 z-0 pb-2 bg-supabase-bg border-b-2 border-supabase-border">
                <h3 className="font-medium text-supabase-text uppercase tracking-wider text-xs flex justify-between items-center">
                    {day}
                    <span className="text-[10px] text-supabase-muted bg-supabase-panel px-1.5 py-0.5 rounded">{getClassesForDay(day).length}</span>
                </h3>
              </div>
              
              <div className="flex flex-col gap-3">
                {getClassesForDay(day).length === 0 && (
                    <div className="h-24 rounded-lg border border-dashed border-supabase-border flex items-center justify-center text-xs text-supabase-muted">
                        No classes
                    </div>
                )}
                {getClassesForDay(day).map(session => (
                  <div 
                    key={session.id} 
                    className={`group relative p-4 rounded-lg border transition-all hover:shadow-lg ${session.color} border-opacity-50 bg-opacity-10 bg-supabase-panel hover:bg-opacity-20`}
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
                        <div className="font-medium text-sm leading-tight pr-6">{session.title}</div>
                        <div className="flex items-center gap-1.5 text-xs opacity-80 mt-1">
                            <Clock size={12} />
                            <span>{session.startTime} - {session.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs opacity-80">
                            <MapPin size={12} />
                            <span>{session.room}</span>
                        </div>
                         <div className="flex items-center gap-1.5 text-xs opacity-80">
                            <User size={12} />
                            <span>{session.instructor}</span>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-supabase-border bg-supabase-sidebar">
              <h2 className="text-sm font-semibold text-supabase-text">
                {editingId ? 'Edit Class' : 'Add New Class'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 1. Day Selection */}
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

              {/* 2. Subject Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-supabase-muted">Subject</label>
                {availableSubjects.length > 0 ? (
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
                ) : (
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green"
                      placeholder="e.g. Introduction to Computer Science"
                    />
                )}
                {availableSubjects.length === 0 && (
                     <div className="text-[10px] text-supabase-muted">Tip: Create 'subjects' table to enable dropdown.</div>
                )}
              </div>

              {/* 3. Teacher Selection (Filtered) */}
               <div className="space-y-1.5">
                    <label className="text-xs font-medium text-supabase-muted">Teacher</label>
                    {availableTeachers.length > 0 ? (
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
                    ) : (
                        <input 
                        type="text" 
                        required
                        value={formData.instructor}
                        onChange={e => setFormData({...formData, instructor: e.target.value})}
                        className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                        placeholder="e.g. Prof. X"
                        />
                    )}
                     {availableTeachers.length > 0 && formData.title && filteredTeachers.length === 0 && (
                         <div className="text-[10px] text-yellow-500">No teachers found for {formData.title}. Assign in Teachers tab.</div>
                     )}
                </div>

              {/* 4. Room */}
              <div className="space-y-1.5">
                    <label className="text-xs font-medium text-supabase-muted">Room</label>
                    <input 
                      type="text" 
                      required
                      value={formData.room}
                      onChange={e => setFormData({...formData, room: e.target.value})}
                      className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                      placeholder="e.g. 101"
                    />
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
                  {editingId ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                           Enter the admin passcode to remove this class from the schedule.
                       </p>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-supabase-muted">Admin Passcode</label>
                           <input 
                               type="password" 
                               autoFocus
                               value={deletePasscode}
                               onChange={(e) => setDeletePasscode(e.target.value)}
                               className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                               placeholder="Enter code..."
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
                               Remove Class
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