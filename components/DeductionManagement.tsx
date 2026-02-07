import React, { useState, useEffect } from 'react';
import { Percent, ShieldAlert, TrendingDown, Save, RotateCcw, Info, ArrowRight, Wallet, History, Sparkles, Activity } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface DeductionRule {
    tax_rate: number;
    pf_rate: number;
    insurance_flat: number;
    currency: string;
}

const DeductionManagement: React.FC = () => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<DeductionRule>({
        tax_rate: 15.0,
        pf_rate: 5.0,
        insurance_flat: 50.0,
        currency: 'USD'
    });

    useEffect(() => {
        const fetchRules = async () => {
            setIsLoading(true);
            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('payroll_settings')
                        .select('*')
                        .maybeSingle();
                    
                    if (data) {
                        setConfig({
                            tax_rate: data.tax_rate_percent,
                            pf_rate: data.provident_fund_percent || 5.0,
                            insurance_flat: data.insurance_flat_deduction,
                            currency: data.currency || 'USD'
                        });
                    }
                }
            } catch (e) {
                console.error("Rules fetch failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRules();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (supabase) {
                const { error } = await supabase
                    .from('payroll_settings')
                    .upsert({
                        tax_rate_percent: config.tax_rate,
                        provident_fund_percent: config.pf_rate,
                        insurance_flat_deduction: config.insurance_flat,
                        currency: config.currency,
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
                showToast("Global deduction matrix synchronized.", "success");
            }
        } catch (e: any) {
            showToast("Sync Error: " + e.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-supabase-bg">
                <Activity className="animate-spin text-supabase-green mb-4" size={32} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-supabase-muted">Querying Financial Cluster...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-supabase-bg font-sans animate-in fade-in duration-500">
            <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-supabase-green/10 rounded-xl text-supabase-green border border-supabase-green/20 shadow-inner">
                        <Percent size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-supabase-text uppercase tracking-widest leading-none">Deduction Rules</h1>
                        <p className="text-[10px] text-supabase-muted mt-1 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert size={12} className="text-supabase-green" /> 
                            Fiscal Protocol Control • System Cluster
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setConfig({ tax_rate: 15.0, pf_rate: 5.0, insurance_flat: 50.0, currency: 'USD' })}
                        className="p-2 text-supabase-muted hover:text-supabase-text transition-all"
                        title="Reset to Baseline"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-supabase-green text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 flex items-center gap-2 disabled:opacity-30"
                    >
                        {isSaving ? <Activity className="animate-spin" size={14} /> : <Save size={14} />}
                        Sync Schema
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-5xl mx-auto space-y-8 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Core Tax Rules */}
                        <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-8 space-y-8 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-supabase-green/5 rounded-full -mr-16 -mt-16 group-hover:bg-supabase-green/10 transition-all"></div>
                            
                            <h3 className="text-xs font-black text-supabase-text uppercase tracking-[0.25em] flex items-center gap-3">
                                <Wallet size={16} className="text-supabase-green" /> 
                                Statutory Offsets
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-supabase-muted tracking-widest">
                                        <span>Income Tax (WHT)</span>
                                        <span className="text-supabase-green">{config.tax_rate}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="50" 
                                        step="0.5"
                                        value={config.tax_rate}
                                        onChange={(e) => setConfig({...config, tax_rate: parseFloat(e.target.value)})}
                                        className="w-full accent-supabase-green bg-supabase-sidebar h-2 rounded-full appearance-none cursor-pointer"
                                    />
                                    <p className="text-[9px] text-supabase-muted italic">Applied to Gross Income before any optional benefits.</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-supabase-muted tracking-widest">
                                        <span>Provident Fund (PF)</span>
                                        <span className="text-supabase-green">{config.pf_rate}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="20" 
                                        step="0.5"
                                        value={config.pf_rate}
                                        onChange={(e) => setConfig({...config, pf_rate: parseFloat(e.target.value)})}
                                        className="w-full accent-supabase-green bg-supabase-sidebar h-2 rounded-full appearance-none cursor-pointer"
                                    />
                                    <p className="text-[9px] text-supabase-muted italic">Employer-matching contribution deducted from Net.</p>
                                </div>
                            </div>
                        </div>

                        {/* Flat Deductions */}
                        <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-8 space-y-8 shadow-xl">
                            <h3 className="text-xs font-black text-supabase-text uppercase tracking-[0.25em] flex items-center gap-3">
                                <TrendingDown size={16} className="text-supabase-green" /> 
                                Fixed Overhead Offsets
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-supabase-muted tracking-widest block">Insurance Flat Rate</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green font-mono text-xs">{config.currency}</div>
                                        <input 
                                            type="number" 
                                            value={config.insurance_flat}
                                            onChange={(e) => setConfig({...config, insurance_flat: parseFloat(e.target.value) || 0})}
                                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl pl-12 pr-4 py-3 text-sm text-supabase-text font-mono focus:border-supabase-green outline-none transition-all shadow-inner"
                                        />
                                    </div>
                                    <p className="text-[9px] text-supabase-muted">Deducted per cycle for medical coverage protocol.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-supabase-muted tracking-widest block">Operational Currency</label>
                                    <select 
                                        value={config.currency}
                                        onChange={(e) => setConfig({...config, currency: e.target.value})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text font-black uppercase tracking-widest focus:border-supabase-green outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="USD">USD - United States Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="INR">INR - Indian Rupee</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Impact Analysis */}
                    <div className="bg-supabase-panel border border-supabase-border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Sparkles size={120} className="text-supabase-green" />
                        </div>
                        
                        <div className="max-w-2xl space-y-6">
                            <h2 className="text-3xl font-black text-supabase-text tracking-tighter uppercase">Fiscal Impact Simulation</h2>
                            <p className="text-sm text-supabase-muted leading-relaxed">
                                Changing the global deduction matrix affects all <strong>unprocessed</strong> payroll records in the current cycle. 
                                Based on a median employee salary of <span className="text-supabase-text font-black font-mono">$4,200.00</span>:
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                                <div className="p-6 bg-supabase-sidebar border border-supabase-border rounded-2xl shadow-inner group hover:border-supabase-green/30 transition-all">
                                    <div className="text-[9px] font-black text-supabase-muted uppercase tracking-[0.2em] mb-2">Total Deduction</div>
                                    <div className="text-2xl font-black text-red-400 font-mono tracking-tighter">
                                        -${( (4200 * (config.tax_rate/100)) + (4200 * (config.pf_rate/100)) + config.insurance_flat ).toFixed(2)}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-center opacity-30">
                                    <ArrowRight size={24} />
                                </div>

                                <div className="p-6 bg-supabase-green/[0.03] border border-supabase-green/30 rounded-2xl shadow-lg shadow-supabase-green/5 group hover:bg-supabase-green/5 transition-all">
                                    <div className="text-[9px] font-black text-supabase-green uppercase tracking-[0.2em] mb-2">Net Estimated</div>
                                    <div className="text-2xl font-black text-supabase-green font-mono tracking-tighter">
                                        ${( 4200 - ( (4200 * (config.tax_rate/100)) + (4200 * (config.pf_rate/100)) + config.insurance_flat ) ).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Audit Trail */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em] flex items-center gap-2">
                                <History size={14} /> Rule Modification Ledger
                            </h3>
                            <button className="text-[10px] font-black text-supabase-green uppercase hover:underline">Export Logs</button>
                        </div>
                        
                        <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden divide-y divide-supabase-border/50">
                            {[
                                { user: 'System Admin', action: 'Increased Tax Rate to 15%', date: '2 hours ago' },
                                { user: 'Finance Lead', action: 'Adjusted PF Contribution Threshold', date: 'Yesterday' },
                                { user: 'Global Root', action: 'Schema Provisioning - Payroll v4.2', date: '3 days ago' }
                            ].map((log, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between group hover:bg-supabase-hover/40 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-[10px] font-bold text-supabase-muted group-hover:text-supabase-green transition-colors">
                                            {log.user.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-supabase-text">{log.action}</div>
                                            <div className="text-[9px] text-supabase-muted uppercase font-black tracking-widest opacity-60">Performed by {log.user}</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-bold text-supabase-muted italic">{log.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-supabase-panel/40 border border-supabase-border border-dashed rounded-3xl flex items-start gap-4 text-supabase-muted italic shadow-inner">
                        <Info size={20} className="text-supabase-green mt-0.5 shrink-0 opacity-50" />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-supabase-text not-italic">Infrastructure Handshake</p>
                            <p className="text-xs leading-relaxed opacity-60">
                                These rules are enforced at the database level using Postgres Constraints. Any manual modification to the <strong>payroll_records</strong> table will trigger an audit mismatch if the net payable deviates from the current ruleset.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeductionManagement;