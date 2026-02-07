
import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Calendar, Filter, Database, RefreshCw, Loader2, User, Phone, CheckCircle2, XCircle, Info, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';
import { ClassInfo } from '../types';

interface OutreachLogEntry {
    id: string;
    student_id: string;
    student_name: string;
    class_name: string;
    guardian_name: string;
    contact_number: string;
    date: string;
    outcome: string;
    note: string;
    updated_at: string;
}

const AbsentCallLogView: React.FC = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [logs, setLogs] = useState<OutreachLogEntry[]>([]);
    
    // Filters
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchInitial = async () => {
            const classData = await scheduleService.getClasses();
            setClasses(classData);
            fetchLogs();
        };
        fetchInitial();
    }, []);

    const fetchLogs = async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            // Fetch outreach logs
            let query = supabase
                .from('outreach_logs')
                .select(`
                    id,
                    student_id,
                    date,
                    outcome,
                    note,
                    updated_at
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            const { data: outreachData, error: outError } = await query;
            if (outError) throw outError;

            if (!outreachData || outreachData.length === 0) {
                setLogs([]);
                setIsLoading(false);
                return;
            }

            // Fetch student details for all IDs found
            const studentIds = outreachData.map(d => d.student_id);
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id, full_name, class_name, guardian_name, contact_number')
                .in('id', studentIds);

            if (studentError) throw studentError;

            // Merge data
            const merged: OutreachLogEntry[] = outreachData.map(log => {
                const student = students?.find(s => s.id === log.student_id);
                return {
                    ...log,
                    student_name: student?.full_name || 'Unknown Student',
                    class_name: student?.class_name || 'N/A',
                    guardian_name: student?.guardian_name || 'N/A',
                    contact_number: student?.contact_number || 'N/A'
                };
            });

            setLogs(merged);
        } catch (e: any) {
            showToast("Failed to fetch history: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesClass = selectedClass === 'all' || log.class_name === selectedClass;
        const matchesSearch = log.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             log.guardian_name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const getOutcomeBadge = (outcome: string) => {
        switch (outcome) {
            case 'called': return 'bg-supabase-green/10 text-supabase-green border-supabase-green/20';
            case 'notified': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'no_answer': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        }
    };

    return (
        <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500">
            {/* Header */}
            <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-supabase-green/10 rounded-lg">
                        <ClipboardList className="text-supabase-green" size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">Outreach Protocols</h1>
                        <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-tighter flex items-center gap-1.5">
                           <Database size={10} /> Historical Ledger: public.outreach_logs
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
                        <input 
                            type="text" 
                            placeholder="Filter by student..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-48 transition-all"
                        />
                    </div>
                    <button onClick={fetchLogs} className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[10px] font-black uppercase text-supabase-muted hover:text-supabase-text transition-all">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-supabase-panel border-b border-supabase-border px-6 py-4 flex flex-wrap items-center gap-6 shadow-inner">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">Class Scope</label>
                    <select 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none min-w-[140px]"
                    >
                        <option value="all">Entire Campus</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">Start Interval</label>
                    <div className="relative group">
                        <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">End Interval</label>
                    <div className="relative group">
                        <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none"
                        />
                    </div>
                </div>

                <div className="ml-auto self-end pb-1">
                    <button 
                        onClick={fetchLogs}
                        className="px-6 py-1.5 bg-supabase-green/10 text-supabase-green border border-supabase-green/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-green hover:text-black transition-all"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-supabase-muted">
                            <Loader2 className="animate-spin text-supabase-green" size={32} />
                            <span className="text-xs font-mono uppercase tracking-[0.2em]">Resolving Audit Trails...</span>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="py-32 bg-supabase-panel/40 border border-supabase-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center opacity-60">
                            {/* Fixed lowercase 'clipboardList' to 'ClipboardList' */}
                            <ClipboardList size={48} className="text-supabase-muted mb-4" />
                            <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">No Protocol Entries Found</h3>
                            <p className="text-xs text-supabase-muted mt-1 italic">No outreach records match the current filter scope.</p>
                        </div>
                    ) : (
                        <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-supabase-sidebar/50 text-[9px] font-black uppercase text-supabase-muted tracking-[0.25em] border-b border-supabase-border">
                                        <th className="px-6 py-5">Timestamp</th>
                                        <th className="px-6 py-5">Student Identity</th>
                                        <th className="px-6 py-5">Guardian Access</th>
                                        <th className="px-6 py-5">Outcome</th>
                                        <th className="px-6 py-5">Registry Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-supabase-border/40">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-supabase-hover/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-supabase-text uppercase tracking-tighter">
                                                        {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <span className="text-[10px] text-supabase-muted font-mono">
                                                        {new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-all shadow-inner font-bold uppercase">
                                                        {log.student_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-supabase-text uppercase tracking-tight">{log.student_name}</div>
                                                        <div className="text-[9px] font-bold text-supabase-green uppercase tracking-widest">{log.class_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-supabase-text">
                                                        <User size={12} className="text-supabase-muted" />
                                                        {log.guardian_name}
                                                    </div>
                                                    <a href={`tel:${log.contact_number}`} className="flex items-center gap-2 text-[10px] font-mono text-supabase-muted hover:text-supabase-green transition-colors">
                                                        <Phone size={10} />
                                                        {log.contact_number}
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getOutcomeBadge(log.outcome)}`}>
                                                    {log.outcome.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs">
                                                    <p className="text-[11px] text-supabase-muted italic line-clamp-2" title={log.note}>
                                                        "{log.note || 'No administrative remark logged.'}"
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-4 bg-supabase-panel border-t border-supabase-border flex items-center gap-3 text-supabase-muted shrink-0 shadow-inner">
                <Info size={14} className="text-supabase-green" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">
                    System is currently filtering {filteredLogs.length} verified outreach events from the global registry.
                </p>
            </div>
        </div>
    );
};

export default AbsentCallLogView;