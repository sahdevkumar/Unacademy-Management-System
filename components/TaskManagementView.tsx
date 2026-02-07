
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ListTodo, Search, Filter, User, Briefcase, Plus, Loader2, 
    Database, RefreshCw, ChevronRight, Zap, CheckCircle2, 
    Clock, AlertCircle, X, Calendar, Flag, AlignLeft, 
    Send, AlertTriangle, UserPlus, Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { taskService } from '../services/taskService';

interface Employee {
    id: string;
    full_name: string;
    email: string;
    designation: string;
    department: string;
    status: string;
}

interface TaskFormData {
    title: string;
    description: string;
    priority: 'Urgent' | 'High' | 'Normal' | 'Low';
    due_date: string;
    assigned_to: string;
}

const TaskManagementView: React.FC = () => {
    const { designations, user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Task Assignment Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskForm, setTaskForm] = useState<TaskFormData>({
        title: '',
        description: '',
        priority: 'Normal',
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        assigned_to: ''
    });

    const fetchEmployees = async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('id, full_name, email, designation, department, status')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setEmployees(data || []);
        } catch (e: any) {
            showToast("Failed to fetch matrix: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 emp.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDesignation = selectedDesignation === 'all' || emp.designation === selectedDesignation;
            return matchesSearch && matchesDesignation;
        });
    }, [employees, searchTerm, selectedDesignation]);

    const openAssignModal = (emp?: Employee) => {
        setTaskForm({
            title: '',
            description: '',
            priority: 'Normal',
            due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            assigned_to: emp?.id || ''
        });
        setIsTaskModalOpen(true);
    };

    const handleCommitTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.assigned_to || !currentUser) {
            showToast("Selection Required: Please select a target personnel", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await taskService.create({
                title: taskForm.title,
                description: taskForm.description,
                assigned_to: taskForm.assigned_to,
                assigned_by: currentUser.id,
                priority: taskForm.priority,
                due_date: taskForm.due_date
            });
            
            const targetName = employees.find(e => e.id === taskForm.assigned_to)?.full_name || 'Personnel';
            showToast(`Task successfully committed to ${targetName}`, 'success');
            setIsTaskModalOpen(false);
        } catch (e: any) {
            showToast("Persistence Error: " + e.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-supabase-bg animate-in fade-in duration-500 relative">
            {/* Header */}
            <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-supabase-green/10 rounded-lg shadow-inner">
                        <ListTodo className="text-supabase-green" size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-supabase-text uppercase tracking-widest leading-none">Task Management</h1>
                        <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-tighter mt-1 flex items-center gap-1.5">
                           <Database size={10} /> Protocol Hub: Active
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-all" />
                        <input 
                            type="text" 
                            placeholder="Search personnel..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-2 text-xs text-supabase-text focus:outline-none focus:border-supabase-green w-48 transition-all shadow-inner"
                        />
                    </div>
                    <button onClick={fetchEmployees} className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-all shadow-sm">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => openAssignModal()}
                        className="bg-supabase-green text-black px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20 flex items-center gap-2 group ring-1 ring-white/10"
                    >
                        <Zap size={14} className="group-hover:fill-current" />
                        Create Global Task
                    </button>
                </div>
            </div>

            {/* Designation Selector */}
            <div className="bg-supabase-panel border-b border-supabase-border px-6 py-4 flex flex-col gap-3 shadow-inner shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-supabase-muted uppercase tracking-[0.2em]">Matrix Context Filter</span>
                    <span className="text-[9px] font-bold text-supabase-green uppercase tracking-widest">{filteredEmployees.length} Units Online</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    <button 
                        onClick={() => setSelectedDesignation('all')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border
                            ${selectedDesignation === 'all' 
                                ? 'bg-supabase-green text-black border-supabase-green shadow-lg' 
                                : 'bg-supabase-sidebar text-supabase-muted border-supabase-border hover:text-supabase-text'}`}
                    >
                        All Designations
                    </button>
                    {designations.map(desig => (
                        <button 
                            key={desig}
                            onClick={() => setSelectedDesignation(desig)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border
                                ${selectedDesignation === desig 
                                    ? 'bg-supabase-green text-black border-supabase-green shadow-lg' 
                                    : 'bg-supabase-sidebar text-supabase-muted border-supabase-border hover:text-supabase-text'}`}
                        >
                            {desig}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {isLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center gap-4 text-supabase-muted">
                            <Loader2 className="animate-spin text-supabase-green" size={32} />
                            <span className="text-xs font-mono uppercase tracking-[0.3em]">Mapping Cluster Nodes...</span>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="py-40 bg-supabase-panel/40 border border-supabase-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center opacity-40">
                            <User size={48} className="mb-4" />
                            <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">No Personnel Matched</h3>
                            <p className="text-xs text-supabase-muted mt-1 italic">The current filter returned no registry entries.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEmployees.map(emp => (
                                <div key={emp.id} className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-lg hover:border-supabase-green/30 transition-all group overflow-hidden relative ring-1 ring-white/5">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-xl font-black text-supabase-muted group-hover:text-supabase-green transition-all shadow-inner uppercase">
                                            {emp.full_name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-black text-supabase-text uppercase tracking-tight truncate">{emp.full_name}</h3>
                                            <div className="text-[10px] font-mono text-supabase-muted truncate mt-0.5">{emp.email}</div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 rounded bg-supabase-green/10 text-supabase-green border border-supabase-green/20 text-[8px] font-black uppercase tracking-widest">
                                                    {emp.designation}
                                                </span>
                                                <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-supabase-green animate-pulse' : 'bg-red-500'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-supabase-sidebar/50 p-4 rounded-xl border border-supabase-border/50 mb-6 shadow-inner">
                                        <div className="flex items-center justify-between text-[9px] font-black text-supabase-muted uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5"><Clock size={10} /> Active Workload</span>
                                            <span className="text-supabase-green">Verified Status</span>
                                        </div>
                                        <div className="w-full h-1 bg-supabase-bg rounded-full overflow-hidden">
                                            <div className="h-full bg-supabase-green/20 w-0" />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => openAssignModal(emp)}
                                        className="w-full bg-supabase-sidebar border border-supabase-border text-supabase-muted hover:text-supabase-green hover:border-supabase-green/40 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn shadow-sm active:scale-[0.98]"
                                    >
                                        <UserPlus size={14} className="group-hover/btn:fill-current" />
                                        Assign Rapid Task
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Task Creation Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-supabase-panel border border-supabase-border rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 border-b border-supabase-border bg-supabase-sidebar flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-supabase-green/10 rounded-xl text-supabase-green shadow-inner">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <h2 className="text-xs font-black text-supabase-text uppercase tracking-[0.3em]">Protocol: Task Creator</h2>
                                    <p className="text-[10px] text-supabase-muted font-bold uppercase mt-1">
                                        {taskForm.assigned_to 
                                            ? `Direct Assignment: ${employees.find(e => e.id === taskForm.assigned_to)?.full_name}`
                                            : 'Global Broadcast Mode'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsTaskModalOpen(false)} className="text-supabase-muted hover:text-supabase-text p-2 hover:bg-supabase-bg rounded-lg transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCommitTask} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                            {!taskForm.assigned_to && (
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest flex items-center gap-2 group-focus-within:text-supabase-green transition-colors">
                                        <UserPlus size={10} /> Select Personnel Matrix Node
                                    </label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={taskForm.assigned_to}
                                            onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}
                                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text font-bold focus:border-supabase-green outline-none appearance-none cursor-pointer shadow-inner pr-10"
                                        >
                                            <option value="">Search Registry...</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id} className="bg-supabase-panel">
                                                    {emp.full_name} — {emp.designation} ({emp.department})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-supabase-muted">
                                            <ChevronRight size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest flex items-center gap-2">
                                    <Flag size={10} /> Task Title
                                </label>
                                <input 
                                    required
                                    autoFocus={!taskForm.assigned_to}
                                    type="text" 
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                                    placeholder="Executive summary of requirement..."
                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none font-bold shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest flex items-center gap-2">
                                    <AlignLeft size={10} /> Execution Parameters
                                </label>
                                <textarea 
                                    rows={3}
                                    value={taskForm.description}
                                    onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                                    placeholder="Detailed instructions for the target node..."
                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none resize-none shadow-inner leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest flex items-center gap-2">
                                        <Zap size={10} /> Priority Intensity
                                    </label>
                                    <select 
                                        value={taskForm.priority}
                                        onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-xs text-supabase-text font-black uppercase tracking-widest focus:border-supabase-green outline-none cursor-pointer shadow-inner"
                                    >
                                        <option value="Normal">Normal</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={10} /> Hard Deadline
                                    </label>
                                    <input 
                                        type="date"
                                        required
                                        value={taskForm.due_date}
                                        onChange={e => setTaskForm({...taskForm, due_date: e.target.value})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-xs text-supabase-text font-bold focus:border-supabase-green outline-none shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-supabase-border/50 flex flex-col gap-4">
                                <div className="flex items-start gap-3 p-4 bg-supabase-green/5 border border-supabase-green/20 rounded-2xl">
                                    <Sparkles size={16} className="text-supabase-green mt-0.5 shrink-0" />
                                    <p className="text-[9px] text-supabase-muted italic leading-relaxed uppercase tracking-tighter">
                                        Tasks committed here will be immediately synchronized across the organizational cluster and visible in the recipient's secure console.
                                    </p>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting || !taskForm.title || !taskForm.assigned_to}
                                    className="w-full bg-supabase-green text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-supabase-greenHover transition-all shadow-xl shadow-supabase-green/20 disabled:opacity-30 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Deploy Task to Matrix
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Insight Footer */}
            <div className="p-4 bg-supabase-panel border-t border-supabase-border flex items-center justify-between shrink-0 shadow-inner z-10">
                <div className="flex items-center gap-3 text-supabase-muted">
                    <AlertCircle size={14} className="text-supabase-green" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em]">Organizational capability matrix synced.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-supabase-muted uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-supabase-green" />
                        Availability: {filteredEmployees.filter(e => e.status === 'Active').length} Nodes Online
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskManagementView;
