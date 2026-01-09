import React, { useEffect, useState } from 'react';
import { Monitor, Clock, MapPin, User, Loader2, Calendar, Edit2, Plus, X, Save, Trash2, Check } from 'lucide-react';
import { ClassSession, Teacher } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Color options matching ClassSchedule.tsx
const COLORS = [
  'bg-blue-50 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  'bg-purple-50 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  'bg-green-50 dark:bg-green-500/20 text-green-900 dark:text-green-300 border-green-200 dark:border-green-500/30',
  'bg-orange-50 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
  'bg-pink-50 dark:bg-pink-500/20 text-pink-900 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
];

// Color themes for columns
const THEMES = [
    { border: 'border-blue-200 dark:border-blue-500/30', bg: 'bg-blue-50 dark:bg-blue-500/5', text: 'text-blue-800 dark:text-blue-400', glow: 'shadow-blue-500/20' },
    { border: 'border-purple-200 dark:border-purple-500/30', bg: 'bg-purple-50 dark:bg-purple-500/5', text: 'text-purple-800 dark:text-purple-400', glow: 'shadow-purple-500/20' },
    { border: 'border-pink-200 dark:border-pink-500/30', bg: 'bg-pink-50 dark:bg-pink-500/5', text: 'text-pink-800 dark:text-pink-400', glow: 'shadow-pink-500/20' },
    { border: 'border-yellow-200 dark:border-yellow-500/30', bg: 'bg-yellow-50 dark:bg-yellow-500/5', text: 'text-yellow-800 dark:text-yellow-400', glow: 'shadow-yellow-500/20' },
    { border: 'border-rose-200 dark:border-rose-500/30', bg: 'bg-rose-50 dark:bg-rose-500/5', text: 'text-rose-800 dark:text-rose-400', glow: 'shadow-rose-500/20' },
    { border: 'border-cyan-200 dark:border-cyan-500/30', bg: 'bg-cyan-50 dark:bg-cyan-500/5', text: 'text-cyan-800 dark:text-cyan-400', glow: 'shadow-cyan-500/20' },
];

interface PublishedSchedule {
    id: string;
    class: string;
    content: ClassSession[];
    updated_at: string;
}

