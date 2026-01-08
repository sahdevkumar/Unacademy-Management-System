import React, { useEffect, useState } from 'react';
import { Monitor, Clock, MapPin, User, Loader2, Calendar, Edit2, Plus, X, Save, Trash2, Check } from 'lucide-react';
import { ClassSession } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Color options for new classes (matching ClassSchedule.tsx)
const COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
];

// Color themes for columns matching the dark neon aesthetic
const THEMES = [
    { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
    { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
    { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
    { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
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
    const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);

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
            <div className="h-full flex flex-col items-center justify-center bg-[#131313] text-supabase-muted gap-3">
                <Loader2 className="animate-spin text-supabase-green" size={32} />
                <p className="text-sm font-mono">INITIALIZING SYSTEM...</p>
            </div>
        );
    }

    if (!currentSchedule && !loading) {
        return (
             <div className="h-full flex flex-col items-center justify-center bg-[#131313] text-supabase-muted">
                <Monitor size={48} strokeWidth={1} className="mb-4 opacity-50" />
                <h2 className="text-xl font-medium text-white mb-2">NO LIVE SIGNAL</h2>
                <p className="text-sm max-w-md text-center">There are currently no active schedules published. Use the Table Editor to publish a schedule.</p>
             </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#131313] text-gray-200 font-sans p-6 overflow-hidden relative">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[#1a1a1a] p-4 rounded-lg border border-[#2a2a2a] shrink-0">
                <div className="flex items-center gap-3">
                    <Calendar className="text-supabase-green" size={24} />
                    <h1 className="text-lg font-bold tracking-wide text-white uppercase">Live Schedule View</h1>
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
                                    : 'bg-[#232323] text-gray-500 border-[#333] hover:text-gray-300 hover:border-gray-500'
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
                                <div className="flex items-center justify-between border-b border-[#333] pb-2 mb-1 group">
                                    <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{day}</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleAddClick(day)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all text-gray-400 hover:text-white"
                                            title="Add Class"
                                        >
                                            <Plus size={12} />
                                        </button>
                                        <div className="w-5 h-5 rounded-full bg-[#232323] border border-[#333] flex items-center justify-center text-[10px] text-gray-500 font-mono shrink-0">
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
                                    {dayClasses.map(session => (
                                        <div 
                                            key={session.id}
                                            className={`rounded-lg p-3 border ${theme.border} bg-[#1e1e1e] relative group overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg ${theme.glow}`}
                                        >
                                            {/* Top Color Line */}
                                            <div className={`absolute top-0 left-0 w-1 h-full ${session.color.split(' ')[0] || theme.bg} opacity-50`}></div>

                                            {/* Edit Button - Top Right */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(session);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded bg-black/30 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-black/50 hover:text-white transition-all z-10"
                                                title="Edit Schedule"
                                            >
                                                <Edit2 size={12} />
                                            </button>

                                            <div className="pl-2">
                                                <h3 className="text-xs md:text-sm font-bold text-white mb-2 line-clamp-2 leading-tight pr-4" title={session.title}>
                                                    {session.title}
                                                </h3>
                                                
                                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-400 mb-2">
                                                    <Clock size={10} className={`shrink-0 ${theme.text}`} />
                                                    <span className="font-mono truncate">{session.startTime} - {session.endTime}</span>
                                                </div>

                                                <div className="flex flex-col gap-1 pt-2 border-t border-[#333] mt-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 overflow-hidden">
                                                        <MapPin size={10} className="shrink-0" />
                                                        <span className="truncate">{session.room}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 overflow-hidden">
                                                        <User size={10} className="shrink-0" />
                                                        <span className="truncate">{session.instructor}</span>
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

            {/* Footer Metadata */}
            {currentSchedule && (
                <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex justify-between items-center text-[10px] text-gray-600 font-mono shrink-0">
                    <div>ID: {currentSchedule.id}</div>
                    <div>Last Updated: {new Date(currentSchedule.updated_at).toLocaleString()}</div>
                </div>
            )}

            {/* Edit/Add Modal */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#232323]">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                {editingSessionId ? 'Edit Session' : 'Add Session'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
                            {/* Day */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Day</label>
                                <select 
                                    value={formData.day}
                                    onChange={e => setFormData({...formData, day: e.target.value})}
                                    className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
                                >
                                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                            </div>

                            {/* Subject */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Subject</label>
                                {availableSubjects.length > 0 ? (
                                    <select 
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value, instructor: ''})}
                                        className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
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
                                        className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
                                        placeholder="Subject Name"
                                    />
                                )}
                            </div>

                            {/* Teacher */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Instructor</label>
                                {availableTeachers.length > 0 ? (
                                    <select 
                                        required
                                        value={formData.instructor}
                                        onChange={e => setFormData({...formData, instructor: e.target.value})}
                                        disabled={!formData.title}
                                        className={`w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none ${!formData.title ? 'opacity-50' : ''}`}
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
                                        className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
                                        placeholder="Instructor Name"
                                    />
                                )}
                            </div>

                            {/* Room */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Room</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.room}
                                    onChange={e => setFormData({...formData, room: e.target.value})}
                                    className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
                                    placeholder="e.g. 101"
                                />
                            </div>

                            {/* Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Start</label>
                                    <input 
                                        type="time" 
                                        required
                                        value={formData.startTime}
                                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                                        className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">End</label>
                                    <input 
                                        type="time" 
                                        required
                                        value={formData.endTime}
                                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                                        className="w-full bg-[#131313] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-supabase-green outline-none"
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
                                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
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