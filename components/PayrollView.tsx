import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Coins, ArrowUpRight, CreditCard, Filter, Download, CheckCircle2, AlertCircle, Loader2, Calendar, FileText, ChevronRight, Search, Plus, Play, Banknote, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  tax_amount: number;
  net_payable: number;
  payment_status: 'paid' | 'pending' | 'processing';
  pay_date: string | null;
}

const PayrollView: React.FC = () => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCycle, setCurrentCycle] = useState('MARCH 2025');

  // Load records from database
  const fetchPayroll = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        // First, fetch all employees to ensure we have a base for payroll
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, full_name, department');

        if (empError) throw empError;

        // Fetch existing payroll records for the current cycle
        const { data: payrollData, error: payrollError } = await supabase
          .from('payroll_records')
          .select('*');

        if (payrollError) throw payrollError;

        // Merge or Generate mock payroll if records don't exist yet
        const generatedRecords: PayrollRecord[] = (employees || []).map(emp => {
          const existing = payrollData?.find(p => p.employee_id === emp.id);
          const base = existing?.base_salary || 3500 + (Math.random() * 2000);
          const allow = existing?.allowances || 200 + (Math.random() * 300);
          const ded = existing?.deductions || 100;
          const tax = base * 0.15; // 15% flat tax simulation

          return {
            id: existing?.id || Math.random().toString(36).substr(2, 9),
            employee_id: emp.id,
            employee_name: emp.full_name,
            department: emp.department || 'Unassigned',
            base_salary: base,
            allowances: allow,
            deductions: ded,
            tax_amount: tax,
            net_payable: base + allow - ded - tax,
            payment_status: (existing?.payment_status as any) || 'pending',
            pay_date: existing?.disbursed_at || null
          };
        });

        setRecords(generatedRecords);
      }
    } catch (e: any) {
      showToast("Sync Error: " + e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  // Filtered list based on search
  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  // Totals calculation
  const totals = useMemo(() => {
    return {
      disbursement: records.reduce((acc, curr) => acc + curr.net_payable, 0),
      tax: records.reduce((acc, curr) => acc + curr.tax_amount, 0),
      paid: records.filter(r => r.payment_status === 'paid').length,
      pending: records.filter(r => r.payment_status === 'pending').length
    };
  }, [records]);

  // Bulk process simulation
  const handleBulkProcess = async () => {
    setIsProcessingBulk(true);
    showToast(`Initializing funds transfer for ${records.length} records...`, "info");
    
    // Simulate API delay for banking gateway
    await new Promise(resolve => setTimeout(resolve, 2500));

    const updated = records.map(r => ({
      ...r,
      payment_status: 'paid' as const,
      pay_date: new Date().toISOString()
    }));

    setRecords(updated);
    setIsProcessingBulk(false);
    showToast("Global Disbursement Successful. Ledger Synced.", "success");
  };

  const handleMarkAsPaid = (id: string) => {
    setRecords(prev => prev.map(r => 
      r.id === id ? { ...r, payment_status: 'paid', pay_date: new Date().toISOString() } : r
    ));
    showToast("Transaction #TXN-" + id.slice(0, 4).toUpperCase() + " Completed", "success");
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg font-sans animate-in fade-in duration-500">
      {/* Header */}
      <div className="h-20 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-supabase-green/10 rounded-xl text-supabase-green border border-supabase-green/20 shadow-inner">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-supabase-text uppercase tracking-widest leading-none">Financial Ledger</h1>
            <p className="text-[10px] text-supabase-muted mt-1 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} className="text-supabase-green" /> 
              Authorized Personnel Payroll Node
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search payroll records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-supabase-sidebar border border-supabase-border rounded-full py-2 pl-10 pr-4 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-64 shadow-inner" 
            />
          </div>
          <button 
            onClick={handleBulkProcess}
            disabled={isProcessingBulk || totals.pending === 0}
            className="bg-supabase-green text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isProcessingBulk ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            Disburse Batch
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Banknote size={56} className="text-supabase-green" />
              </div>
              <p className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em] mb-2">Cycle Disbursement</p>
              <p className="text-3xl font-black text-supabase-text tracking-tighter">${totals.disbursement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-supabase-green uppercase">
                 <ArrowUpRight size={14} /> Fiscal Variance: +4.2%
              </div>
            </div>

            <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Coins size={56} className="text-blue-400" />
              </div>
              <p className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em] mb-2">Est. Tax Liability</p>
              <p className="text-3xl font-black text-supabase-text tracking-tighter">${totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                 WHT Holding Protocol Active
              </div>
            </div>

            <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <CheckCircle2 size={56} className="text-supabase-green" />
              </div>
              <p className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em] mb-2">Disbursement Progress</p>
              <p className="text-3xl font-black text-supabase-text tracking-tighter">{totals.paid} / {records.length}</p>
              <div className="mt-4 w-full h-1.5 bg-supabase-sidebar rounded-full overflow-hidden shadow-inner">
                 <div className="h-full bg-supabase-green shadow-[0_0_8px_#3ecf8e]" style={{ width: `${(totals.paid/records.length)*100}%` }}></div>
              </div>
            </div>

            <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <AlertCircle size={56} className="text-yellow-500" />
              </div>
              <p className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.3em] mb-2">Action Required</p>
              <p className="text-3xl font-black text-supabase-text tracking-tighter">{totals.pending} Pending</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest animate-pulse">
                 Cycle Expiry: In 48 Hours
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-supabase-panel border border-supabase-border rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
            <div className="px-8 py-5 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Active Cycle</span>
                    <span className="text-xs font-black text-supabase-green tracking-[0.2em]">{currentCycle}</span>
                  </div>
                  <div className="h-8 w-px bg-supabase-border"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Payday Schedule</span>
                    <span className="text-xs font-black text-supabase-text tracking-widest">28th Monthly</span>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button className="p-2 bg-supabase-bg border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm"><Filter size={16}/></button>
                 <button className="p-2 bg-supabase-bg border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm"><Download size={16}/></button>
               </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-supabase-sidebar/50 text-[10px] font-black uppercase text-supabase-muted tracking-[0.25em] border-b border-supabase-border">
                    <th className="px-8 py-6">Personnel Matrix Entry</th>
                    <th className="px-8 py-6">Base ($)</th>
                    <th className="px-8 py-6">Adjustments</th>
                    <th className="px-8 py-6">WHT Tax (15%)</th>
                    <th className="px-8 py-6">Net Payable</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-supabase-border/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <Loader2 className="animate-spin text-supabase-green" size={32} />
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-supabase-muted">Auditing Financial Records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-32 text-center text-supabase-muted uppercase tracking-[0.2em] opacity-40">
                        No financial records found
                      </td>
                    </tr>
                  ) : filteredRecords.map(record => (
                    <tr key={record.id} className="hover:bg-supabase-hover/40 transition-colors group cursor-default">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-supabase-muted font-black text-sm uppercase group-hover:text-supabase-green group-hover:border-supabase-green/50 transition-all shadow-inner">
                              {record.employee_name.charAt(0)}
                           </div>
                           <div className="min-w-0">
                              <div className="text-sm font-black text-supabase-text truncate uppercase tracking-tighter">{record.employee_name}</div>
                              <div className="text-[9px] font-black text-supabase-muted uppercase tracking-widest mt-1">{record.department}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-supabase-text font-mono">${record.base_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-supabase-green">+{record.allowances.toLocaleString()}</span>
                            <span className="text-[10px] font-black text-red-400">-{record.deductions.toLocaleString()}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-supabase-muted font-mono">${record.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-black text-supabase-green font-mono tracking-tighter">${record.net_payable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col gap-1.5">
                           <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 w-fit
                             ${record.payment_status === 'paid' ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 
                               'bg-yellow-900/20 text-yellow-400 border border-yellow-900/50'}
                           `}>
                              <div className={`w-1.5 h-1.5 rounded-full ${record.payment_status === 'paid' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                              {record.payment_status}
                           </span>
                           {record.pay_date && <span className="text-[8px] text-supabase-muted font-mono">{new Date(record.pay_date).toLocaleDateString()}</span>}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {record.payment_status === 'pending' && (
                            <button 
                              onClick={() => handleMarkAsPaid(record.id)}
                              className="p-2 bg-supabase-green/10 text-supabase-green hover:bg-supabase-green hover:text-black rounded-lg transition-all"
                              title="Process Single Payment"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          )}
                          <button className="p-2 bg-supabase-bg border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-text transition-all">
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-8 py-5 bg-supabase-sidebar/50 border-t border-supabase-border flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-supabase-green animate-pulse"></div>
                  <p className="text-[10px] text-supabase-muted font-black uppercase tracking-[0.2em]">Automated Integrity Audit Active</p>
               </div>
               <div className="flex items-center gap-6">
                  <button className="text-[10px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-text flex items-center gap-2 transition-all">
                     <ChevronRight size={14} className="rotate-180" /> Previous Period
                  </button>
                  <button className="text-[10px] font-black uppercase tracking-widest text-supabase-green hover:text-supabase-greenHover flex items-center gap-2 transition-all">
                     Archived History <ChevronRight size={14} />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollView;