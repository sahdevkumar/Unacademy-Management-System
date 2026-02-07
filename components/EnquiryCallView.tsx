
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    MessageSquarePlus, 
    Search, 
    Filter, 
    Phone, 
    User, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Database, 
    RefreshCw, 
    Calendar, 
    Tag, 
    Flame, 
    Thermometer, 
    ThermometerSnowflake, 
    MoreVertical, 
    ExternalLink, 
    History,
    Loader2,
    CalendarClock,
    Plus,
    X,
    UserPlus,
    BookOpen,
    Globe,
    Layers,
    FileJson,
    AlertCircle,
    Terminal,
    UploadCloud,
    FileSpreadsheet,
    Download,
    Save,
    PhoneCall,
    Activity,
    ChevronRight,
    MessageSquare,
    Zap,
    Copy
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface CallHistoryEntry {
    id: string;
    timestamp: string;
    status_to: string;
    note: string;
    operator: string;
}

interface EnquiryLead {
    id: string;
    student_name: string;
    parent_name: string;
    phone: string;
    alt_phone?: string;
    source: 'Web' | 'Referral' | 'Walk-in' | 'Social Media';
    temp: 'Hot' | 'Warm' | 'Cold';
    status: 'Interested' | 'Following-up' | 'DNP' | 'Closed' | 'New';
    last_contact?: string;
    note?: string;
    call_history?: CallHistoryEntry[];
}

