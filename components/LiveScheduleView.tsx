import React, { useEffect, useState } from 'react';
import { Monitor, Clock, MapPin, User, Loader2, Calendar, Edit2, Plus, X, Save, Trash2, Check, UserCircle } from 'lucide-react';
import { ClassSession, Teacher } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COLORS = [
  'bg-blue-50 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  'bg-purple-50 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  'bg-green-50 dark:bg-green-500/20 text-green-900 dark:text-green-300 border-green-200 dark:border-green-500/30',
  'bg-orange-50 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
  'bg-pink-50 dark:bg-pink-500/20 text-pink-900 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
];

const THEMES = [
    { border: 'border-blue-200 dark:border-blue-500/30', bg: 'bg-blue-50 dark:bg-blue-500/5', text: 'text-blue-800 dark:text-blue-400', glow: 'shadow-blue-500/20' },
    { border: 'border-purple-200 dark:border-purple-500/30', bg: 'bg-purple-50 dark:bg-purple-500/5', text: 'text-purple-800 dark:text-purple-400', glow: 'shadow-purple-500/20' },
    { border: 'border-pink-200 dark:border-pink-500/30', bg: 'bg-pink-50 dark:bg-pink-500/5', text: 'text-pink-800 dark:text-pink-400', glow: 'shadow-pink-500/20' },
    { border: 'border-yellow-200 dark:border-yellow-500/30', bg: 'bg-yellow-50 dark:bg-yellow-500/5', text: 'text-yellow-800 dark:text-yellow-400', glow: 'shadow-yellow-500/20' },
    { border: 'border-rose-200 dark:border-rose-500/30', bg: 'bg-rose-50 dark:bg-rose-500/5', text: 'text-rose-800 dark:text-rose-400', glow: 'shadow-rose-500/20' },
    { border: 'border-cyan-200 dark:border-cyan-500/30', bg: 'bg-cyan-50 dark:bg-cyan-500/5', text: 'text-cyan-800 dark:text-cyan-400', glow: 'shadow-cyan-500/20' },
];

interface ExtendedClassSession extends ClassSession {
    show_profiles?: boolean;
}

interface PublishedSchedule {
    id: string;
    class: string;
    content: ExtendedClassSession[];
    updated_at: string;
}

