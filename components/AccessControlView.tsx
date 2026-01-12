import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Users, Lock, Check, Search, RotateCcw, Layers, ChevronRight, User as UserIcon, CheckCircle2, Shield, MoreVertical } from 'lucide-react';
import { useAuth, PermissionKey, UserRole } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useClass } from '../context/ClassContext';
import { scheduleService } from '../services/scheduleService';
import { ClassInfo } from '../types';

interface SystemUser {
  id: string;
  full_name: string;
  email: string;
  role: string; // Dynamic string from DB
  mobile: string | null;
}

const AccessControlView: React.FC = () => {
  const { user: currentUser, permissions, updatePermission } = useAuth();
  const { refreshAssignments } = useClass();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'class_control' | 'permissions'>('users');
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [dbClasses, setDbClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Roles exactly as they appear in your screenshot for the dropdown
  const databaseRoles = ['superadmin', 'Super Admin', 'Admin', 'editor', 'Teacher', 'viewer'];
  const permissionKeys = Object.keys(permissions) as PermissionKey[];

  const [selectedUserForClass, setSelectedUserForClass] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data: userData, error: userError } = await supabase
          .from('system_users')
          .select('id, full_name, email, role, mobile')
          .order('full_name', { ascending: true });
        
        if (userError) throw userError;
        if (userData) setSystemUsers(userData as SystemUser[]);

        const { data: assignData } = await supabase.from('user_assignments').select('*');
        if (assignData) {
          const map: Record<string, string[]> = {};
          assignData.forEach((row: any) => map[row.user_id] = row.assigned_classes || []);
          setAssignments(map);
        }
      }
      const classes = await scheduleService.getClasses();
      setDbClasses(classes || []);
    } catch (err: any) {
      showToast("Sync error: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
        if (supabase) {
          const { error } = await supabase
            .from('system_users')
            .update({ role: newRole })
            .eq('id', userId);
          
          if (error) throw error;
        }
        
        setSystemUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        showToast(`Role updated to ${newRole}`, 'success');
        
        if (userId === currentUser?.id) {
            showToast("Your session role updated. Refresh to apply changes.", "info");
        }
    } catch (err: any) {
        showToast("Database update failed: " + err.message, "error");
    }
  };

  const toggleLevelAssignment = async (userId: string, level: 'junior' | 'senior') => {
    const levelClasses = dbClasses.filter(c => c.level === level).map(c => c.name);
    if (levelClasses.length === 0) return;
    const userAssignments = assignments[userId] || [];
    const allLevelAssigned = levelClasses.every(name => userAssignments.includes(name));
    
    let newAssignments;
    if (allLevelAssigned) {
        newAssignments = userAssignments.filter(name => !levelClasses.includes(name));
    } else {
        const otherAssignments = userAssignments.filter(name => !levelClasses.includes(name));
        newAssignments = [...otherAssignments, ...levelClasses];
    }

    try {
      if (supabase) {
        const { error } = await supabase.from('user_assignments').upsert({ 
          user_id: userId, 
          assigned_classes: newAssignments 
        }, { onConflict: 'user_id' });
        if (error) throw error;
      }
      setAssignments(prev => ({ ...prev, [userId]: newAssignments }));
      await refreshAssignments();
      showToast("Access updated", "success");
    } catch (e: any) {
      showToast("Failed to save: " + e.message, "error");
    }
  };

  const handleTogglePermission = async (key: PermissionKey, role: string) => {
    // Permission map uses normalized internal keys
    const internalRole = role.toLowerCase().replace(/\s+/g, '') as UserRole;
    if (internalRole === 'superadmin') return;
    const currentRoles = permissions[key] || [];
    const newRoles = currentRoles.includes(internalRole) ? currentRoles.filter(r => r !== internalRole) : [...currentRoles, internalRole];
    await updatePermission(key, newRoles);
    showToast(`Matrix updated`, 'success');
  };

  const filteredUsers = systemUsers.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserObj = systemUsers.find(u => u.id === selectedUserForClass);

  const getLevelStatus = (userId: string, level: 'junior' | 'senior') => {
    const userAssignments = assignments[userId] || [];
    const levelClasses = dbClasses.filter(c => c.level === level).map(c => c.name);
    if (levelClasses.length === 0) return 'empty';
    const assignedCount = levelClasses.filter(name => userAssignments.includes(name)).length;
    if (assignedCount === 0) return 'none';
    if (assignedCount === levelClasses.length) return 'all';
    return 'partial';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-lg">
                <ShieldCheck size={28} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-supabase-text">Database Access Management</h1>
                <p className="text-supabase-muted text-sm mt-0.5 font-mono">Syncing: public.system_users</p>
            </div>
        </div>
        <div className="flex bg-supabase-panel border border-supabase-border rounded-lg p-1 shadow-inner h-fit">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-supabase-sidebar text-supabase-green shadow-sm' : 'text-supabase-muted hover:text-supabase-text'}`}>
            <Users size={14} /> Database Roles
          </button>
          <button onClick={() => setActiveTab('class_control')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${activeTab === 'class_control' ? 'bg-supabase-sidebar text-supabase-green shadow-sm' : 'text-supabase-muted hover:text-supabase-text'}`}>
            <Layers size={14} /> Class Access
          </button>
          <button onClick={() => setActiveTab('permissions')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${activeTab === 'permissions' ? 'bg-supabase-sidebar text-supabase-green shadow-sm' : 'text-supabase-muted hover:text-supabase-text'}`}>
            <Lock size={14} /> Matrix
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={16} />
                <input type="text" placeholder="Search system_users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-supabase-panel border border-supabase-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all placeholder-supabase-muted/50" />
            </div>
            <button onClick={fetchData} className="p-2.5 text-supabase-muted hover:text-supabase-green bg-supabase-panel border border-supabase-border rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              Fetch Latest
            </button>
           </div>
           
           <div className="bg-supabase-panel border border-supabase-border rounded-xl overflow-hidden shadow-2xl">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-supabase-sidebar/80 text-[10px] uppercase font-bold text-supabase-muted tracking-[0.2em] border-b border-supabase-border">
                   <th className="px-6 py-5">Employee (Supabase Record)</th>
                   <th className="px-6 py-5">Database Role</th>
                   <th className="px-6 py-5 text-center">Verification</th>
                   <th className="px-6 py-5 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-supabase-border/50">
                 {isLoading && systemUsers.length === 0 ? (
                   <tr><td colSpan={4} className="px-6 py-20 text-center text-xs text-supabase-muted font-mono tracking-widest animate-pulse">QUERYING SYSTEM_USERS TABLE...</td></tr>
                 ) : filteredUsers.length === 0 ? (
                   <tr><td colSpan={4} className="px-6 py-20 text-center text-sm text-supabase-muted italic">No records found.</td></tr>
                 ) : filteredUsers.map(u => (
                   <tr key={u.id} className="hover:bg-supabase-hover/20 transition-colors group">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-supabase-muted group-hover:text-supabase-green group-hover:border-supabase-green/30 transition-all font-bold text-lg shadow-sm">
                                {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-supabase-text truncate">{u.full_name}</div>
                                <div className="text-[10px] font-mono text-supabase-muted truncate group-hover:text-supabase-muted/80 transition-colors">{u.email}</div>
                                {u.mobile && <div className="text-[9px] text-supabase-green/60 font-mono">{u.mobile}</div>}
                            </div>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="relative inline-block w-48">
                            <select 
                                value={u.role} 
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className={`w-full text-[11px] font-black uppercase py-2 px-3 pr-8 rounded-lg bg-supabase-sidebar border border-supabase-border outline-none focus:border-supabase-green transition-all appearance-none cursor-pointer tracking-widest ${
                                    u.role?.toLowerCase().includes('admin') ? 'text-purple-400 border-purple-500/20' : 'text-supabase-green border-supabase-green/20'
                                }`}
                            >
                                {databaseRoles.map(r => <option key={r} value={r} className="bg-supabase-panel text-supabase-text">{r}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-supabase-muted">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                            </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                             <div className={`w-2 h-2 rounded-full shadow-sm ${u.role?.toLowerCase() === 'viewer' ? 'bg-supabase-muted' : 'bg-supabase-green animate-pulse'}`} />
                             <span className="text-[10px] font-bold text-supabase-muted tracking-wide uppercase">Verified Profile</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                            <button 
                                onClick={() => { setSelectedUserForClass(u.id); setActiveTab('class_control'); }} 
                                className="p-2.5 hover:bg-supabase-hover rounded-xl text-supabase-muted hover:text-supabase-green transition-all transform hover:scale-110" 
                            >
                                <Layers size={18} />
                            </button>
                            <button className="p-2.5 hover:bg-supabase-hover rounded-xl text-supabase-muted hover:text-supabase-text transition-all">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'class_control' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="md:col-span-4 bg-supabase-panel border border-supabase-border rounded-xl overflow-hidden flex flex-col h-[600px] shadow-lg">
                <div className="p-5 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase text-supabase-muted tracking-[0.2em] flex items-center gap-2">
                    <Users size={14} /> DB Records
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {systemUsers.map(u => (
                        <button key={u.id} onClick={() => setSelectedUserForClass(u.id)} className={`w-full text-left p-4 border-b border-supabase-border/30 transition-all flex items-center justify-between ${selectedUserForClass === u.id ? 'bg-supabase-green/5' : 'hover:bg-supabase-hover'}`}>
                            <div className="min-w-0">
                                <div className={`text-sm font-bold truncate ${selectedUserForClass === u.id ? 'text-supabase-green' : 'text-supabase-text'}`}>{u.full_name}</div>
                                <div className="text-[10px] text-supabase-muted truncate font-mono mt-0.5">{u.email}</div>
                                <div className={`text-[9px] font-black uppercase mt-1 tracking-widest ${u.role?.toLowerCase().includes('admin') ? 'text-purple-400' : 'text-supabase-green opacity-60'}`}>{u.role}</div>
                            </div>
                            {selectedUserForClass === u.id && <ChevronRight size={18} className="text-supabase-green" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="md:col-span-8 bg-supabase-panel border border-supabase-border rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl relative">
                {selectedUserObj ? (
                    <>
                        <div className="px-8 py-6 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-supabase-bg border border-supabase-border flex items-center justify-center text-supabase-green shadow-xl ring-1 ring-white/5">
                                    <UserIcon size={28} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-supabase-text uppercase tracking-wider">{selectedUserObj.full_name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedUserObj.role?.toLowerCase().includes('admin') ? 'text-purple-400' : 'text-supabase-green'}`}>{selectedUserObj.role}</span>
                                        <div className="w-1 h-1 rounded-full bg-supabase-muted/50" />
                                        <span className="text-[10px] text-supabase-muted font-mono">{selectedUserObj.id.slice(0, 12)}...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 p-8 flex flex-col items-center justify-center gap-12 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-supabase-green/[0.03] via-transparent to-transparent">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
                                <button 
                                    onClick={() => toggleLevelAssignment(selectedUserObj.id, 'junior')}
                                    className={`relative p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-6 group shadow-lg ${
                                        getLevelStatus(selectedUserObj.id, 'junior') === 'all' 
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-blue-500/10' 
                                        : getLevelStatus(selectedUserObj.id, 'junior') === 'partial'
                                        ? 'bg-blue-500/5 border-blue-500/30 text-blue-300'
                                        : 'bg-supabase-sidebar border-supabase-border text-supabase-muted hover:border-blue-500/40 hover:text-blue-300'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform group-hover:scale-110 shadow-xl ${
                                        getLevelStatus(selectedUserObj.id, 'junior') === 'all' ? 'bg-blue-500 text-black' : 'bg-supabase-bg border border-supabase-border'
                                    }`}>
                                        {getLevelStatus(selectedUserObj.id, 'junior') === 'all' ? <Check size={36} strokeWidth={4} /> : <Users size={32} />}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-black uppercase tracking-[0.15em]">Junior Module</div>
                                        <div className="text-[10px] opacity-60 mt-1.5 font-mono tracking-widest">CLASSES 6 - 10</div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => toggleLevelAssignment(selectedUserObj.id, 'senior')}
                                    className={`relative p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-6 group shadow-lg ${
                                        getLevelStatus(selectedUserObj.id, 'senior') === 'all' 
                                        ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-purple-500/10' 
                                        : getLevelStatus(selectedUserObj.id, 'senior') === 'partial'
                                        ? 'bg-purple-500/5 border-purple-500/30 text-purple-300'
                                        : 'bg-supabase-sidebar border-supabase-border text-supabase-muted hover:border-purple-500/40 hover:text-purple-300'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform group-hover:scale-110 shadow-xl ${
                                        getLevelStatus(selectedUserObj.id, 'senior') === 'all' ? 'bg-purple-500 text-black' : 'bg-supabase-bg border border-supabase-border'
                                    }`}>
                                        {getLevelStatus(selectedUserObj.id, 'senior') === 'all' ? <Check size={36} strokeWidth={4} /> : <Users size={32} />}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-black uppercase tracking-[0.15em]">Senior Module</div>
                                        <div className="text-[10px] opacity-60 mt-1.5 font-mono tracking-widest">CLASSES 11 - 13</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-supabase-muted space-y-6">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-supabase-text">Select a Database Record</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-supabase-panel border border-supabase-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
             <div className="p-8 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Capability Matrix Mapping</h3>
                    <p className="text-[10px] text-supabase-muted mt-1 font-mono">Defining access for system_users roles</p>
                </div>
             </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-supabase-sidebar/50 text-[10px] font-black uppercase text-supabase-muted tracking-[0.25em]">
                    <th className="px-8 py-6 border-b border-supabase-border">Capability</th>
                    {databaseRoles.map(role => (
                        <th key={role} className="px-8 py-6 text-center border-b border-supabase-border min-w-[140px]">
                            {role}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-supabase-border/50">
                  {permissionKeys.map((permKey) => (
                    <tr key={permKey} className="hover:bg-supabase-hover/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="text-[11px] font-black uppercase tracking-widest text-supabase-text">{permKey.replace(/_/g, ' ')}</div>
                      </td>
                      {databaseRoles.map(role => {
                        const internalRole = role.toLowerCase().replace(/\s+/g, '') as UserRole;
                        const hasPerm = permissions[permKey]?.includes(internalRole);
                        const isSuper = internalRole === 'superadmin';
                        return (
                          <td key={role} className="px-8 py-5 text-center">
                            <button 
                                onClick={() => handleTogglePermission(permKey, role)} 
                                disabled={isSuper} 
                                className={`group relative w-11 h-11 rounded-2xl flex items-center justify-center mx-auto transition-all shadow-sm ${
                                    hasPerm 
                                        ? (isSuper ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-supabase-green/10 text-supabase-green border border-supabase-green/20') 
                                        : 'bg-supabase-sidebar text-supabase-muted/20 hover:text-supabase-muted/50 border border-supabase-border/50'
                                } ${isSuper ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
                            >
                              {hasPerm ? <CheckCircle2 size={22} strokeWidth={2.5} /> : <Shield size={18} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default AccessControlView;