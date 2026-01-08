import React, { useEffect, useState } from 'react';
import { TableRow } from '../types';
import { Plus, Filter, ArrowUpDown, MoreHorizontal, Lock, RefreshCw, Eye, StopCircle, Upload, Trash2, X, AlertTriangle, PauseCircle, Radio } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useClass } from '../context/ClassContext';
import { useToast } from '../context/ToastContext';

interface TableEditorProps {
    onlyLive?: boolean;
}

const TableEditor: React.FC<TableEditorProps> = ({ onlyLive = false }) => {
  const [data, setData] = useState<TableRow[]>([]);
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
        // Only check active published schedules ('true')
        // We do not auto-expire drafts ('false') or already expired ('recent') items
        if (row.status !== 'true') {
            return;
        }

        try {
            // Use updated_at to determine timeline end
            // "not count day form UCS+DDMMYY" - user request to rely on update time/status
            const lastUpdateDate = new Date(row.updated_at);
            const expiryDate = new Date(lastUpdateDate);
            
            // Validity period: 7 days from last update (publishing)
            expiryDate.setDate(expiryDate.getDate() + 7);

            // If current time is past expiry date, mark as recent
            if (now > expiryDate) {
                idsToUpdate.push(row.id);
            }
        } catch (e) {
            console.warn("Error checking date for row", row.id);
        }
    });

    if (idsToUpdate.length > 0) {
        console.log("Auto-updating expired schedules to 'recent':", idsToUpdate);
        const { error } = await supabase
            .from('weekly_schedules')
            .update({ status: 'recent' })
            .in('id', idsToUpdate);
        
        if (error) {
            console.error("Error auto-updating status:", error.message);
            return false;
        }
        return true; // Changes were made
    }
    return false; // No changes
  };

  const fetchData = async (background = false) => {
    if (!background) setIsLoading(true);
    if (supabase) {
        // Build Query
        let query = supabase
            .from('weekly_schedules')
            .select('id, schedule_id, class, status, updated_at')
            .order('updated_at', { ascending: false });
        
        if (onlyLive) {
            query = query.eq('status', 'true');
        }

        const { data: result, error } = await query;
        
        if (!error && result) {
            let currentData = result as TableRow[];
            
            // Check logic for expired schedules
            const hasUpdates = await checkScheduleTimelines(currentData);
            
            // If updates occurred, refetch to show correct status
            if (hasUpdates) {
                 // Re-build query for refetch
                 let updatedQuery = supabase
                    .from('weekly_schedules')
                    .select('id, schedule_id, class, status, updated_at')
                    .order('updated_at', { ascending: false });
                 
                 if (onlyLive) {
                     updatedQuery = updatedQuery.eq('status', 'true');
                 }

                 const { data: updatedResult } = await updatedQuery;
                 if (updatedResult) {
                     currentData = updatedResult as TableRow[];
                 }
            }
            
            setData(currentData);
        } else {
            console.error("Error fetching table data:", error?.message);
            if (!background && error) showToast("Failed to fetch data: " + error.message, 'error');
        }
    }
    if (!background) setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [onlyLive]); // Refetch if filter changes

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!supabase) {
        showToast("Database connection not available", 'error');
        return;
    }

    // If currently Active ('true'), open the Stop/Pause modal
    if (currentStatus === 'true') {
        setStopTargetId(id);
        setStopModalOpen(true);
        return;
    }

    // If currently 'false' or 'recent', we are Publishing ('true')
    await updateStatusInDb(id, 'true');
  };

  const confirmStopAction = async (action: 'pause' | 'stop') => {
      if (!stopTargetId) return;

      // 'pause' -> 'false'
      // 'stop' -> 'recent'
      const newStatus = action === 'pause' ? 'false' : 'recent';
      
      await updateStatusInDb(stopTargetId, newStatus);
      setStopModalOpen(false);
      setStopTargetId(null);
  };

  const updateStatusInDb = async (id: string, newStatus: string) => {
    // Update timestamp when changing status
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
      if (!supabase) {
        showToast("Database connection not available", 'error');
        return;
      }
      setDeleteTargetId(id);
      setPasscode('');
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    if (passcode !== '1234') {
        showToast("Incorrect passcode", 'error');
        return;
    }
    
    const { error } = await supabase
        .from('weekly_schedules')
        .delete()
        .eq('id', deleteTargetId);

    if (!error) {
        fetchData(true);
        showToast("Schedule deleted successfully", 'success');
        setDeleteModalOpen(false);
    } else {
        showToast("Error deleting schedule: " + error.message, 'error');
    }
  };

  const handleView = (className: string) => {
      setSelectedClassId(className);
      showToast(`Selected Project: ${className}. Switch to "Schedule" tab to edit.`, 'info');
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'true':
              return 'bg-green-900/30 text-green-400 border border-green-900';
          case 'recent':
              return 'bg-amber-900/30 text-amber-400 border border-amber-900';
          default:
              return 'bg-gray-800 text-gray-400 border border-gray-700';
      }
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg relative">
      {/* Toolbar */}
      <div className="h-12 border-b border-supabase-border flex items-center px-4 justify-between bg-supabase-panel">
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-supabase-text font-medium">
                 {onlyLive ? <Radio size={14} className="text-red-400 animate-pulse" /> : <Lock size={14} className="text-supabase-muted" />}
                 {onlyLive ? 'Live Schedules (Active)' : 'public.weekly_schedules'}
             </div>
             <div className="h-4 w-px bg-supabase-border"></div>
             <button className="flex items-center gap-1.5 text-xs text-supabase-muted hover:text-supabase-text px-2 py-1 rounded hover:bg-supabase-hover transition-colors">
                 <Filter size={14} />
                 Filter
             </button>
             <button className="flex items-center gap-1.5 text-xs text-supabase-muted hover:text-supabase-text px-2 py-1 rounded hover:bg-supabase-hover transition-colors">
                 <ArrowUpDown size={14} />
                 Sort
             </button>
         </div>
         <div className="flex items-center gap-2">
            <button 
                onClick={() => fetchData(false)}
                className="flex items-center gap-1 text-xs text-supabase-muted hover:text-supabase-text px-2 py-1 rounded hover:bg-supabase-hover transition-colors"
                title="Refresh"
            >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button className="flex items-center gap-1 text-xs bg-supabase-green/10 text-supabase-green border border-supabase-green/20 px-3 py-1.5 rounded hover:bg-supabase-green/20 transition-colors">
                <Plus size={14} />
                Insert Row
            </button>
         </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
                <tr>
                    <th className="w-12 bg-supabase-sidebar border-b border-r border-supabase-border px-2 text-center">
                        <input type="checkbox" className="rounded bg-supabase-panel border-supabase-border" />
                    </th>
                    
                    {/* SN */}
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[80px]">
                        <div className="flex items-center justify-between">
                            <span className="font-mono">SN</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">integer</div>
                    </th>

                    {/* Schedule Id */}
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between">
                            <span className="font-mono">Schedule Id</span>
                            <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-supabase-text" />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">text</div>
                    </th>

                    {/* Class */}
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between">
                            <span className="font-mono">Class</span>
                            <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-supabase-text" />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">text</div>
                    </th>

                    {/* Status */}
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[100px]">
                        <div className="flex items-center justify-between">
                            <span className="font-mono">Status</span>
                            <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-supabase-text" />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">text</div>
                    </th>

                    {/* Timestamp */}
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between">
                            <span className="font-mono">Timestamp</span>
                            <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-supabase-text" />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">timestamp</div>
                    </th>

                    {/* Action */}
                    <th className="group bg-supabase-sidebar border-b border-r border-supabase-border px-4 py-2 text-xs font-normal text-supabase-muted whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center justify-between">
                            <span className="font-mono">Action</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">buttons</div>
                    </th>

                    <th className="bg-supabase-sidebar border-b border-supabase-border"></th>
                </tr>
            </thead>
            <tbody>
                {isLoading && (
                     <tr>
                        <td colSpan={8} className="text-center py-10 text-sm text-supabase-muted">Loading data...</td>
                     </tr>
                )}
                {!isLoading && data.length === 0 && (
                     <tr>
                        <td colSpan={8} className="text-center py-10 text-sm text-supabase-muted">
                            {onlyLive ? 'No live schedules active.' : 'No records found. Save a schedule to see it here.'}
                        </td>
                     </tr>
                )}
                {data.map((row, index) => (
                    <tr key={row.id} className="hover:bg-supabase-hover/40 group">
                        <td className="w-12 border-b border-r border-supabase-border px-2 text-center bg-supabase-bg group-hover:bg-supabase-hover/40">
                             <div className="text-xs text-supabase-muted opacity-50">...</div>
                        </td>
                         
                         {/* SN */}
                         <td className="px-4 py-2 text-xs text-supabase-text border-b border-r border-supabase-border font-mono whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40 opacity-70">
                             {index + 1}
                        </td>

                        {/* Schedule Id */}
                        <td className="px-4 py-2 text-sm text-supabase-text border-b border-r border-supabase-border font-mono whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                             {row.schedule_id}
                        </td>

                        {/* Class */}
                        <td className="px-4 py-2 text-sm text-supabase-text border-b border-r border-supabase-border whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                             {row.class}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-2 text-xs border-b border-r border-supabase-border whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${getStatusBadge(row.status)}`}>
                                {row.status}
                             </span>
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-2 text-xs text-supabase-muted border-b border-r border-supabase-border font-mono whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                             {formatDate(row.updated_at)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-2 text-sm border-b border-r border-supabase-border whitespace-nowrap bg-supabase-bg group-hover:bg-supabase-hover/40">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleView(row.class)} 
                                    className="p-1.5 hover:bg-supabase-hover rounded text-supabase-muted hover:text-supabase-text transition-colors" 
                                    title="View & Edit Schedule"
                                >
                                    <Eye size={16} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.id, row.status); }} 
                                    className={`p-1.5 rounded transition-colors ${
                                        row.status === 'true' 
                                            ? 'text-red-400 hover:bg-red-500/10' 
                                            : 'text-green-400 hover:bg-green-500/10'
                                    }`} 
                                    title={row.status === 'true' ? 'Stop' : 'Publish'}
                                >
                                    {row.status === 'true' ? <StopCircle size={16} /> : <Upload size={16} />}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); initiateDelete(row.id); }} 
                                    className="p-1.5 hover:bg-red-500/10 rounded text-supabase-muted hover:text-red-400 transition-colors" 
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>

                        <td className="border-b border-supabase-border bg-supabase-bg group-hover:bg-supabase-hover/40"></td>
                    </tr>
                ))}
                
                {/* Fill empty rows for better visual */}
                {!isLoading && data.length < 10 && Array.from({ length: 10 - data.length }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                        <td className="border-b border-r border-supabase-border py-4 bg-supabase-bg"></td>
                        {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="border-b border-r border-supabase-border bg-supabase-bg"></td>
                        ))}
                         <td className="border-b border-supabase-border bg-supabase-bg"></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
       <div className="h-8 border-t border-supabase-border bg-supabase-panel flex items-center px-4 justify-between text-xs text-supabase-muted">
            <div>
                {data.length} records
            </div>
            <div className="flex gap-2">
                <span>Page 1 of 1</span>
            </div>
       </div>

       {/* Delete Modal */}
       {deleteModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-supabase-border flex justify-between items-center bg-supabase-sidebar">
                       <div className="flex items-center gap-2 text-red-500">
                           <AlertTriangle size={18} />
                           <h3 className="text-sm font-semibold text-supabase-text">Security Check</h3>
                       </div>
                       <button onClick={() => setDeleteModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                           <X size={18} />
                       </button>
                   </div>
                   <div className="p-6">
                       <p className="text-sm text-supabase-muted mb-4">
                           Enter the admin passcode to verify deletion of this schedule. This action cannot be undone.
                       </p>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-supabase-muted">Admin Passcode</label>
                           <input 
                               type="password" 
                               autoFocus
                               value={passcode}
                               onChange={(e) => setPasscode(e.target.value)}
                               className="w-full bg-supabase-bg border border-supabase-border rounded px-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                               placeholder="Enter code..."
                               onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                           />
                       </div>
                       <div className="mt-6 flex justify-end gap-3">
                           <button 
                               onClick={() => setDeleteModalOpen(false)}
                               className="px-4 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded transition-colors"
                           >
                               Cancel
                           </button>
                           <button 
                               onClick={confirmDelete}
                               className="bg-red-500/10 text-red-500 border border-red-500/50 px-4 py-2 rounded text-sm font-medium hover:bg-red-500/20 transition-colors"
                           >
                               Delete Schedule
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Stop Options Modal */}
       {stopModalOpen && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-supabase-border flex justify-between items-center bg-supabase-sidebar">
                       <div className="flex items-center gap-2 text-supabase-text">
                           <StopCircle size={18} className="text-red-400" />
                           <h3 className="text-sm font-semibold">Stop Schedule</h3>
                       </div>
                       <button onClick={() => setStopModalOpen(false)} className="text-supabase-muted hover:text-supabase-text">
                           <X size={18} />
                       </button>
                   </div>
                   <div className="p-6">
                       <p className="text-sm text-supabase-muted mb-6">
                           How would you like to stop this schedule?
                       </p>
                       <div className="grid grid-cols-2 gap-4">
                           <button 
                               onClick={() => confirmStopAction('pause')}
                               className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-supabase-border bg-supabase-bg hover:bg-supabase-hover transition-colors group"
                           >
                               <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20">
                                   <PauseCircle size={24} />
                               </div>
                               <div className="text-center">
                                   <div className="text-sm font-medium text-supabase-text">Pause</div>
                                   <div className="text-xs text-supabase-muted mt-1">Set to Draft</div>
                               </div>
                           </button>

                           <button 
                               onClick={() => confirmStopAction('stop')}
                               className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-supabase-border bg-supabase-bg hover:bg-supabase-hover transition-colors group"
                           >
                               <div className="p-3 rounded-full bg-red-500/10 text-red-500 group-hover:bg-red-500/20">
                                   <StopCircle size={24} />
                               </div>
                               <div className="text-center">
                                   <div className="text-sm font-medium text-supabase-text">Stop</div>
                                   <div className="text-xs text-supabase-muted mt-1">Set to Recent</div>
                               </div>
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