const EnquiryCallView: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTemp, setFilterTemp] = useState<'all' | 'Hot' | 'Warm' | 'Cold'>('all');
    const [leads, setLeads] = useState<EnquiryLead[]>([]);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    
    // Modal & Panel state
    const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedLeadIdForHistory, setSelectedLeadIdForHistory] = useState<string | null>(null);
    const [bulkTab, setBulkTab] = useState<'json' | 'csv'>('csv');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkData, setBulkData] = useState('');
    const [quickNote, setQuickNote] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [newEnquiry, setNewEnquiry] = useState<Partial<EnquiryLead>>({
        student_name: '',
        parent_name: '',
        phone: '',
        alt_phone: '',
        source: 'Walk-in',
        temp: 'Warm',
        status: 'New',
        note: ''
    });

    const fetchLeads = async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('enquiry_leads')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setLeads(data as EnquiryLead[] || []);
        } catch (e: any) {
            showToast("Lead Sync Failure: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const updateLeadStatus = async (id: string, status: EnquiryLead['status'], note?: string) => {
        if (!supabase || !user) return;
        setIsActionLoading(id);
        try {
            const now = new Date().toISOString();
            const currentLead = leads.find(l => l.id === id);
            
            const historyEntry: CallHistoryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: now,
                status_to: status,
                note: note || `Status updated to ${status}`,
                operator: user.name || user.email
            };

            const updatedHistory = [...(currentLead?.call_history || []), historyEntry];

            const { error } = await supabase
                .from('enquiry_leads')
                .update({ 
                    status, 
                    note: note || currentLead?.note, 
                    last_contact: now.split('T')[0],
                    updated_at: now,
                    call_history: updatedHistory
                })
                .eq('id', id);

            if (error) throw error;
            showToast(`Lead Status: ${status}`, 'success');
            await fetchLeads();
        } catch (e: any) {
            showToast("Update Failed: " + e.message, "error");
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleAddManualNote = async () => {
        if (!supabase || !selectedLeadIdForHistory || !quickNote.trim() || !user) return;
        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const lead = leads.find(l => l.id === selectedLeadIdForHistory);
            
            const historyEntry: CallHistoryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: now,
                status_to: lead?.status || 'Unknown',
                note: quickNote,
                operator: user.name || user.email
            };

            const updatedHistory = [...(lead?.call_history || []), historyEntry];

            const { error } = await supabase
                .from('enquiry_leads')
                .update({ 
                    call_history: updatedHistory,
                    updated_at: now
                })
                .eq('id', selectedLeadIdForHistory);

            if (error) throw error;
            setQuickNote('');
            showToast("Signal stored in ledger", "success");
            await fetchLeads();
        } catch (e: any) {
            showToast("Storage Failure: " + e.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const applyNoteTemplate = (prefix: string) => {
        setQuickNote(prev => prefix + " " + prev);
    };

    const handleInsertEnquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !user) return;
        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const initialHistory: CallHistoryEntry[] = [{
                id: 'init-' + Date.now(),
                timestamp: now,
                status_to: 'New',
                note: 'Registry entry initialized.',
                operator: user.name || user.email
            }];

            const { error } = await supabase
                .from('enquiry_leads')
                .insert([{
                    ...newEnquiry,
                    last_contact: now.split('T')[0],
                    call_history: initialHistory
                }]);

            if (error) throw error;
            
            showToast("Enquiry registered in registry", "success");
            setIsInsertModalOpen(false);
            setNewEnquiry({
                student_name: '',
                parent_name: '',
                phone: '',
                alt_phone: '',
                source: 'Walk-in',
                temp: 'Warm',
                status: 'New',
                note: ''
            });
            await fetchLeads();
        } catch (e: any) {
            showToast("Transaction Failed: " + e.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1);
        return rows.map(row => {
            const values = row.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((header, i) => { obj[header] = values[i]; });
            return obj;
        });
    };

    const handleBulkInsert = async () => {
        if (!supabase || !bulkData.trim() || !user) return;
        setIsSubmitting(true);
        try {
            let parsedData: any[];
            if (bulkTab === 'json') {
                parsedData = JSON.parse(bulkData);
            } else {
                parsedData = parseCSV(bulkData);
            }

            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toISOString();
            
            const payload = parsedData.map(item => ({
                student_name: item.student_name || item.student || 'Anonymous',
                parent_name: item.parent_name || item.parent || 'Unknown',
                phone: item.phone || item.mobile || '000-000-0000',
                alt_phone: item.alt_phone || item.alt_mobile || '',
                source: item.source || 'Web',
                temp: item.temp || 'Warm',
                status: 'New',
                note: item.note || 'Bulk import',
                last_contact: today,
                call_history: [{
                    id: 'bulk-' + Math.random().toString(36).substr(2, 5),
                    timestamp: now,
                    status_to: 'New',
                    note: 'Ingested via batch protocol.',
                    operator: user.name || user.email
                }]
            }));

            const { error } = await supabase.from('enquiry_leads').insert(payload);
            if (error) throw error;

            showToast(`${payload.length} nodes successfully ingested`, "success");
            setBulkData('');
            setIsBulkModalOpen(false);
            await fetchLeads();
        } catch (e: any) {
            showToast("Bulk Sync Failure: " + e.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setBulkData(event.target?.result as string);
            showToast("CSV buffer ready", "info");
        };
        reader.readAsText(file);
    };

    const handleDownloadSampleCSV = () => {
        const csv = "student_name,parent_name,phone,alt_phone,source,temp,note\nAryan Sharma,Vikram Sharma,+91 9123456780,+91 9000011111,Web,Hot,Sample entry";
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "enquiry_template.csv";
        link.click();
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 l.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 l.phone.includes(searchTerm) ||
                                 (l.alt_phone && l.alt_phone.includes(searchTerm));
            const matchesTemp = filterTemp === 'all' || l.temp === filterTemp;
            return matchesSearch && matchesTemp;
        });
    }, [leads, searchTerm, filterTemp]);

    const getTempColor = (temp: string) => {
        switch (temp) {
            case 'Hot': return 'text-red-400 border-red-500/20 bg-red-500/5';
            case 'Warm': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
            default: return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
        }
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

    const selectedLeadHistory = leads.find(l => l.id === selectedLeadIdForHistory);

    return (
        <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500 font-sans overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-supabase-green/10 rounded-lg shadow-inner">
                        <MessageSquarePlus className="text-supabase-green" size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-supabase-text uppercase tracking-widest leading-none">Lead Engagement Center</h1>
                        <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-tighter mt-1 flex items-center gap-1.5">
                           <Database size={10} /> public.enquiry_leads
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-all" />
                        <input 
                            type="text" 
                            placeholder="Search records..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-64 transition-all shadow-inner"
                        />
                    </div>
                    <button onClick={fetchLeads} className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex bg-supabase-sidebar border border-supabase-border rounded-lg p-0.5 shadow-sm">
                        <button onClick={() => setIsInsertModalOpen(true)} className="bg-supabase-green text-black px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all flex items-center gap-2"><UserPlus size={14} /> Insert</button>
                        <button onClick={() => { setIsBulkModalOpen(true); setBulkData(''); }} className="text-supabase-muted hover:text-supabase-text px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><Layers size={14} /> Bulk</button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-supabase-panel border-b border-supabase-border px-6 py-3 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Protocol Filter</span>
                    <div className="flex bg-supabase-sidebar border border-supabase-border rounded-lg p-0.5 shadow-inner">
                        {['all', 'Hot', 'Warm', 'Cold'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setFilterTemp(t as any)}
                                className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${filterTemp === t ? 'bg-supabase-green text-black' : 'text-supabase-muted hover:text-supabase-text'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">
                   {filteredLeads.length} Lead node(s) mapped
                </div>
            </div>

            {/* Leads Grid */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
                <div className="max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center gap-4 text-supabase-muted">
                            <Loader2 className="animate-spin text-supabase-green" size={32} />
                            <span className="text-xs font-mono uppercase tracking-[0.3em]">Querying Cluster Matrix...</span>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="py-40 bg-supabase-panel/40 border border-supabase-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center opacity-40">
                            <MessageSquarePlus size={48} className="mb-4" />
                            <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Registry Neutral</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                            {filteredLeads.map(lead => (
                                <div key={lead.id} className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-lg hover:border-supabase-green/30 transition-all group overflow-hidden relative flex flex-col ring-1 ring-white/5">
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-xl font-black text-supabase-muted group-hover:text-supabase-green transition-all shadow-inner uppercase">
                                                {lead.student_name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-supabase-text uppercase tracking-tight truncate max-w-[140px]">{lead.student_name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getTempColor(lead.temp)}`}>
                                                        {lead.temp}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-supabase-muted uppercase tracking-tighter">via {lead.source}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedLeadIdForHistory(lead.id)} className="p-2 text-supabase-muted hover:text-supabase-green bg-supabase-sidebar rounded-xl border border-supabase-border transition-all hover:scale-110 shadow-sm" title="View Call History">
                                            <History size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-4 flex-1 relative z-10">
                                        <div className="p-4 bg-supabase-sidebar border border-supabase-border/50 rounded-xl space-y-3 shadow-inner">
                                            <div className="flex flex-col">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs font-bold text-supabase-text flex items-center gap-2 truncate pr-2">
                                                            <User size={12} className="text-supabase-muted shrink-0" /> {lead.parent_name}
                                                        </div>
                                                        <a href={`tel:${lead.phone}`} className="text-xs font-mono font-bold text-supabase-green hover:underline flex items-center gap-1.5 shrink-0">
                                                            <Phone size={10} /> {lead.phone}
                                                        </a>
                                                    </div>
                                                    {lead.alt_phone && (
                                                        <div className="flex items-center justify-between border-t border-supabase-border/30 pt-2">
                                                            <div className="text-[9px] font-black text-supabase-muted uppercase">Alt Phone</div>
                                                            <a href={`tel:${lead.alt_phone}`} className="text-[11px] font-mono font-bold text-supabase-muted hover:text-supabase-green transition-colors flex items-center gap-1.5 shrink-0">
                                                                <Phone size={10} /> {lead.alt_phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="text-[8px] font-black text-supabase-muted uppercase tracking-[0.2em]">Quick Engagement</div>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(lead.status)}`}>
                                                    {lead.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'Follow-up', color: 'text-purple-400 border-purple-500/20 hover:bg-purple-500/5', status: 'Following-up' as const },
                                                    { label: 'Interested', color: 'text-supabase-green border-supabase-green/20 hover:bg-supabase-green/5', status: 'Interested' as const },
                                                    { label: 'DNP', color: 'text-red-400 border-red-500/20 hover:bg-red-500/5', status: 'DNP' as const }
                                                ].map((act) => (
                                                    <button 
                                                        key={act.label}
                                                        onClick={() => updateLeadStatus(lead.id, act.status)}
                                                        disabled={isActionLoading === lead.id}
                                                        className={`flex-1 min-w-[70px] py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all active:scale-95 disabled:opacity-50 ${act.color}`}
                                                    >
                                                        {isActionLoading === lead.id ? <Loader2 size={10} className="animate-spin mx-auto" /> : act.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-supabase-border/50 flex items-center justify-between shrink-0 relative z-10">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-supabase-muted uppercase tracking-widest">
                                            <CalendarClock size={12} className="text-supabase-green" />
                                            {lead.last_contact ? `Logged: ${lead.last_contact}` : 'Uninitiated'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-supabase-muted uppercase bg-supabase-sidebar px-1.5 rounded border border-supabase-border">
                                                {(lead.call_history || []).length} LOGS
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* History Panel */}
            {selectedLeadIdForHistory && (
                <div className="fixed inset-0 z-[110] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLeadIdForHistory(null)}></div>
                    <div className="w-full max-w-lg bg-supabase-panel h-full shadow-2xl flex flex-col relative z-20 animate-in slide-in-from-right duration-500 border-l border-supabase-border">
                        <div className="px-8 py-6 border-b border-supabase-border bg-supabase-sidebar shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-supabase-green/10 rounded-xl text-supabase-green shadow-inner"><History size={20} /></div>
                                    <div>
                                        <h2 className="text-sm font-black text-supabase-text uppercase tracking-widest leading-none">Call Audit Timeline</h2>
                                        <p className="text-[10px] text-supabase-muted font-mono uppercase mt-1">Lead: {selectedLeadHistory?.student_name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLeadIdForHistory(null)} className="text-supabase-muted hover:text-supabase-text p-2 hover:bg-supabase-bg rounded-lg"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-supabase-bg/20">
                            {(selectedLeadHistory?.call_history || []).length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-supabase-muted opacity-40">
                                    <History size={48} strokeWidth={1} className="mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">Registry Neutral</p>
                                </div>
                            ) : (
                                <div className="space-y-8 relative">
                                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-supabase-border"></div>
                                    {selectedLeadHistory?.call_history?.slice().reverse().map((entry, idx) => (
                                        <div key={entry.id} className="relative pl-10 group">
                                            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-supabase-panel flex items-center justify-center shadow-lg transition-all z-10 ${idx === 0 ? 'bg-supabase-green text-black' : 'bg-supabase-sidebar text-supabase-muted'}`}>
                                                {idx === 0 ? <Activity size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                            </div>
                                            <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-5 shadow-sm hover:border-supabase-green/30 transition-all relative">
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <button 
                                                        onClick={() => applyNoteTemplate(`Re-connecting from previous event: "${entry.note.slice(0, 20)}..."`)}
                                                        className="p-1.5 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all"
                                                        title="Duplicate into current note"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                    <button className="p-1.5 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all">
                                                        <Zap size={12} />
                                                    </button>
                                                </div>
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
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-1">
                                    <div className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={14} className="text-supabase-green" /> Add Note</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => applyNoteTemplate("Spoke with parent:")} className="text-[8px] font-black uppercase bg-supabase-bg border border-supabase-border px-2 py-1 rounded text-supabase-muted hover:text-supabase-green">Spoke</button>
                                        <button onClick={() => applyNoteTemplate("Call not received:")} className="text-[8px] font-black uppercase bg-supabase-bg border border-supabase-border px-2 py-1 rounded text-supabase-muted hover:text-red-400">No Ans</button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <textarea rows={3} value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder="Outcome description..." className="w-full bg-supabase-bg border border-supabase-border rounded-2xl p-4 text-xs text-supabase-text focus:border-supabase-green outline-none resize-none" />
                                    <button onClick={handleAddManualNote} disabled={isSubmitting || !quickNote.trim()} className="absolute bottom-3 right-3 p-2 bg-supabase-green text-black rounded-xl hover:bg-supabase-greenHover disabled:opacity-50 transition-all"><ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Insert Modal */}
            {isInsertModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-supabase-panel border border-supabase-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 border-b border-supabase-border bg-supabase-sidebar shrink-0 flex justify-between items-center">
                            <h2 className="text-xs font-black text-supabase-text uppercase tracking-[0.3em]">Initialize Enquiry</h2>
                            <button onClick={() => setIsInsertModalOpen(false)} className="text-supabase-muted hover:text-supabase-text"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleInsertEnquiry} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase">Student Name</label>
                                    <input required value={newEnquiry.student_name} onChange={e => setNewEnquiry({...newEnquiry, student_name: e.target.value})} className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:border-supabase-green outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase">Guardian Name</label>
                                    <input required value={newEnquiry.parent_name} onChange={e => setNewEnquiry({...newEnquiry, parent_name: e.target.value})} className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:border-supabase-green outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase">Phone</label>
                                    <input required value={newEnquiry.phone} onChange={e => setNewEnquiry({...newEnquiry, phone: e.target.value})} className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-2.5 text-sm font-mono text-supabase-text focus:border-supabase-green outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase">Alt Phone</label>
                                    <input value={newEnquiry.alt_phone} onChange={e => setNewEnquiry({...newEnquiry, alt_phone: e.target.value})} className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-2.5 text-sm font-mono text-supabase-text focus:border-supabase-green outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase">Source</label>
                                    <select value={newEnquiry.source} onChange={e => setNewEnquiry({...newEnquiry, source: e.target.value as any})} className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-2.5 text-xs text-supabase-text font-bold"><option value="Walk-in">Walk-in</option><option value="Web">Web</option><option value="Referral">Referral</option><option value="Social Media">Social Media</option></select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase">Intensity</label>
                                    <select value={newEnquiry.temp} onChange={e => setNewEnquiry({...newEnquiry, temp: e.target.value as any})} className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-2.5 text-xs text-supabase-text font-bold"><option value="Cold">Cold</option><option value="Warm">Warm</option><option value="Hot">Hot</option></select>
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-supabase-green text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-supabase-greenHover disabled:opacity-50 transition-all">{isSubmitting ? 'Syncing...' : 'Commit Registry'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-supabase-panel border border-supabase-border rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
                        <div className="px-10 py-6 border-b border-supabase-border bg-supabase-sidebar shrink-0 flex justify-between items-center">
                            <h2 className="text-base font-black text-supabase-text uppercase tracking-[0.25em]">Batch Ingestion</h2>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-supabase-muted hover:text-supabase-text"><X size={24} /></button>
                        </div>
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-8 gap-8">
                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between mb-4"><span className="text-[10px] font-black uppercase text-supabase-muted">Payload Matrix</span></div>
                                <textarea autoFocus value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="Paste data array..." className="flex-1 bg-supabase-bg border border-supabase-border rounded-2xl p-6 text-xs font-mono text-supabase-text outline-none resize-none" />
                            </div>
                            <div className="w-80 space-y-6">
                                <button onClick={handleDownloadSampleCSV} className="w-full text-left px-4 py-3 bg-supabase-sidebar border border-supabase-border rounded-xl text-[10px] font-black uppercase text-supabase-muted hover:text-supabase-green transition-all flex items-center gap-2"><Download size={14}/> Template.csv</button>
                                <div onClick={() => fileInputRef.current?.click()} className="h-40 border-2 border-dashed border-supabase-border rounded-2xl flex flex-col items-center justify-center text-supabase-muted hover:border-supabase-green cursor-pointer"><UploadCloud size={32} /><span className="text-[9px] font-black uppercase mt-2">Upload CSV</span><input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} /></div>
                                <button onClick={handleBulkInsert} disabled={isSubmitting || !bulkData.trim()} className="w-full bg-supabase-green text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.25em] hover:bg-supabase-greenHover disabled:opacity-30 transition-all">{isSubmitting ? 'Syncing Cluster...' : 'Commit Batch'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Insight */}
            <div className="p-4 bg-supabase-panel border-t border-supabase-border flex items-center justify-between shrink-0 shadow-inner z-10">
                <div className="flex items-center gap-3 text-supabase-muted">
                    <CalendarClock size={14} className="text-supabase-green" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em]">Signal persistence active.</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /><span className="text-[9px] font-black text-supabase-muted uppercase">Hot: {leads.filter(l => l.temp === 'Hot').length}</span></div>
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[9px] font-black text-supabase-muted uppercase">Warm: {leads.filter(l => l.temp === 'Warm').length}</span></div>
                </div>
            </div>
        </div>
    );
};

export default EnquiryCallView;
