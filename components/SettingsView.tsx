
import React, { useState } from 'react';
/* Added ChevronRight to imports */
import { Shield, Trash2, ShieldPlus, Save, Loader2, Building2, Plus, Database, CloudCheck, Layout, Briefcase, Award, Link2, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';

const SettingsView: React.FC = () => {
  const { 
    availableRoles, deleteRole, addRole, 
    departments, addDepartment, deleteDepartment, 
    designations, addDesignation, deleteDesignation,
    departmentDesignationMap, updateDeptMap, saveSystemConfig
  } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'roles' | 'departments' | 'designations' | 'mappings'>('roles');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMappingDept, setSelectedMappingDept] = useState<string | null>(null);

  const handleAddRole = async () => {
    if (!newRole.trim()) return;
    setIsProcessing(true);
    await addRole(newRole);
    showToast(`Role '${newRole}' staged`, 'info');
    setNewRole('');
    setIsProcessing(false);
  };

  const handleAddDept = async () => {
    if (!newDept.trim()) return;
    setIsProcessing(true);
    await addDepartment(newDept);
    showToast(`Department '${newDept}' staged`, 'info');
    setNewDept('');
    setIsProcessing(false);
  };

  const handleAddDesig = async () => {
    if (!newDesig.trim()) return;
    setIsProcessing(true);
    await addDesignation(newDesig);
    showToast(`Designation '${newDesig}' staged`, 'info');
    setNewDesig('');
    setIsProcessing(false);
  };

  const persistConfig = async () => {
    setIsSaving(true);
    try {
      await saveSystemConfig();
      showToast("Infrastructure state persisted to database", "success");
    } catch (e: any) {
      showToast("Sync failed: " + e.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDesignationInMap = (desig: string) => {
    if (!selectedMappingDept) return;
    const current = departmentDesignationMap[selectedMappingDept] || [];
    const updated = current.includes(desig) 
      ? current.filter(d => d !== desig) 
      : [...current, desig];
    updateDeptMap(selectedMappingDept, updated);
  };

  const isCoreRole = (role: string) => ['superadmin', 'administrator', 'editor', 'teacher', 'viewer'].includes(role);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-supabase-text uppercase tracking-tight">Infrastructure Settings</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-supabase-sidebar text-supabase-muted border border-supabase-border text-[8px] font-black uppercase tracking-widest">
              <Database size={10} />
              Management Core
            </div>
          </div>
          <p className="text-supabase-muted text-sm italic">System-wide configuration and organizational scaling.</p>
        </div>
        <button 
          onClick={persistConfig}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-supabase-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover disabled:opacity-50 transition-all shadow-lg shadow-supabase-green/10"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Persist All Changes
        </button>
      </div>

      <div className="flex border-b border-supabase-border gap-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'roles', icon: ShieldPlus, label: 'Roles' },
          { id: 'departments', icon: Building2, label: 'Departments' },
          { id: 'designations', icon: Briefcase, label: 'Designations' },
          { id: 'mappings', icon: Link2, label: 'Relationship Mapping' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id ? 'text-supabase-green' : 'text-supabase-muted hover:text-supabase-text'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-supabase-green"></div>}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-left-4 duration-300">
            <div className="md:col-span-1 space-y-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Add New Role</h3>
               <div className="flex gap-2">
                 <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role name..." className="flex-1 bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" />
                 <button onClick={handleAddRole} className="p-2 bg-supabase-green/10 text-supabase-green rounded-lg border border-supabase-green/20 hover:bg-supabase-green/20"><Plus size={18} /></button>
               </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 h-fit">
               {availableRoles.map(role => (
                 <div key={role} className="flex items-center justify-between p-4 bg-supabase-panel border border-supabase-border rounded-xl group">
                   <div className="flex items-center gap-3">
                     <Shield size={16} className={isCoreRole(role) ? 'text-supabase-muted' : 'text-supabase-green'} />
                     <span className="text-[11px] font-black uppercase tracking-widest">{role}</span>
                   </div>
                   {!isCoreRole(role) && <button onClick={() => deleteRole(role)} className="text-supabase-muted hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>}
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-300">
            <div className="md:col-span-1 space-y-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Define Unit</h3>
               <div className="flex gap-2">
                 <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Dept name..." className="flex-1 bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" />
                 <button onClick={handleAddDept} className="p-2 bg-supabase-green/10 text-supabase-green rounded-lg border border-supabase-green/20 hover:bg-supabase-green/20"><Plus size={18} /></button>
               </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 h-fit">
               {departments.map(dept => (
                 <div key={dept} className="flex items-center justify-between p-4 bg-supabase-panel border border-supabase-border rounded-xl group">
                   <div className="flex items-center gap-3"><Building2 size={16} className="text-supabase-muted" /><span className="text-[11px] font-black uppercase tracking-widest">{dept}</span></div>
                   <button onClick={() => deleteDepartment(dept)} className="text-supabase-muted hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'designations' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in-95 duration-300">
            <div className="md:col-span-1 space-y-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Create Designation</h3>
               <div className="flex gap-2">
                 <input type="text" value={newDesig} onChange={e => setNewDesig(e.target.value)} placeholder="Title..." className="flex-1 bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" />
                 <button onClick={handleAddDesig} className="p-2 bg-supabase-green/10 text-supabase-green rounded-lg border border-supabase-green/20 hover:bg-supabase-green/20"><Plus size={18} /></button>
               </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 h-fit">
               {designations.map(desig => (
                 <div key={desig} className="flex items-center justify-between p-4 bg-supabase-panel border border-supabase-border rounded-xl group">
                   <div className="flex items-center gap-3"><Award size={16} className="text-supabase-muted" /><span className="text-[11px] font-black uppercase tracking-widest">{desig}</span></div>
                   <button onClick={() => deleteDesignation(desig)} className="text-supabase-muted hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'mappings' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-400 h-[500px]">
            <div className="md:col-span-4 bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden flex flex-col">
               <div className="px-5 py-4 border-b border-supabase-border bg-supabase-sidebar">
                  <h3 className="text-[10px] font-black uppercase text-supabase-muted tracking-widest flex items-center gap-2"><Building2 size={12}/> Parent Departments</h3>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {departments.map(dept => (
                    <button key={dept} onClick={() => setSelectedMappingDept(dept)} className={`w-full text-left p-4 border-b border-supabase-border/30 flex items-center justify-between transition-all ${selectedMappingDept === dept ? 'bg-supabase-green/10 text-supabase-green' : 'hover:bg-supabase-hover'}`}>
                        <span className="text-[11px] font-black uppercase tracking-widest">{dept}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-supabase-sidebar px-1.5 py-0.5 rounded border border-supabase-border text-supabase-muted">{(departmentDesignationMap[dept] || []).length}</span>
                            {selectedMappingDept === dept && <ChevronRight size={14} />}
                        </div>
                    </button>
                  ))}
               </div>
            </div>
            <div className="md:col-span-8 bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden flex flex-col">
              {selectedMappingDept ? (
                <>
                  <div className="px-6 py-4 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Mapped Designations for {selectedMappingDept}</h3>
                    <div className="text-[9px] text-supabase-muted italic">Click to link or unlink roles</div>
                  </div>
                  <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
                    {designations.map(desig => {
                      const isMapped = (departmentDesignationMap[selectedMappingDept] || []).includes(desig);
                      return (
                        <button 
                          key={desig} 
                          onClick={() => toggleDesignationInMap(desig)}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isMapped ? 'bg-supabase-green/5 border-supabase-green text-supabase-green shadow-sm' : 'bg-supabase-sidebar border-supabase-border text-supabase-muted hover:border-supabase-muted'}`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{desig}</span>
                          {isMapped && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-supabase-muted opacity-30 gap-3">
                  <Link2 size={48} />
                  <p className="text-xs font-black uppercase tracking-widest">Select a department to manage role mappings</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-supabase-panel border border-supabase-border rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-sm border-dashed">
        <div className="w-12 h-12 rounded-xl bg-supabase-green/10 flex items-center justify-center text-supabase-green shrink-0">
          <CloudCheck size={24} />
        </div>
        <div className="flex-1">
            <h3 className="text-[10px] font-black uppercase text-supabase-text tracking-[0.2em] mb-1">Infrastructure Persistence</h3>
            <p className="text-xs leading-relaxed text-supabase-muted max-w-2xl">
              Configuration objects are stored in the <strong>system_config</strong> table. Relationships defined here drive the dynamic logic in the personnel matrix.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