const LiveScheduleView: React.FC = () => {
    const [schedules, setSchedules] = useState<PublishedSchedule[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
    const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);

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

    const fetchSchedules = async () => {
        setLoading(true);
        const data = await scheduleService.getPublished();
        setSchedules(data as PublishedSchedule[]);
        if (data.length > 0 && !selectedId) {
            setSelectedId(data[0].id);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSchedules();
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

    const handleEditClick = (session: ExtendedClassSession) => {
        setEditingSessionId(session.id);
        setFormData({
            ...session,
            show_profiles: session.show_profiles !== undefined ? session.show_profiles : true
        });
        setIsModalOpen(true);
    };

    const handleAddClick = (day: string) => {
        setEditingSessionId(null);
        setFormData({
            title: '',
            instructor: '',
            day: day,
            startTime: '09:00',
            endTime: '10:00',
            room: '',
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            show_profiles: true
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSchedule) return;
        setIsSaving(true);
        try {
            let newContent = [...currentSchedule.content];
            if (editingSessionId) {
                newContent = newContent.map(item => item.id === editingSessionId ? { ...item, ...formData } as ExtendedClassSession : item);
            } else {
                const newSession = { ...formData as ExtendedClassSession, id: Date.now().toString() };
                newContent.push(newSession);
            }
            await scheduleService.save(currentSchedule.class, newContent as ClassSession[]);
            await fetchSchedules();
            setIsModalOpen(false);
            showToast(editingSessionId ? "Class updated successfully" : "Class added successfully", "success");
        } catch (error) { showToast("Failed to save changes", "error"); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!currentSchedule || !editingSessionId) return;
        if (!confirm("Are you sure you want to delete this class?")) return;
        setIsSaving(true);
        try {
            const newContent = currentSchedule.content.filter(item => item.id !== editingSessionId);
            await scheduleService.save(currentSchedule.class, newContent as ClassSession[]);
            await fetchSchedules();
            setIsModalOpen(false);
            showToast("Class deleted successfully", "success");
        } catch (error) { showToast("Failed to delete class", "error"); } finally { setIsSaving(false); }
    };

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
                <p className="text-sm max-w-md text-center">There are currently no active schedules published.</p>
             </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-supabase-bg text-supabase-text font-sans p-6 overflow-hidden relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-supabase-panel p-4 rounded-lg border border-supabase-border shrink-0">
                <div className="flex items-center gap-3">
                    <Calendar className="text-supabase-green" size={24} />
                    <h1 className="text-lg font-bold tracking-wide text-supabase-text uppercase">Live Schedule View</h1>
                </div>
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

            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pb-6">
                    {DAYS.map((day, index) => {
                        const dayClasses = getClassesForDay(day);
                        const theme = THEMES[index % THEMES.length];
                        const count = dayClasses.length;

                        return (
                            <div key={day} className="flex flex-col gap-3 min-w-0">
                                <div className="flex items-center justify-between border-b border-supabase-border pb-2 mb-1 group">
                                    <span className="text-[10px] md:text-xs font-bold text-supabase-muted uppercase tracking-wider truncate">{day}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleAddClick(day)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-supabase-hover rounded transition-all text-supabase-muted hover:text-supabase-text">
                                            <Plus size={12} />
                                        </button>
                                        <div className="w-5 h-5 rounded-full bg-supabase-panel border border-supabase-border flex items-center justify-center text-[10px] text-supabase-muted font-mono shrink-0">
                                            {count}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {count === 0 && (
                                        <div className={`h-28 rounded-lg border-2 border-dashed ${theme.border} ${theme.bg} flex flex-col items-center justify-center p-2 text-center group relative`}>
                                            <span className={`text-sm md:text-base font-bold ${theme.text} opacity-80 tracking-wide break-words mb-2`}>Comming Soon..</span>
                                            <button onClick={() => handleAddClick(day)} className={`w-8 h-8 rounded-full border ${theme.border} ${theme.text} flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer`}><Plus size={16} /></button>
                                        </div>
                                    )}

                                    {dayClasses.map(session => (
                                        <div key={session.id} className={`rounded-lg p-3 border bg-supabase-panel relative group overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg ${theme.glow} ${session.color ? session.color.split(' ').filter(c => c.startsWith('border')).join(' ') : theme.border}`}>
                                            <div className={`absolute top-0 left-0 w-1 h-full ${session.color ? session.color.split(' ')[0] : theme.bg} opacity-50`}></div>
                                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(session); }} className="absolute top-2 right-2 p-1.5 rounded bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all z-10"><Edit2 size={12} /></button>

                                            <div className="flex gap-3 items-start relative z-10">
                                                <div className="shrink-0 relative">
                                                    <div className={`w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center bg-supabase-bg ${theme.border}`}>
                                                        {session.instructorPhotoUrl && session.show_profiles === true ? (
                                                            <img src={session.instructorPhotoUrl} alt={session.instructor} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={14} className={theme.text} />
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-supabase-panel ${session.instructorStatus === 'active' ? 'bg-supabase-green' : 'bg-red-500'}`} title={session.instructorStatus}></div>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                        <h3 className={`text-xs md:text-sm font-bold leading-tight truncate ${session.color ? session.color.split(' ').find(c => c.startsWith('text')) || 'text-supabase-text' : 'text-supabase-text'}`} title={session.title}>{session.title}</h3>
                                                        {session.show_profiles === true && (
                                                            <UserCircle size={12} className="text-supabase-muted shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] md:text-xs text-supabase-muted truncate font-medium mb-1.5 flex items-center gap-1">
                                                        {session.instructor}
                                                        {session.instructorStatus === 'inactive' && <span className="text-[8px] px-1 bg-red-500/20 text-red-400 rounded">Offline</span>}
                                                    </div>
                                                    <div className="flex flex-col gap-1 pt-1.5 border-t border-supabase-border/50">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-supabase-muted overflow-hidden"><MapPin size={10} className="shrink-0" /><span className="truncate">{session.room}</span></div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-supabase-muted overflow-hidden"><Clock size={10} className="shrink-0" /><span className="font-mono truncate">{session.startTime} - {session.endTime}</span></div>
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-supabase-border bg-supabase-sidebar">
                            <h2 className="text-sm font-semibold text-supabase-text">
                                {editingSessionId ? 'Edit Session' : 'Add New Session'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-supabase-muted">Subject</label>
                                <select 
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value, instructor: ''})}
                                    className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                >
                                    <option value="" disabled>Select Subject</option>
                                    {availableSubjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-supabase-muted">Instructor</label>
                                <select 
                                    required
                                    value={formData.instructor}
                                    onChange={e => setFormData({...formData, instructor: e.target.value})}
                                    disabled={!formData.title}
                                    className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green disabled:opacity-50"
                                >
                                    <option value="" disabled>Select Instructor</option>
                                    {filteredTeachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-supabase-muted">Start Time</label>
                                    <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-supabase-muted">End Time</label>
                                    <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-supabase-muted">Room</label>
                                <input type="text" required value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green" placeholder="e.g. 101" />
                            </div>

                            {/* Profile Toggle Switch */}
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
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${formData.show_profiles ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                                    </div>
                                </button>
                            </div>

                            <div className="pt-4 flex justify-between gap-3">
                                {editingSessionId && (
                                    <button type="button" onClick={handleDelete} className="px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded flex items-center gap-2">
                                        <Trash2 size={16} /> Delete
                                    </button>
                                )}
                                <div className="flex gap-2 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-supabase-muted">Cancel</button>
                                    <button type="submit" className="bg-supabase-green text-black px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                                        <Save size={16} /> {editingSessionId ? 'Update' : 'Save'}
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