const LiveScheduleView: React.FC = () => {
    const [schedules, setSchedules] = useState<PublishedSchedule[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Modal & Editing State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
    const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);

    const [formData, setFormData] = useState<Partial<ClassSession>>({
        title: '',
        instructor: '',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: '',
        color: COLORS[0]
    });

    const fetchSchedules = async () => {
        setLoading(true);
        const data = await scheduleService.getPublished();
        setSchedules(data);
        if (data.length > 0 && !selectedId) {
            setSelectedId(data[0].id);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSchedules();
        // Fetch lists for dropdowns
        const fetchLists = async () => {
            const subs = await scheduleService.getSubjects();
            setAvailableSubjects(subs);
            const teachers = await scheduleService.getTeachers();
            setAvailableTeachers(teachers);
        };
        fetchLists();
    }, []);

    const currentSchedule = schedules.find(s => s.id === selectedId);

    const getClassesForDay = (day: string) => {
        if (!currentSchedule) return [];
        return currentSchedule.content
            .filter(s => s.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    // Open Modal for Editing
    const handleEditClick = (session: ClassSession) => {
        setEditingSessionId(session.id);
        setFormData(session);
        setIsModalOpen(true);
    };

    // Open Modal for Adding
    const handleAddClick = (day: string) => {
        setEditingSessionId(null);
        setFormData({
            title: '',
            instructor: '',
            day: day,
            startTime: '09:00',
            endTime: '10:00',
            room: '',
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        });
        setIsModalOpen(true);
    };

    // Save Changes
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSchedule) return;

        setIsSaving(true);
        try {
            let newContent = [...currentSchedule.content];

            if (editingSessionId) {
                // Update existing
                newContent = newContent.map(item => 
                    item.id === editingSessionId ? { ...item, ...formData } as ClassSession : item
                );
            } else {
                // Add new
                const newSession = {
                    ...formData as ClassSession,
                    id: Date.now().toString()
                };
                newContent.push(newSession);
            }

            // Save to DB
            await scheduleService.save(currentSchedule.class, newContent);
            
            // Refresh local state
            await fetchSchedules();
            
            setIsModalOpen(false);
            showToast(editingSessionId ? "Class updated successfully" : "Class added successfully", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to save changes", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!currentSchedule || !editingSessionId) return;
        
        if (!confirm("Are you sure you want to delete this class?")) return;

        setIsSaving(true);
        try {
            const newContent = currentSchedule.content.filter(item => item.id !== editingSessionId);
            await scheduleService.save(currentSchedule.class, newContent);
            await fetchSchedules();
            setIsModalOpen(false);
            showToast("Class deleted successfully", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to delete class", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Filter teachers based on selected subject
    const filteredTeachers = availableTeachers.filter(teacher => 
        formData.title && teacher.subjects && teacher.subjects.includes(formData.title)
    );

    if (loading && schedules.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-supabase-bg text-supabase-muted gap-3">
                <Loader2 className="animate-spin text-supabase-green" size={32} />
                <p className="text-sm font-mono">INITIALIZING SYSTEM...</p>
            </div>
        );
    }

    if (!currentSchedule && !loading) {
        return (
             <div className="h-full flex flex-col items-center justify-center bg-supabase-bg text-supabase-muted">
                <Monitor size={48} strokeWidth={1} className="mb-4 opacity-50" />
                <h2 className="text-xl font-medium text-supabase-text mb-2">NO LIVE SIGNAL</h2>
                <p className="text-sm max-w-md text-center">There are currently no active schedules published. Use the Table Editor to publish a schedule.</p>
             </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-supabase-bg text-supabase-text font-sans p-6 overflow-hidden relative">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-supabase-panel p-4 rounded-lg border border-supabase-border shrink-0">
                <div className="flex items-center gap-3">
                    <Calendar className="text-supabase-green" size={24} />
                    <h1 className="text-lg font-bold tracking-wide text-supabase-text uppercase">Live Schedule View</h1>
                </div>

                {/* Tabs / Class Selectors */}
                <div className="flex flex-wrap gap-2">
                    {schedules.map(sch => (
                        <button
                            key={sch.id}
                            onClick={() => setSelectedId(sch.id)}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all border ${
                                selectedId === sch.id
                                    ? 'bg-supabase-green/10 text-supabase-green border-supabase-green'
                                    : 'bg-supabase-sidebar text-supabase-muted border-supabase-border hover:text-supabase-text hover:border-supabase-muted'
                            }`}
                        >
                            {sch.class}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Content - Responsive Columns */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pb-6">
                    {DAYS.map((day, index) => {
                        const dayClasses = getClassesForDay(day);
                        const theme = THEMES[index % THEMES.length];
                        const count = dayClasses.length;

                        return (
                            <div key={day} className="flex flex-col gap-3 min-w-0">
                                {/* Column Header */}
                                <div className="flex items-center justify-between border-b border-supabase-border pb-2 mb-1 group">
                                    <span className="text-[10px] md:text-xs font-bold text-supabase-muted uppercase tracking-wider truncate">{day}</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleAddClick(day)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-supabase-hover rounded transition-all text-supabase-muted hover:text-supabase-text"
                                            title="Add Class"
                                        >
                                            <Plus size={12} />
                                        </button>
                                        <div className="w-5 h-5 rounded-full bg-supabase-panel border border-supabase-border flex items-center justify-center text-[10px] text-supabase-muted font-mono shrink-0">
                                            {count}
                                        </div>
                                    </div>
                                </div>

                                {/* Cards */}
                                <div className="flex flex-col gap-3">
                                    {/* Empty State / Coming Soon */}
                                    {count === 0 && (
                                        <div className={`h-28 rounded-lg border-2 border-dashed ${theme.border} ${theme.bg} flex flex-col items-center justify-center p-2 text-center group relative`}>
                                            <span className={`text-sm md:text-base font-bold ${theme.text} opacity-80 tracking-wide break-words mb-2`}>
                                                Comming Soon..
                                            </span>
                                            <button
                                                onClick={() => handleAddClick(day)}
                                                className={`w-8 h-8 rounded-full border ${theme.border} ${theme.text} flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer`}
                                                title="Add Schedule"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Active Classes */}
                                    {dayClasses.map(session => {
                                        const teacher = availableTeachers.find(t => t.name === session.instructor);

                                        return (
                                        <div 
                                            key={session.id}
                                            className={`rounded-lg p-3 border bg-supabase-panel relative group overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg ${theme.glow} ${session.color ? session.color.split(' ').filter(c => c.startsWith('border')).join(' ') : theme.border}`}
                                        >
                                            {/* Top Color Line */}
                                            <div className={`absolute top-0 left-0 w-1 h-full ${session.color ? session.color.split(' ')[0] : theme.bg} opacity-50`}></div>

                                            {/* Edit Button - Top Right */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(session);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all z-10"
                                                title="Edit Schedule"
                                            >
                                                <Edit2 size={12} />
                                            </button>

                                            <div className="flex gap-3 items-start relative z-10">
                                                {/* Top Left Avatar */}
                                                <div className="shrink-0">
                                                    <div className={`w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center bg-supabase-bg ${theme.border}`}>
                                                        {teacher?.profile_photo_url ? (
                                                            <img src={teacher.profile_photo_url} alt={session.instructor} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={14} className={theme.text} />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <h3 className={`text-xs md:text-sm font-bold mb-1 leading-tight ${session.color ? session.color.split(' ').find(c => c.startsWith('text')) || 'text-supabase-text' : 'text-supabase-text'}`} title={session.title}>
                                                        {session.title}
                                                    </h3>
                                                    
                                                    <div className="text-[10px] md:text-xs text-supabase-muted truncate font-medium mb-1.5">
                                                        {session.instructor}
                                                    </div>

                                                    <div className="flex flex-col gap-1 pt-1.5 border-t border-supabase-border/50">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-supabase-muted overflow-hidden">
                                                            <MapPin size={10} className="shrink-0" />
                                                            <span className="truncate">{session.room}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-supabase-muted overflow-hidden">
                                                            <Clock size={10} className="shrink-0" />
                                                            <span className="font-mono truncate">{session.startTime} - {session.endTime}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Metadata */}
            {currentSchedule && (
                <div className="mt-4 pt-3 border-t border-supabase-border flex justify-between items-center text-[10px] text-supabase-muted font-mono shrink-0">
                    <div>ID: {currentSchedule.id}</div>
                    <div>Last Updated: {new Date(currentSchedule.updated_at).toLocaleString()}</div>
                </div>
            )}

            {/* Edit/Add Modal */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-supabase-border bg-supabase-sidebar">
                            <h2 className="text-sm font-bold text-supabase-text uppercase tracking-wider">
                                {editingSessionId ? 'Edit Session' : 'Add Session'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
                            {/* Day */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-supabase-muted uppercase">Day</label>
                                <select 
                                    value={formData.day}
                                    onChange={e => setFormData({...formData, day: e.target.value})}
                                    className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                >
                                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                            </div>

                            {/* Subject */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-supabase-muted uppercase">Subject</label>
                                {availableSubjects.length > 0 ? (
                                    <select 
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value, instructor: ''})}
                                        className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                    >
                                        <option value="" disabled>Select Subject</option>
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
                                        className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                        placeholder="Subject Name"
                                    />
                                )}
                            </div>

                            {/* Teacher */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-supabase-muted uppercase">Instructor</label>
                                {availableTeachers.length > 0 ? (
                                    <select 
                                        required
                                        value={formData.instructor}
                                        onChange={e => setFormData({...formData, instructor: e.target.value})}
                                        disabled={!formData.title}
                                        className={`w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none ${!formData.title ? 'opacity-50' : ''}`}
                                    >
                                        <option value="" disabled>Select Instructor</option>
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
                                        className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                        placeholder="Instructor Name"
                                    />
                                )}
                            </div>

                            {/* Room */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-supabase-muted uppercase">Room</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.room}
                                    onChange={e => setFormData({...formData, room: e.target.value})}
                                    className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                    placeholder="e.g. 101"
                                />
                            </div>

                            {/* Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-supabase-muted uppercase">Start</label>
                                    <input 
                                        type="time" 
                                        required
                                        value={formData.startTime}
                                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                                        className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-supabase-muted uppercase">End</label>
                                    <input 
                                        type="time" 
                                        required
                                        value={formData.endTime}
                                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                                        className="w-full bg-supabase-bg border border-supabase-border rounded px-2 py-1.5 text-xs text-supabase-text focus:border-supabase-green outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-between gap-3">
                                {editingSessionId && (
                                     <button 
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                )}
                                <div className="flex gap-2 ml-auto">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-3 py-1.5 text-xs text-supabase-muted hover:text-supabase-text transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSaving}
                                        className="bg-supabase-green text-black px-4 py-1.5 rounded text-xs font-bold hover:bg-opacity-90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        Save
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveScheduleView;