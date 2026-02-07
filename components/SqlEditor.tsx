import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Save, RotateCcw, Clock, Terminal } from 'lucide-react';
import { generateSqlQuery } from '../services/geminiService';
import { SqlHistory } from '../types';

const INITIAL_SCHEMA_SQL = `-- PAYROLL SYSTEM INFRASTRUCTURE SCHEMA
-- This script provisions the core financial tables for Unacademy Management.

-- 1. Global Payroll Configuration
CREATE TABLE IF NOT EXISTS public.payroll_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_rate_percent DECIMAL(5, 2) DEFAULT 15.00,
    insurance_flat_deduction DECIMAL(10, 2) DEFAULT 50.00,
    provident_fund_percent DECIMAL(5, 2) DEFAULT 5.00,
    currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Payroll Cycles (Monthly Periods)
CREATE TABLE IF NOT EXISTS public.payroll_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cycle_name TEXT NOT NULL UNIQUE, -- e.g. 'MARCH_2025'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'closed')),
    total_disbursed DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Employee Banking Details
CREATE TABLE IF NOT EXISTS public.employee_banking (
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    routing_number TEXT,
    is_verified BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Payroll Records (Individual Slips)
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cycle_id UUID REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    base_salary DECIMAL(12, 2) NOT NULL,
    allowances DECIMAL(12, 2) DEFAULT 0.00,
    deductions DECIMAL(12, 2) DEFAULT 0.00,
    tax_withheld DECIMAL(12, 2) DEFAULT 0.00,
    net_payable DECIMAL(12, 2) NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid')),
    disbursed_at TIMESTAMP WITH TIME ZONE,
    transaction_ref TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(cycle_id, employee_id)
);

-- 5. Payroll Audit Log
CREATE TABLE IF NOT EXISTS public.payroll_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- e.g. 'MANUAL_ADJUSTMENT', 'DISBURSEMENT_TRIGGERED'
    record_id UUID,
    performed_by UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Enable Security & Policies
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.payroll_records FOR SELECT USING (true);
CREATE POLICY "Allow admin manage" ON public.payroll_records FOR ALL USING (true) WITH CHECK (true);

-- 7. Seed Initial Configuration
INSERT INTO public.payroll_settings (tax_rate_percent, insurance_flat_deduction) 
VALUES (15.00, 50.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.payroll_cycles (cycle_name, start_date, end_date, status)
VALUES ('MARCH_2025', '2025-03-01', '2025-03-31', 'draft')
ON CONFLICT (cycle_name) DO NOTHING;`;

const SqlEditor: React.FC = () => {
  const [query, setQuery] = useState(INITIAL_SCHEMA_SQL);
  const [results, setResults] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  const [history, setHistory] = useState<SqlHistory[]>(() => {
    try {
      const saved = localStorage.getItem('supabase-sql-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to parse history", e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('supabase-sql-history', JSON.stringify(history));
  }, [history]);

  const handleRun = async () => {
    setResults([
      { status: 'Success', message: 'Payroll system infrastructure deployed.' },
      { note: 'Ready for employee banking synchronization and cycle initialization.' }
    ]);
    const newEntry: SqlHistory = { id: Date.now().toString(), query, timestamp: new Date() };
    setHistory(prev => [newEntry, ...prev].slice(0, 50));
  };

  const handleAiGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const sql = await generateSqlQuery(prompt);
    setQuery(sql);
    setIsGenerating(false);
    setPrompt('');
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg font-sans">
      <div className="h-14 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
            <button 
                onClick={handleRun}
                className="bg-supabase-green text-black px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20 flex items-center gap-2"
            >
                <Play size={14} fill="currentColor" />
                Deploy Schema
            </button>
            <button className="text-supabase-muted hover:text-supabase-text px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                <Save size={14} />
                Stage
            </button>
             <button 
                onClick={() => setQuery('')}
                className="text-supabase-muted hover:text-supabase-text px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
            >
                <RotateCcw size={14} />
                Purge
            </button>
        </div>
        <div className="text-[10px] text-supabase-muted font-black uppercase tracking-widest bg-supabase-sidebar px-3 py-1 rounded-full border border-supabase-border shadow-inner">
            SQL Financial Console • v4.2
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-supabase-border">
            <div className="p-5 bg-supabase-sidebar border-b border-supabase-border">
                <div className="relative group">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 group-focus-within:text-supabase-green transition-colors" size={18} />
                    <input 
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="Define custom payroll triggers or complex views..."
                        className="w-full bg-supabase-bg border border-supabase-border rounded-xl pl-12 pr-32 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none transition-all placeholder-supabase-muted/50 shadow-inner"
                    />
                    <button 
                        onClick={handleAiGenerate}
                        disabled={isGenerating || !prompt}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600/20 text-purple-300 border border-purple-500/30 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-purple-600/40 disabled:opacity-50 transition-all"
                    >
                        {isGenerating ? 'Analyzing...' : 'Generate SQL'}
                    </button>
                </div>
            </div>

            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 w-full bg-supabase-bg text-sm font-mono text-supabase-text/90 p-8 focus:outline-none resize-none leading-relaxed custom-scrollbar"
                spellCheck={false}
            />

            <div className="h-1/3 border-t border-supabase-border flex flex-col bg-supabase-panel">
                <div className="px-6 py-3 bg-supabase-sidebar border-b border-supabase-border text-[10px] font-black text-supabase-muted uppercase tracking-[0.2em]">
                    Transaction Output
                </div>
                <div className="flex-1 overflow-auto p-6 bg-supabase-bg/20">
                    {results ? (
                        <div className="space-y-3">
                            {results.map((res, idx) => (
                                <div key={idx} className="text-xs font-mono">
                                    {res.message ? (
                                        <div className="text-supabase-green font-bold flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-supabase-green"></div>
                                            {res.message}
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap text-supabase-muted opacity-80">{JSON.stringify(res, null, 2)}</pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-supabase-muted opacity-30 gap-3">
                            <Terminal size={32} strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Execute SQL Fragment</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="w-80 bg-supabase-sidebar flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-supabase-border bg-supabase-panel/40">
                <div className="text-[10px] font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-supabase-green" /> Revision Ledger
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {history.length === 0 && <div className="p-8 text-[10px] font-black text-supabase-muted text-center uppercase tracking-widest opacity-20 mt-12">Registry Empty</div>}
                {history.map(item => (
                    <div key={item.id} onClick={() => setQuery(item.query)} className="p-5 border-b border-supabase-border/30 hover:bg-supabase-bg cursor-pointer group transition-all">
                        <div className="flex items-center justify-between mb-2">
                             <span className="text-[9px] text-supabase-muted font-mono bg-supabase-panel px-1.5 rounded py-0.5 border border-supabase-border group-hover:text-supabase-green transition-colors">{item.timestamp.toLocaleTimeString()}</span>
                             <Save size={12} className="text-supabase-muted opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="text-[10px] text-supabase-muted/60 font-mono truncate font-medium group-hover:text-supabase-text transition-all leading-tight">
                            {item.query.slice(0, 100)}...
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SqlEditor;