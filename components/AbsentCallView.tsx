import React, { useState, useEffect } from 'react';
import { PhoneCall, Search, Filter, Phone, User, Clock, CheckCircle2, XCircle, AlertCircle, History, Loader2, Database, RefreshCw, Calendar, ChevronRight, Tag, PowerOff, HeartPulse, Home, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { ClassInfo } from '../types';

interface StudentAbsentee {
    id: string; 
    name: string;
    class: string;
    parent_name: string;
    phone: string;
    status: 'pending' | 'called' | 'no_answer' | 'notified';
    last_attempt?: string;
    reason?: string;
}

const REMARK_TAGS = [
    { label: 'Switch Off', icon: PowerOff, outcome: 'no_answer', color: 'text-red-400 border-red-500/20 bg-red-500/5' },
    { label: 'No Answer', icon: XCircle, outcome: 'no_answer', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
    { label: 'Health Issue', icon: HeartPulse, outcome: 'notified', color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
    { label: 'Family Event', icon: Home, outcome: 'notified', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
    { label: 'Emergency', icon: AlertTriangle, outcome: 'called', color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' },
];

const AbsentCallView: React.FC = () => {
    const { showToast } = useToast();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [absentees, setAbsentees] = useState<StudentAbsentee[]>([]);

    useEffect(() => {
        const fetchClasses = async () => {
            const data = await scheduleService.getClasses();
            setClasses(data);
            if (data.length > 0) setSelectedClass(data[0].name);
            setIsLoading(false);
        };
        fetchClasses();
    }, []);

    const fetchAbsentees = async () => {
        if (!selectedClass || !supabase) return;
        setIsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: attendanceLogs, error: attError } = await supabase
                .from('attendance_logs')
                .select('student_id, student_name, class_name')
                .eq('date', today)
                .eq('class_name', selectedClass)
                .eq('status', 'absent');

            if (attError) throw attError;
            if (!attendanceLogs || attendanceLogs.length === 0) {
                setAbsentees([]);
                setIsLoading(false);
                return;
            }

            const studentIds = attendanceLogs.map(log => log.student_id);
            const { data: studentProfiles, error: profError } = await supabase
                .from('students')
                .select('id, full_name, guardian_name, contact_number, class_name')
                .in('id', studentIds);

            if (profError) throw profError;

            const { data: outreachLogs, error: outError } = await supabase
                .from('outreach_logs')
                .select('*')
                .eq('date', today);

            if (outError) throw outError;

            const mapped: StudentAbsentee[] = (studentProfiles || []).map(profile => {
                const outreach = outreachLogs?.find(o => o.student_id === profile.id);
                return {
                    id: profile.id,
                    name: profile.full_name,
                    class: profile.class_name,
                    parent_name: profile.guardian_name || 'Guardian Unlisted',
                    phone: profile.contact_number || 'N/A',
                    status: (outreach?.outcome || 'pending') as StudentAbsentee['status'],
                    last_attempt: outreach?.updated_at ? new Date(outreach.updated_at).toLocaleTimeString() : undefined,
                    reason: outreach?.note
                };
            });
            setAbsentees(mapped);
        } catch (e: any) {
            showToast("Sync Failure: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAbsentees(); }, [selectedClass]);

    const handleStatusUpdate = async (studentId: string, newOutcome: any, note: string) => {
        if (!supabase) return;
        setIsActionLoading(`${studentId}-${note}`);
        try {
            const today = new Date().toISOString().split('T')[0];
            const { error } = await supabase
                .from('outreach_logs')
                .upsert({
                    student_id: studentId,
                    date: today,
                    outcome: newOutcome,
                    note: note,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id, date' });

            if (error) throw error;
            showToast(`Log recorded: ${note}`, 'success');
            await fetchAbsentees();
        } catch (e: any) {
            showToast("Database Update Error: " + e.message, "error");
        } finally {
            setIsActionLoading(null);
        }
    };

    const filtered = absentees.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone.includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500">
            <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-supabase-green/10 rounded-lg"><PhoneCall className="text-supabase-green" size={20} /></div>
                    <div>
                        <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">Absentee Outreach</h1>
                        <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-tighter flex items-center gap-1.5"><Database size={10} /> Contact Matrix Active</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
                        <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-64 transition-all" />
                    </div>
                    <button onClick={fetchAbsentees} className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-supabase-panel p-4 rounded-xl border border-supabase-border shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">Selected Unit</p>
                                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none min-w-[150px]">
                                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="h-8 w-px bg-supabase-border hidden md:block"></div>
                            <div className="flex items-center gap-2 text-supabase-muted"><Calendar size={14} /><span className="text-xs font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center"><p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Absentees</p><p className="text-lg font-black text-red-400">{absentees.length}</p></div>
                            <div className="text-center"><p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Cleared</p><p className="text-lg font-black text-supabase-green">{absentees.filter(a => a.status !== 'pending' && a.status !== 'no_answer').length}</p></div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-supabase-muted">
                            <Loader2 className="animate-spin text-supabase-green" size={32} /><span className="text-xs font-mono uppercase tracking-[0.2em]">Resolving Connection Matrix...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 bg-supabase-panel/40 border border-supabase-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center">
                            <CheckCircle2 size={48} className="text-supabase-green/40 mb-4" />
                            <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Registry Clear</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filtered.map(student => (
                                <div key={student.id} className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-lg hover:border-supabase-green/30 transition-all group overflow-hidden relative">
                                    <div className="flex items-start gap-5 relative z-10">
                                        <div className="w-14 h-14 rounded-2xl bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-xl font-black text-supabase-muted group-hover:text-supabase-green transition-all shadow-inner uppercase">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-base font-black text-supabase-text uppercase tracking-tight truncate">{student.name}</h3>
                                                    <div className="flex flex-col mt-1">
                                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest flex items-center gap-2"><User size={10}/> {student.parent_name}</p>
                                                        <a href={`tel:${student.phone}`} className="text-[11px] font-mono text-supabase-green font-bold mt-1 flex items-center gap-1.5 hover:underline group/phone">
                                                            <Phone size={10} className="group-hover/phone:animate-bounce" /> {student.phone}
                                                        </a>
                                                    </div>
                                                </div>
                                                <a href={`tel:${student.phone}`} className="p-3 bg-supabase-green text-black rounded-xl hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 active:scale-95">
                                                    <Phone size={20} />
                                                </a>
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border/30 pb-1">
                                                    <Tag size={10} /> Quick Response Remark
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {REMARK_TAGS.map((tag) => (
                                                        <button
                                                            key={tag.label}
                                                            disabled={isActionLoading !== null}
                                                            onClick={() => handleStatusUpdate(student.id, tag.outcome, tag.label)}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all hover:scale-105 active:scale-95 disabled:opacity-50
                                                                ${student.reason === tag.label ? 'ring-2 ring-supabase-green ring-offset-2 ring-offset-supabase-panel' : ''}
                                                                ${tag.color}
                                                            `}
                                                        >
                                                            {isActionLoading === `${student.id}-${tag.label}` ? <Loader2 size={12} className="animate-spin" /> : <tag.icon size={12} />}
                                                            {tag.label}
                                                        </button>
                                                    ))}
                                                    <button 
                                                        onClick={() => {
                                                            const custom = prompt("Enter custom remark:");
                                                            if (custom) handleStatusUpdate(student.id, 'called', custom);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-lg border border-supabase-border bg-supabase-sidebar text-[10px] font-bold text-supabase-muted hover:text-supabase-text uppercase"
                                                    >
                                                        Custom..
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-supabase-border/50 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-supabase-muted uppercase tracking-widest">
                                                    <History size={12} />
                                                    {student.last_attempt ? `Logged: ${student.last_attempt}` : 'No Signal Recorded'}
                                                </div>
                                                {student.reason && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-supabase-green/10 text-supabase-green border border-supabase-green/20 text-[9px] font-bold uppercase">
                                                        <CheckCircle2 size={10} /> {student.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AbsentCallView;