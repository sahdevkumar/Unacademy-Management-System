import React, { useState, useEffect } from 'react';
import { Scale, Plus, Search, MoreVertical, Save, Trash2, ShieldCheck, AlertCircle, TrendingUp, Layers, Activity, Loader2, Users, X, Info, ChevronRight, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface PayScale {
    id: string;
    grade_name: string;
    min_salary: number;
    mid_salary: number;
    max_salary: number;
    employee_count: number;
    department_mapping: string[];
}

interface AssignedEmployee {
    id: string;
    name: string;
    current_salary: number;
}

const BaseSalaryRegistry: React.FC = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [scales, setScales] = useState<PayScale[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Audit view state
    const [auditScaleId, setAuditScaleId] = useState<string | null>(null);
    const [assignedStaff, setAssignedStaff] = useState<AssignedEmployee[]>([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        grade_name: '',
        min_salary: 3000,
        max_salary: 5000,
        department_mapping: ['Academic']
    });

    const fetchRegistry = async () => {
        setIsLoading(true);
        try {
            const mockScales: PayScale[] = [
                { id: '1', grade_name: 'Grade T1 (Entry Faculty)', min_salary: 2800, mid_salary: 3200, max_salary: 3600, employee_count: 14, department_mapping: ['Academic'] },
                { id: '2', grade_name: 'Grade T4 (Senior Faculty)', min_salary: 4500, mid_salary: 5200, max_salary: 6000, employee_count: 8, department_mapping: ['Academic'] },
                { id: '3', grade_name: 'Grade A2 (Junior Admin)', min_salary: 3000, mid_salary: 3500, max_salary: 4000, employee_count: 22, department_mapping: ['Administration', 'Human Resources'] },
                { id: '4', grade_name: 'Grade M1 (Operational Lead)', min_salary: 6000, mid_salary: 7500, max_salary: 9000, employee_count: 5, department_mapping: ['Administration', 'IT Support'] },
            ];
            await new Promise(r => setTimeout(r, 800));
            setScales(mockScales);
        } catch (e: any) {
            showToast("Sync Error: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistry();
    }, []);

    const fetchAssignedEmployees = async (scaleId: string) => {
        // Mocking staff fetch based on scale
        setAssignedStaff([
            { id: 'e1', name: 'John Peterson', current_salary: 3200 },
            { id: 'e2', name: 'Sarah Miller', current_salary: 3450 },
            { id: 'e3', name: 'David Chen', current_salary: 2900 }
        ]);
        setAuditScaleId(scaleId);
    };

    const handleUpdateScale = (id: string, field: 'min_salary' | 'max_salary', value: number) => {
        setScales(prev => prev.map(s => {
            if (s.id !== id) return s;
            const updated = { ...s, [field]: value };
            updated.mid_salary = (updated.min_salary + updated.max_salary) / 2;
            return updated;
        }));
    };

    const filteredScales = scales.filter(s => 
        s.grade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department_mapping.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const persistRegistry = async () => {
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 1200));
        setIsSaving(false);
        showToast("System-wide band matrix synchronized.", "success");
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-supabase-bg">
                <Activity className="animate-spin text-supabase-green mb-4" size={32} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-supabase-muted">Auditing Band Matrix...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-supabase-bg font-sans animate-in fade-in duration-500">
            <div className="h-20 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-supabase-green/10 rounded-xl text-supabase-green border border-supabase-green/20 shadow-inner">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-supabase-text uppercase tracking-widest leading-none">Base Scale Registry</h1>
                        <p className="text-[10px] text-supabase-muted mt-1 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={12} className="text-supabase-green" /> 
                            Fiscal Protocol & Band Definitions
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" />
                        <input 
                            type="text" 
                            placeholder="Filter registry..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-4 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-48 transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all"
                    >
                        <Plus size={18}/>
                    </button>
                    <button 
                        onClick={persistRegistry}
                        disabled={isSaving}
                        className="bg-supabase-green text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all shadow-lg flex items-center gap-2 disabled:opacity-30"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Sync Registry
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm group">
                            <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                <TrendingUp size={12} className="text-supabase-green" /> Market Parity
                            </p>
                            <div className="text-3xl font-black text-supabase-text tracking-tighter uppercase">94.2%</div>
                            <p className="text-[9px] text-supabase-muted mt-2">Scale midpoints are within 5% of regional benchmarks.</p>
                        </div>
                        <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm group">
                            <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Layers size={12} className="text-blue-400" /> Grade Count
                            </p>
                            <div className="text-3xl font-black text-supabase-text tracking-tighter uppercase">{scales.length} Tiers</div>
                            <p className="text-[9px] text-supabase-muted mt-2">Active mappings across 4 organizational units.</p>
                        </div>
                        <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm group">
                            <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Users size={12} className="text-purple-400" /> Enrolled
                            </p>
                            <div className="text-3xl font-black text-supabase-text tracking-tighter uppercase">{scales.reduce((a,b) => a+b.employee_count, 0)} Staff</div>
                            <p className="text-[9px] text-supabase-muted mt-2">Personnel mapped to verified compensation protocols.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em]">Compensation Matrix</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredScales.map(scale => {
                                const spread = ((scale.max_salary - scale.min_salary) / scale.min_salary) * 100;
                                return (
                                    <div key={scale.id} className="bg-supabase-panel border border-supabase-border rounded-2xl p-8 hover:border-supabase-green/30 transition-all group shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all flex gap-3 z-10">
                                            <button className="p-2 text-supabase-muted hover:text-supabase-green bg-supabase-sidebar border border-supabase-border rounded-lg"><MoreVertical size={14}/></button>
                                            <button className="p-2 text-supabase-muted hover:text-red-400 bg-supabase-sidebar border border-supabase-border rounded-lg"><Trash2 size={14}/></button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                            <div className="lg:col-span-3 space-y-2">
                                                <div className="text-sm font-black text-supabase-text uppercase tracking-tight group-hover:text-supabase-green transition-colors">{scale.grade_name}</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {scale.department_mapping.map(dept => (
                                                        <span key={dept} className="text-[9px] font-black uppercase bg-supabase-sidebar border border-supabase-border px-2 py-0.5 rounded text-supabase-muted">{dept}</span>
                                                    ))}
                                                </div>
                                                <div className="text-[10px] text-supabase-muted font-bold uppercase pt-2 flex items-center gap-2">
                                                    <Users size={12} /> {scale.employee_count} Personnel Linked
                                                </div>
                                            </div>

                                            <div className="lg:col-span-6 space-y-4">
                                                <div className="flex justify-between text-[10px] font-black text-supabase-muted uppercase tracking-widest">
                                                    <span>Min: ${scale.min_salary.toLocaleString()}</span>
                                                    <span className="text-supabase-text">Mid: ${scale.mid_salary.toLocaleString()}</span>
                                                    <span>Max: ${scale.max_salary.toLocaleString()}</span>
                                                </div>
                                                <div className="relative h-6 bg-supabase-sidebar rounded-lg border border-supabase-border p-1 group">
                                                    <div 
                                                        className="absolute inset-y-1 bg-supabase-green/20 border-x border-supabase-green/40 rounded shadow-[0_0_10px_rgba(62,207,142,0.1)]"
                                                        style={{ left: '5%', right: '5%' }}
                                                    ></div>
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-supabase-text opacity-30 shadow-[0_0_10px_white]"></div>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-supabase-muted">
                                                    <span>Band Spread: {spread.toFixed(1)}%</span>
                                                    <span className="text-supabase-green">Protocol Active</span>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-3 flex flex-col gap-2">
                                                <div className="p-4 bg-supabase-sidebar/50 border border-supabase-border rounded-xl space-y-1">
                                                    <div className="text-[8px] font-black text-supabase-muted uppercase tracking-widest leading-none mb-1">Standard Midpoint</div>
                                                    <div className="text-xl font-black text-supabase-text font-mono">${Math.round(scale.mid_salary).toLocaleString()}</div>
                                                </div>
                                                <button 
                                                    onClick={() => fetchAssignedEmployees(scale.id)}
                                                    className="w-full py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green/40 transition-all flex items-center justify-center gap-2"
                                                >
                                                    Audit Personnel Mapping <ChevronRight size={12}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Sidebar / Modal */}
            {auditScaleId && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md h-full bg-supabase-panel border-l border-supabase-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-supabase-green/10 rounded-lg text-supabase-green">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-supabase-text uppercase tracking-widest">Scale Mapping Audit</h3>
                                    <p className="text-[10px] text-supabase-muted font-mono uppercase mt-1">Verified Personnel Matrix</p>
                                </div>
                            </div>
                            <button onClick={() => setAuditScaleId(null)} className="p-2 text-supabase-muted hover:text-supabase-text transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {assignedStaff.map(staff => (
                                <div key={staff.id} className="p-4 bg-supabase-bg border border-supabase-border rounded-xl flex items-center justify-between group hover:border-supabase-green/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-supabase-muted font-black group-hover:text-supabase-green transition-colors">
                                            {staff.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-supabase-text uppercase tracking-tight">{staff.name}</div>
                                            <div className="text-[9px] font-bold text-supabase-muted uppercase tracking-widest">ID: {staff.id.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[8px] font-black text-supabase-muted uppercase tracking-widest mb-1">Current Base</div>
                                        <div className="text-xs font-black text-supabase-green font-mono">${staff.current_salary.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 border-t border-supabase-border bg-supabase-sidebar space-y-4">
                            <div className="flex items-start gap-4">
                                <Info size={16} className="text-supabase-green mt-0.5" />
                                <p className="text-[10px] text-supabase-muted italic leading-relaxed">Changes to this scale will affect all personnel listed above. Audit compliance before persisting Registry.</p>
                            </div>
                            <button className="w-full bg-supabase-green text-black py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all">Export Compliance Report</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Grade Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-supabase-panel border border-supabase-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col ring-1 ring-white/10">
                        <div className="px-8 py-5 border-b border-supabase-border bg-supabase-sidebar flex justify-between items-center shrink-0">
                            <h2 className="text-xs font-black text-supabase-text uppercase tracking-[0.3em]">Initialize Pay Scale</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text p-2"><X size={20} /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Grade Identification</label>
                                <input 
                                    type="text" 
                                    value={formData.grade_name}
                                    onChange={e => setFormData({...formData, grade_name: e.target.value})}
                                    placeholder="e.g., Grade T5 (Lead Researcher)"
                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Base Minimum ($)</label>
                                    <input 
                                        type="number" 
                                        value={formData.min_salary}
                                        onChange={e => setFormData({...formData, min_salary: parseInt(e.target.value) || 0})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm font-mono text-supabase-text focus:border-supabase-green outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Cap Maximum ($)</label>
                                    <input 
                                        type="number" 
                                        value={formData.max_salary}
                                        onChange={e => setFormData({...formData, max_salary: parseInt(e.target.value) || 0})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm font-mono text-supabase-text focus:border-supabase-green outline-none"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-supabase-green/5 border border-supabase-green/20 rounded-xl flex items-center gap-4">
                                <Info size={16} className="text-supabase-green" />
                                <span className="text-[10px] font-bold text-supabase-muted uppercase tracking-tighter">Midpoint calculated at: <span className="text-supabase-green">${((formData.min_salary + formData.max_salary)/2).toLocaleString()}</span></span>
                            </div>
                            <button 
                                onClick={() => {
                                    const newScale: PayScale = {
                                        id: Date.now().toString(),
                                        grade_name: formData.grade_name,
                                        min_salary: formData.min_salary,
                                        mid_salary: (formData.min_salary + formData.max_salary) / 2,
                                        max_salary: formData.max_salary,
                                        employee_count: 0,
                                        department_mapping: formData.department_mapping
                                    };
                                    setScales([...scales, newScale]);
                                    setIsModalOpen(false);
                                    showToast(`Registered ${formData.grade_name}`, "success");
                                }}
                                disabled={!formData.grade_name}
                                className="w-full bg-supabase-green text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.25em] hover:bg-supabase-greenHover transition-all shadow-xl shadow-supabase-green/10 disabled:opacity-30"
                            >
                                Register Protocol Grade
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BaseSalaryRegistry;