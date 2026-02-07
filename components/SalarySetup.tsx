
import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, TrendingUp, Save, Search, Loader2, Briefcase, CheckCircle2, AlertTriangle, History, Activity, Info, ArrowDownAZ, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface SalaryGrade {
    id: string;
    employee_name: string;
    designation: string;
    department: string;
    base_salary: number;
    allowances: number;
    grade_name?: string;
    grade_min?: number;
    grade_max?: number;
    is_modified?: boolean;
}

const SalarySetup: React.FC = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState<SalaryGrade[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Increment tool state
    const [incrementValue, setIncrementValue] = useState<number>(0);
    const [incrementType, setIncrementType] = useState<'percent' | 'flat'>('percent');
    const [incrementTarget, setIncrementTarget] = useState<'all' | 'Academic' | 'Administration'>('all');

    const fetchSalaries = async () => {
        setIsLoading(true);
        try {
            if (supabase) {
                // Fetch employees joined with their assigned grades (mocking the join logic)
                const { data, error } = await supabase
                    .from('employees')
                    .select('id, full_name, department, designation, base_salary, allowances');
                
                if (error) throw error;

                // For demonstration, we map some grades locally based on designation
                // In production, this would be a SQL join with a 'salary_grades' table
                const grades: SalaryGrade[] = (data || []).map(emp => {
                    let gName = "Standard Grade";
                    let min = 2800, max = 4000;
                    
                    if (emp.designation?.includes('Senior') || emp.designation?.includes('Lead')) {
                        gName = "Senior Grade (T4)";
                        min = 4500; max = 6500;
                    } else if (emp.designation?.includes('Director') || emp.designation?.includes('Manager')) {
                        gName = "Management Grade (M1)";
                        min = 6000; max = 9500;
                    }

                    return {
                        id: emp.id,
                        employee_name: emp.full_name,
                        designation: emp.designation || 'Staff',
                        department: emp.department || 'Unassigned',
                        base_salary: emp.base_salary || min + 200,
                        allowances: emp.allowances || 250,
                        grade_name: gName,
                        grade_min: min,
                        grade_max: max,
                        is_modified: false
                    };
                });
                setEmployees(grades);
            }
        } catch (e: any) {
            showToast("Sync Error: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, []);

    const filteredEmployees = employees.filter(e => 
        e.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApplyIncrement = () => {
        if (incrementValue === 0) {
            showToast("Specify an increment value first.", "error");
            return;
        }
        
        let targetCount = 0;
        const updated = employees.map(emp => {
            const isMatch = incrementTarget === 'all' || emp.department === incrementTarget;
            if (!isMatch) return emp;
            
            targetCount++;
            let newBase = emp.base_salary;
            if (incrementType === 'percent') {
                newBase *= (1 + incrementValue / 100);
            } else {
                newBase += incrementValue;
            }

            return { ...emp, base_salary: Math.round(newBase), is_modified: true };
        });

        setEmployees(updated);
        showToast(`Applied ${incrementType === 'percent' ? incrementValue + '%' : '$' + incrementValue} to ${targetCount} records.`, "success");
        setIncrementValue(0);
    };

    const handleAlignToMidpoint = () => {
        const updated = employees.map(emp => {
            if (emp.grade_min && emp.grade_max) {
                const mid = (emp.grade_min + emp.grade_max) / 2;
                if (emp.base_salary !== mid) {
                    return { ...emp, base_salary: Math.round(mid), is_modified: true };
                }
            }
            return emp;
        });
        setEmployees(updated);
        showToast("Organizational parity alignment complete.", "info");
    };

    const handleSaveStructure = async () => {
        const modifiedOnes = employees.filter(e => e.is_modified);
        if (modifiedOnes.length === 0) return;

        setIsSaving(true);
        try {
            if (supabase) {
                for (const emp of modifiedOnes) {
                    await supabase.from('employees').update({ 
                        base_salary: emp.base_salary,
                        allowances: emp.allowances 
                    }).eq('id', emp.id);
                }
                setEmployees(prev => prev.map(e => ({ ...e, is_modified: false })));
                showToast(`Persisted ${modifiedOnes.length} changes.`, "success");
            }
        } catch (e: any) {
            showToast("Commit failed: " + e.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const getComplianceStatus = (emp: SalaryGrade) => {
        if (!emp.grade_min || !emp.grade_max) return { label: 'No Scale', color: 'text-supabase-muted', icon: Info };
        if (emp.base_salary < emp.grade_min) return { label: 'Under Scale', color: 'text-red-400', icon: AlertTriangle };
        if (emp.base_salary > emp.grade_max) return { label: 'Over Scale', color: 'text-yellow-500', icon: TrendingUp };
        return { label: 'Compliant', color: 'text-supabase-green', icon: CheckCircle2 };
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-supabase-bg">
                <Activity className="animate-spin text-supabase-green mb-4" size={32} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-supabase-muted">Syncing Grade Mappings...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-supabase-bg font-sans animate-in fade-in duration-500">
            <div className="h-20 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-supabase-green/10 rounded-xl text-supabase-green border border-supabase-green/20 shadow-inner">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-supabase-text uppercase tracking-widest leading-none">Salary Structure</h1>
                        <p className="text-[10px] text-supabase-muted mt-1 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={12} className="text-supabase-green" /> 
                            Grade Matrix & Personnel Alignment
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" />
                        <input 
                            type="text" 
                            placeholder="Find record..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-4 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-48 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleAlignToMidpoint}
                        className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all"
                        title="Align all to Grade Midpoints"
                    >
                        <ArrowDownAZ size={18} />
                    </button>
                    <button 
                        onClick={handleSaveStructure}
                        disabled={isSaving || !employees.some(e => e.is_modified)}
                        className="bg-supabase-green text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 flex items-center gap-2 disabled:opacity-30"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Commit Matrix
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
                    
                    <div className="bg-supabase-panel border border-supabase-border rounded-[2rem] p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-supabase-green/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        
                        <div className="flex flex-col lg:flex-row items-center gap-10">
                            <div className="space-y-2 max-w-sm">
                                <h2 className="text-2xl font-black text-supabase-text tracking-tighter uppercase leading-none">Mass Adjustment</h2>
                                <p className="text-xs text-supabase-muted leading-relaxed">Modify base compensation across specific mappings. All adjustments are validated against the Pay Scale Registry.</p>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-supabase-muted tracking-widest px-1">Target Cluster</label>
                                    <select 
                                        value={incrementTarget}
                                        onChange={(e) => setIncrementTarget(e.target.value as any)}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-xs text-supabase-text font-bold uppercase tracking-widest focus:border-supabase-green outline-none"
                                    >
                                        <option value="all">Entire Matrix</option>
                                        <option value="Academic">Academic Faculty</option>
                                        <option value="Administration">Administration Staff</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-supabase-muted tracking-widest px-1">Adjustment Delta</label>
                                    <div className="flex">
                                        <input 
                                            type="number"
                                            value={incrementValue}
                                            onChange={(e) => setIncrementValue(parseFloat(e.target.value) || 0)}
                                            className="flex-1 bg-supabase-sidebar border border-supabase-border rounded-l-xl px-4 py-3 text-sm text-supabase-text font-mono focus:border-supabase-green outline-none"
                                            placeholder="Value..."
                                        />
                                        <button 
                                            onClick={() => setIncrementType(incrementType === 'percent' ? 'flat' : 'percent')}
                                            className="px-4 bg-supabase-bg border border-supabase-border border-l-0 rounded-r-xl text-[10px] font-black uppercase text-supabase-muted hover:text-supabase-green transition-all"
                                        >
                                            {incrementType === 'percent' ? '%' : 'USD'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-end">
                                    <button 
                                        onClick={handleApplyIncrement}
                                        className="w-full bg-supabase-green/10 text-supabase-green border border-supabase-green/30 rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-green hover:text-black transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        Execute Batch Change
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-supabase-panel border border-supabase-border rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-supabase-sidebar/50 text-[10px] font-black uppercase tracking-[0.25em] text-supabase-muted border-b border-supabase-border">
                                    <th className="px-8 py-6">Employee Mapping</th>
                                    <th className="px-8 py-6">Scale Designation</th>
                                    <th className="px-8 py-6">Base Rate ($)</th>
                                    <th className="px-8 py-6">Grade Bound Valid</th>
                                    <th className="px-8 py-6 text-right">Compliance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-supabase-border/40">
                                {filteredEmployees.map(emp => {
                                    const status = getComplianceStatus(emp);
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={emp.id} className="hover:bg-supabase-hover/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl bg-supabase-sidebar border flex items-center justify-center text-supabase-muted font-black text-sm transition-all ${emp.is_modified ? 'border-supabase-green' : 'border-supabase-border'}`}>
                                                        {emp.employee_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-supabase-text uppercase tracking-tighter">{emp.employee_name}</div>
                                                        <div className="text-[9px] font-bold text-supabase-muted uppercase tracking-widest mt-1">{emp.designation}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-supabase-muted tracking-widest">
                                                    <ShieldCheck size={12} className="text-supabase-green" /> {emp.grade_name}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign size={14} className="text-supabase-muted" />
                                                    <input 
                                                        type="number"
                                                        value={emp.base_salary}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setEmployees(prev => prev.map(p => p.id === emp.id ? {...p, base_salary: val, is_modified: true} : p));
                                                        }}
                                                        className={`bg-transparent text-sm font-bold font-mono w-24 border-b border-transparent focus:border-supabase-green focus:outline-none transition-all ${emp.is_modified ? 'text-supabase-green' : 'text-supabase-text'}`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="w-full h-1 bg-supabase-sidebar rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${status.color.replace('text-', 'bg-')} opacity-50`} 
                                                            style={{ width: `${Math.min(100, Math.max(0, ((emp.base_salary - (emp.grade_min||0)) / ((emp.grade_max||1) - (emp.grade_min||0))) * 100))}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[8px] font-mono text-supabase-muted uppercase tracking-tighter">Range: ${emp.grade_min} — ${emp.grade_max}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${status.color}`}>{status.label}</span>
                                                    <StatusIcon size={16} className={status.color} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalarySetup;
