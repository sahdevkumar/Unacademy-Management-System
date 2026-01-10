import React, { useEffect, useState } from 'react';
import { TableRow, ClassSession } from '../types';
import { Plus, Filter, ArrowUpDown, MoreHorizontal, Lock, RefreshCw, Eye, StopCircle, Upload, Trash2, X, AlertTriangle, PauseCircle, Radio, UserCircle, UserMinus } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useClass } from '../context/ClassContext';
import { useToast } from '../context/ToastContext';

interface TableRowWithContent extends TableRow {
    content?: any[];
}

interface TableEditorProps {
    onlyLive?: boolean;
}

const TableEditor: React.FC<TableEditorProps> = ({ onlyLive = false }) => {
  const [data, setData] = useState<TableRowWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setSelectedClassId } = useClass();
  const { showToast } = useToast();

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');

  // Stop/Pause Modal State
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [stopTargetId, setStopTargetId] = useState<string | null>(null);

  const checkScheduleTimelines = async (rows: TableRow[]) => {
    if (!supabase) return false;
    
    const now = new Date();
    const idsToUpdate: string[] = [];

    rows.forEach(row => {
        if (row.status !== 'true') return;

        try {
            const lastUpdateDate = new Date(row.updated_at);
            const expiryDate = new Date(lastUpdateDate);
            expiryDate.setDate(expiryDate.getDate() + 7);

            if (now > expiryDate) {
                idsToUpdate.push(row.id);
            }
        } catch (e) {
            console.warn("Error checking date for row", row.id);
        }
    });

    if (idsToUpdate.length > 0) {
        const { error } = await supabase
            .from('weekly_schedules')
            .update({ status: 'recent' })
            .in('id', idsToUpdate);
        
        if (error) return false;
        return true;
    }
    return false;
  };

  const fetchData = async (background = false) => {
    if (!background) setIsLoading(true);
    if (supabase) {
        let query = supabase
            .from('weekly_schedules')
            .select('id, schedule_id, class, status, updated_at, content')
            .order('updated_at', { ascending: false });
        
        if (onlyLive) {
            query = query.eq('status', 'true');
        }

        const { data: result, error } = await query;
        
        if (!error && result) {
            let currentData = result as TableRowWithContent[];
            const hasUpdates = await checkScheduleTimelines(currentData);
            
            if (hasUpdates) {
                 let updatedQuery = supabase
                    .from('weekly_schedules')
                    .select('id, schedule_id, class, status, updated_at, content')
                    .order('updated_at', { ascending: false });
                 
                 if (onlyLive) updatedQuery = updatedQuery.eq('status', 'true');

                 const { data: updatedResult } = updatedQuery;
                 if (updatedResult) currentData = updatedResult as TableRowWithContent[];
            }
            setData(currentData);
        } else {
            if (!background && error) showToast("Failed to fetch data: " + error.message, 'error');
        }
    }
    if (!background) setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [onlyLive]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const handleToggleGlobalProfiles = async (id: string) => {
    if (!supabase) return;
    
    // 1. Fetch current content
    const { data: current, error: fetchErr } = await supabase
        .from('weekly_schedules')
        .select('content')
        .eq('id', id)
        .single();
    
    if (fetchErr || !current || !Array.isArray(current.content)) {
        showToast("Could not fetch schedule content", "error");
        return;
    }

    const sessions = current.content as (ClassSession & { show_profiles?: boolean })[];
    
    // 2. Determine target state (if any is true, set all to false, otherwise set all to true)
    const anyShowing = sessions.some(s => s.show_profiles !== false);
    const targetState = !anyShowing;

    const updatedContent = sessions.map(s => ({
        ...s,
        show_profiles: targetState
    }));

    // 3. Save back
    const { error: updateErr } = await supabase
        .from('weekly_schedules')
        .update({ content: updatedContent })
        .eq('id', id);

    if (updateErr) {
        showToast("Failed to update profile visibility", "error");
    } else {
        showToast(`Profiles ${targetState ? 'enabled' : 'disabled'} for all sessions`, "success");
        fetchData(true);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!supabase) {
        showToast("Database connection not available", 'error');
        return;
    }
    if (currentStatus === 'true') {
        setStopTargetId(id);
        setStopModalOpen(true);
        return;
    }
    await updateStatusInDb(id, 'true');
  };

  const confirmStopAction = async (action: 'pause' | 'stop') => {
      if (!stopTargetId) return;
      const newStatus = action === 'pause' ? 'false' : 'recent';
      await updateStatusInDb(stopTargetId, newStatus);
      setStopModalOpen(false);
      setStopTargetId(null);
  };

  const updateStatusInDb = async (id: string, newStatus: string) => {
    const { error } = await supabase
        .from('weekly_schedules')
        .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);
    
    if (!error) {
        fetchData(true);
        let message = '';
        if (newStatus === 'true') message = 'Schedule published successfully';
        if (newStatus === 'false') message = 'Schedule paused (unpublished)';
        if (newStatus === 'recent') message = 'Schedule stopped (archived)';
        showToast(message, 'success');
    } else {
        showToast("Error updating status: " + error.message, 'error');
    }
  };

  const initiateDelete = (id: string) => {
      if (!supabase) return;
      setDeleteTargetId(id);
      setPasscode('');
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || passcode !== '1234') {
        showToast("Incorrect passcode", 'error');
        return;
    }
    const { error } = await supabase.from('weekly_schedules').delete().eq('id', deleteTargetId);
    if (!error) {
        fetchData(true);
        showToast("Schedule deleted successfully", 'success');
        setDeleteModalOpen(false);
    } else {
        showToast("Error deleting schedule", 'error');
    }
  };

  const handleView = (className: string) => {
      setSelectedClassId(className);
      showToast(`Selected Project: ${className}. Switch to "Schedule" tab to edit.`, 'info');
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'true': return 'bg-green-900/30 text-green-400 border border-green-900';
          case 'recent': return 'bg-amber-900/30 text-amber-400 border border-amber-900';
          default: return 'bg-gray-800 text-gray-400 border border-gray-700';
      }
  };

  // Helper to check if profiles are globally enabled for a row
  const areProfilesEnabled = (content: any[] | undefined) => {
    if (!content || !Array.isArray(content)) return false;
    // If at least one session has profiles enabled, consider it "on" for the icon color
    return content.some((s: any) => s.show_profiles !== false);
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg relative">
      <div className="h-12 border-b border-supabase-border flex items-center px-4 justify-between bg-supabase-panel">
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-supabase-text font-medium">
                 {onlyLive ? <Radio size={14} className="text-red-400 animate-pulse" /> : <Lock size={14} className="text-supabase-muted" />}
                 {onlyLive ? 'Live Schedules (Active)' : 'public.weekly_schedules'}
             </div>
             <div className="h-4 w-px bg-supabase-border"></div>
             <button className="flex items-center gap-1.5 text-xs text-supabase-muted hover:text-supabase-text px-2 py-1 rounded hover:bg-supabase-hover transition-colors"><Filter size={14} /> Filter</button>
             <button className="flex items-center gap-1.5 text-xs text-supabase-muted hover:text-supabase-text px-2 py-1 rounded hover:bg-supabase-hover transition-colors"><ArrowUpDown size={14} /> Sort</button>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => fetchData(false)} className="flex items-center gap-1 text-xs text-supabase-muted hover:text-supabase-text px-2 py-1 rounded hover:bg-supabase-hover transition-colors">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button className="flex items-center gap-1 text-xs bg-supabase-green/10 text-supabase-green border border-supabase-green/20 px-3 py-1.5 rounded hover:bg-supabase-green/20 transition-colors">
                <Plus size={14} /> Insert Row
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
                <tr>
                    <th className="w-12 bg-supabase-sidebar border-b border-r border-supabase-border px-2 text-center">
                        <input type="checkbox" className="rounded bg-supabase-panel border-supabase-border" />
                    </th>
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[80px]">
                        <div className="flex items-center justify-between"><span className="font-mono">SN</span></div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">integer</div>
                    </th>
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between"><span className="font-mono">Schedule Id</span><MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer" /></div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">text</div>
                    </th>
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between"><span className="font-mono">Class</span><MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer" /></div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">text</div>
                    </th>
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[100px]">
                        <div className="flex items-center justify-between"><span className="font-mono">Status</span><MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer" /></div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">text</div>
                    </th>
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between"><span className="font-mono">Timestamp</span><MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer" /></div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">timestamp</div>
                    </th>
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[180px]">
                        <div className="flex items-center justify-between"><span className="font-mono">Action</span></div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">buttons</div>
                    </th>
                    <th className="bg-supabase-sidebar border-b border-supabase-border"></th>
                </tr>
            </thead>
            <tbody>
                {isLoading && (<tr><td colSpan={8} className="text-center py-10 text-sm text-supabase-muted font-mono animate-pulse">Scanning records...</td></tr>)}
                {!isLoading && data.length === 0 && (<tr><td colSpan={8} className="text-center py-10 text-sm text-supabase-muted italic">No records found.</td></tr>)}
                {data.map((row, index) => {
                    const profilesActive = areProfilesEnabled(row.content);
                    return (
                        <tr key={row.id} className="hover:bg-supabase-hover/40 group">
                            <td className="w-12 border-b border-r border-supabase-border px-2 text-center bg-supabase-bg group-hover:bg-supabase-hover/40">
                                 <div className="text-xs text-supabase-muted opacity-50">...</div>
                            </td>
                             <td className="px-4 py-2 text-xs text-supabase-text border-b border-r border-supabase-border font-mono whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40 opacity-70">
                                 {index + 1}
                            </td>
                            <td className="px-4 py-2 text-sm text-supabase-text border-b border-r border-supabase-border font-mono whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                                 {row.schedule_id}
                            </td>
                            <td className="px-4 py-2 text-sm text-supabase-text border-b border-r border-supabase-border whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                                 {row.class}
                            </td>
                            <td className="px-4 py-2 text-xs border-b border-r border-supabase-border whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                                 <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${getStatusBadge(row.status)}`}>
                                    {row.status}
                                 </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-supabase-muted border-b border-r border-supabase-border font-mono whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                                 {formatDate(row.updated_at)}
                            </td>
                            <td className="px-4 py-2 text-sm border-b border-r border-supabase-border whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleView(row.class)} className="p-1.5 hover:bg-supabase-hover rounded text-supabase-muted hover:text-supabase-text transition-colors" title="View Schedule"><Eye size={16} /></button>
                                    
                                    <button 
                                        onClick={() => handleToggleGlobalProfiles(row.id)} 
                                        className={`p-1.5 hover:bg-supabase-hover rounded transition-colors ${
                                            profilesActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-rose-400 hover:text-rose-300'
                                        }`} 
                                        title={profilesActive ? 'Profiles Visible (Click to Hide All)' : 'Profiles Hidden (Click to Show All)'}
                                    >
                                        <UserCircle size={16} />
                                    </button>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.id, row.status); }} 
                                        className={`p-1.5 rounded transition-colors ${row.status === 'true' ? 'text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:bg-green-500/10'}`} 
                                        title={row.status === 'true' ? 'Stop/Pause' : 'Publish'}
                                    >
                                        {row.status === 'true' ? <PauseCircle size={16} /> : <Upload size={16} />}
                                    </button>
                                    
                                    <button onClick={(e) => { e.stopPropagation(); initiateDelete(row.id); }} className="p-1.5 hover:bg-red-500/10 rounded text-supabase-muted hover:text-red-400 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </td>
                            <td className="border-b border-supabase-border bg-supabase-bg group-hover:bg-supabase-hover/40"></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
       <div className="h-8 border-t border-supabase-border bg-supabase-panel flex items-center px-4 justify-between text-xs text-supabase-muted">
            <div>{data.length} records</div>
            <div>Page 1 of 1</div>
       </div>

       {deleteModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-supabase-border flex justify-between items-center bg-supabase-sidebar">
                       <div className="flex items-center gap-2 text-red-500"><AlertTriangle size={18} /><h3 className="text-sm font-semibold text-supabase-text">Security Check</h3></div>
                       <button onClick={() => setDeleteModalOpen(false)} className="text-supabase-muted hover:text-supabase-text"><X size={18} /></button>
                   </div>
                   <div className="p-6">
                       <p className="text-sm text-supabase-muted mb-4">Enter admin passcode 1234 to confirm deletion.</p>
                       <input type="password" autoFocus value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-red-500" placeholder="Enter code..." />
                       <div className="mt-6 flex justify-end gap-3">
                           <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm text-supabase-muted">Cancel</button>
                           <button onClick={confirmDelete} className="bg-red-500/10 text-red-500 border border-red-500/50 px-4 py-2 rounded text-sm font-medium hover:bg-red-500/20">Delete Schedule</button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {stopModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-supabase-border flex justify-between items-center bg-supabase-sidebar">
                       <div className="flex items-center gap-2"><StopCircle size={18} className="text-red-400" /><h3 className="text-sm font-semibold">Stop Schedule</h3></div>
                       <button onClick={() => setStopModalOpen(false)} className="text-supabase-muted hover:text-supabase-text"><X size={18} /></button>
                   </div>
                   <div className="p-6">
                       <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => confirmStopAction('pause')} className="flex flex-col items-center gap-3 p-4 rounded-lg border border-supabase-border bg-supabase-bg hover:bg-supabase-hover group">
                               <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20"><PauseCircle size={24} /></div>
                               <div className="text-center"><div className="text-sm font-medium text-supabase-text">Pause</div><div className="text-[10px] text-supabase-muted">Set to Draft</div></div>
                           </button>
                           <button onClick={() => confirmStopAction('stop')} className="flex flex-col items-center gap-3 p-4 rounded-lg border border-supabase-border bg-supabase-bg hover:bg-supabase-hover group">
                               <div className="p-3 rounded-full bg-red-500/10 text-red-500 group-hover:bg-red-500/20"><StopCircle size={24} /></div>
                               <div className="text-center"><div className="text-sm font-medium text-supabase-text">Stop</div><div className="text-[10px] text-supabase-muted">Set to Recent</div></div>
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default TableEditor;