
import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, Calendar, Database, RefreshCw, Loader2, User, Phone, Download, Info, ChevronRight, MessageSquare, Filter, ExternalLink, X, Activity, Copy, Zap, ListTodo } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface CallHistoryEntry {
    id: string;
    timestamp: string;
    status_to: string;
    note: string;
    operator: string;
}

interface FlattenedEnquiryLog {
    id: string; // The entry ID from history
    lead_id: string;
    student_name: string;
    parent_name: string;
    phone: string;
    timestamp: string;
    status_to: string;
    note: string;
    operator: string;
}

const EnquiryCallLogView: React.FC = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState<FlattenedEnquiryLog[]>([]);
    const [selectedLeadIdForHistory, setSelectedLeadIdForHistory] = useState<string | null>(null);
    const [leadsData, setLeadsData] = useState<any[]>([]);
    
    // Filters
    const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchLogs = async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('enquiry_leads')
                .select('id, student_name, parent_name, phone, call_history')
                .not('call_history', 'is', null);

            if (error) throw error;
            setLeadsData(data || []);

            const allLogs: FlattenedEnquiryLog[] = [];
            (data || []).forEach(lead => {
                const history = Array.isArray(lead.call_history) ? lead.call_history : [];
                history.forEach((entry: any) => {
                    const ts = new Date(entry.timestamp);
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);

                    if (ts >= start && ts <= end) {
                        allLogs.push({
                            id: entry.id,
                            lead_id: lead.id,
                            student_name: lead.student_name,
                            parent_name: lead.parent_name,
                            phone: lead.phone,
                            timestamp: entry.timestamp,
                            status_to: entry.status_to,
                            note: entry.note,
                            operator: entry.operator
                        });
                    }
                });
            });

            allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(allLogs);
        } catch (e: any) {
            showToast("Failed to compile logs: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [startDate, endDate]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = log.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 log.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 log.phone.includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || log.status_to === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [logs, searchTerm, statusFilter]);

    const handleCreateFollowUpTask = (log: FlattenedEnquiryLog) => {
        // This simulates bridging the log entry to a task management protocol
        showToast(`Task Staged: Follow up with ${log.student_name} regarding "${log.note.slice(0, 15)}..."`, 'success');
        // In a full implementation, this might navigate to a task view with state:
        // setCurrentView(View.MY_TASK, { initialData: ... })
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Interested': return 'bg-supabase-green/10 text-supabase-green border-supabase-green/20';
            case 'Following-up': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'DNP': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'New': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-supabase-sidebar text-supabase-muted border-supabase-border';
        }
    };

    const selectedLeadFullHistory = leadsData.find(l => l.id === selectedLeadIdForHistory);

    return (
        <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500">
            {/* Header */}
            <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-supabase-green/10 rounded-lg">
                        <History className="text-supabase-green" size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-supabase-text uppercase tracking-wider">Enquiry Audit Trail</h1>
                        <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-tighter flex items-center gap-1.5">
                           <Database size={10} /> Lead Registry Ledger
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
                        <input 
                            type="text" 
                            placeholder="Filter by lead or operator..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-64 transition-all"
                        />
                    </div>
                    <button onClick={fetchLogs} className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[10px] font-black uppercase text-supabase-muted hover:text-supabase-text transition-all">
                        <Download size={14} /> CSV
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-supabase-panel border-b border-supabase-border px-6 py-4 flex flex-wrap items-center gap-6 shadow-inner">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">Lead State</label>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none min-w-[140px]"
                    >
                        <option value="all">All Transitions</option>
                        <option value="New">New</option>
                        <option value="Interested">Interested</option>
                        <option value="Following-up">Following-up</option>
                        <option value="DNP">DNP</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest px-1">Protocol Period</label>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green" />
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none"
                            />
                        </div>
                        <span className="text-[10px] font-black text-supabase-muted">TO</span>
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
                </div>

                <div className="ml-auto self-end flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest leading-none mb-1">Results</p>
                        <p className="text-xs font-black text-supabase-green">{filteredLogs.length} EVENTS</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-supabase-muted">
                            <Loader2 className="animate-spin text-supabase-green" size={32} />
                            <span className="text-xs font-mono uppercase tracking-[0.2em]">Compiling Engagement Matrix...</span>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="py-40 bg-supabase-panel/40 border border-supabase-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center opacity-60">
                            <History size={48} className="text-supabase-muted mb-4" />
                            <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Timeline Void</h3>
                            <p className="text-xs text-supabase-muted mt-1 italic">No call events match the specified interval.</p>
                        </div>
                    ) : (
                        <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-supabase-sidebar/50 text-[9px] font-black uppercase text-supabase-muted tracking-[0.25em] border-b border-supabase-border">
                                        <th className="px-6 py-5">Event Time</th>
                                        <th className="px-6 py-5">Lead / Ident</th>
                                        <th className="px-6 py-5">Protocol Transition</th>
                                        <th className="px-6 py-5">Engagement Remark</th>
                                        <th className="px-6 py-5">Operator</th>
                                        <th className="px-6 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-supabase-border/40">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-supabase-hover/30 transition-colors group cursor-default">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-supabase-text uppercase tracking-tighter">
                                                        {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] text-supabase-muted font-mono">
                                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
                                                        <a href={`tel:${log.phone}`} className="text-[10px] font-mono text-supabase-muted group-hover:text-supabase-green transition-colors">{log.phone}</a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(log.status_to)}`}>
                                                    {log.status_to}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-md">
                                                    <p className="text-[11px] text-supabase-text font-medium leading-relaxed">
                                                        <MessageSquare size={10} className="inline mr-1.5 text-supabase-green opacity-50" />
                                                        "{log.note}"
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-supabase-sidebar border border-supabase-border flex items-center justify-center">
                                                        <User size={10} className="text-supabase-green" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-supabase-muted uppercase tracking-widest truncate max-w-[120px]">{log.operator}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button 
                                                        onClick={() => handleCreateFollowUpTask(log)}
                                                        className="p-2 bg-supabase-green/10 text-supabase-green border border-supabase-green/20 rounded-lg hover:bg-supabase-green hover:text-black transition-all shadow-sm flex items-center justify-center"
                                                        title="Schedule Follow-up Task"
                                                    >
                                                        <Zap size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setSelectedLeadIdForHistory(log.lead_id)}
                                                        className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-text transition-all shadow-sm flex items-center justify-center"
                                                        title="View Full Identity History"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                    <a 
                                                        href={`tel:${log.phone}`}
                                                        className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-text transition-all flex items-center justify-center"
                                                        title="Immediate Recall"
                                                    >
                                                        <Phone size={16} />
                                                    </a>
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

            {/* History Panel - Reused from EnquiryCallView */}
            {selectedLeadIdForHistory && (
                <div className="fixed inset-0 z-[110] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLeadIdForHistory(null)}></div>
                    <div className="w-full max-w-lg bg-supabase-panel h-full shadow-2xl flex flex-col relative z-20 animate-in slide-in-from-right duration-500 border-l border-supabase-border">
                        <div className="px-8 py-6 border-b border-supabase-border bg-supabase-sidebar shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-supabase-green/10 rounded-xl text-supabase-green shadow-inner"><History size={20} /></div>
                                    <div>
                                        <h2 className="text-sm font-black text-supabase-text uppercase tracking-widest leading-none">Complete Audit Timeline</h2>
                                        <p className="text-[10px] text-supabase-muted font-mono uppercase mt-1">Lead: {selectedLeadFullHistory?.student_name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLeadIdForHistory(null)} className="text-supabase-muted hover:text-supabase-text p-2 hover:bg-supabase-bg rounded-lg"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-supabase-bg/20">
                            {!selectedLeadFullHistory?.call_history?.length ? (
                                <div className="h-full flex flex-col items-center justify-center text-supabase-muted opacity-40">
                                    <History size={48} strokeWidth={1} className="mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">Registry Neutral</p>
                                </div>
                            ) : (
                                <div className="space-y-8 relative">
                                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-supabase-border"></div>
                                    {selectedLeadFullHistory.call_history.slice().reverse().map((entry: any, idx: number) => (
                                        <div key={entry.id} className="relative pl-10 group">
                                            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-supabase-panel flex items-center justify-center shadow-lg transition-all z-10 ${idx === 0 ? 'bg-supabase-green text-black' : 'bg-supabase-sidebar text-supabase-muted'}`}>
                                                {idx === 0 ? <Activity size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                            </div>
                                            <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-5 shadow-sm hover:border-supabase-green/30 transition-all">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(entry.status_to)}`}>{entry.status_to}</span>
                                                    <span className="text-[10px] font-mono text-supabase-muted">{new Date(entry.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-supabase-text italic">"{entry.note}"</p>
                                                <div className="mt-4 pt-3 border-t border-supabase-border/50 flex items-center justify-between text-[10px] font-black text-supabase-muted uppercase tracking-tighter">
                                                    <div><User size={12} className="inline mr-1 text-supabase-green" /> {entry.operator}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-8 border-t border-supabase-border bg-supabase-sidebar shrink-0">
                            <div className="flex items-center gap-3 text-supabase-muted">
                                <Info size={16} className="text-supabase-green" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Read-only audit view.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 bg-supabase-panel border-t border-supabase-border flex items-center gap-3 text-supabase-muted shrink-0 shadow-inner">
                <Info size={14} className="text-supabase-green" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">
                    Historical data is synchronized with lead history records. Modifications made here only filter local views.
                </p>
            </div>
        </div>
    );
};

export default EnquiryCallLogView;
