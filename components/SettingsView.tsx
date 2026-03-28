
import React, { useState, useEffect } from 'react';
/* Added ChevronRight to imports */
import { 
  Shield, Trash2, ShieldPlus, Save, Loader2, Building2, Plus, 
  Database, CloudCheck, Layout, Briefcase, Award, Link2, Check, Search,
  ChevronRight, Activity, 
  RefreshCw, Server, Wifi, WifiOff, X, UserCheck, BookOpen, Layers
} from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState<'roles' | 'departments' | 'designations' | 'mappings' | 'academic' | 'system'>('roles');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  
  // Academic State
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isFetchingAcademic, setIsFetchingAcademic] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', section: 'A', room_no: '', level: 0 });
  const [newSubject, setNewSubject] = useState('');
  const [newSection, setNewSection] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedMappingDept, setSelectedMappingDept] = useState<string | null>(null);

  const [dbStatus, setDbStatus] = useState<'Checking' | 'Connected' | 'Error' | 'Disconnected'>('Checking');
  const [dbError, setDbError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{ reachable: boolean | null, latency?: number, error?: string }>({ reachable: null });
  const [serverHealth, setServerHealth] = useState<{ status: string, duration?: string, error?: string } | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  useEffect(() => {
    checkDatabaseConnection();
    if (activeTab === 'academic') {
      fetchAcademicData();
    }
  }, [activeTab]);

  const checkDatabaseConnection = async (manual = false) => {
    let currentSupabase = supabase;
    
    if (!currentSupabase) {
      const { reinitializeSupabase } = await import('../services/supabaseClient');
      currentSupabase = reinitializeSupabase();
    }

    if (!currentSupabase) {
      setDbStatus('Disconnected');
      setDbError('Supabase client not initialized. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in the Secrets menu and you have clicked "Apply changes".');
      if (manual) showToast('Supabase client not initialized. Check Secrets.', 'error');
      return;
    }

    setDbStatus('Checking');
    setDbError(null);
    setNetworkInfo({ reachable: null });
    
    const supabaseUrl = currentSupabase.supabaseUrl;
    
    // Create a promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Connection timed out after 10 seconds trying to reach: ${supabaseUrl}. This usually indicates a network/firewall issue or that the Supabase project is paused.`)), 10000)
    );

    try {
      const start = Date.now();
      
      // 2. Supabase Client Checks
      const authCheckPromise = currentSupabase.auth.getSession();
      const queryPromise = currentSupabase.from('system_config').select('key').limit(1);
      
      // Race everything against the timeout
      const results = await Promise.race([
        Promise.all([authCheckPromise, queryPromise]),
        timeoutPromise
      ]) as any;
      
      const [authResult, queryResult] = results;
      setNetworkInfo({ reachable: true, latency: Date.now() - start });

      if (queryResult.error && queryResult.error.code !== 'PGRST116') {
        throw queryResult.error;
      }
      
      setDbStatus('Connected');
      setDbError(null);
      if (manual) showToast('Database connected successfully', 'success');
    } catch (e: any) {
      console.error('Database connection check failed:', e);
      setDbStatus('Error');
      
      // Try to determine if it's a network issue
      if (e.message?.includes('timed out')) {
        setDbError(`Timeout: The browser could not reach ${supabaseUrl} within 10s. Check your internet connection or firewall.`);
      } else {
        setDbError(e.message || 'Unknown connection error');
      }
      
      if (manual) showToast(`Connection failed: ${e.message || 'Unknown error'}`, 'error');
    }
  };

  const checkServerHealth = async () => {
    setIsCheckingServer(true);
    setServerHealth(null);
    try {
      const response = await fetch('/api/supabase-health');
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const data = await response.json();
      setServerHealth(data);
      if (data.status === 'ok') {
        showToast(`Server connection OK (${data.duration}ms)`, 'success');
      } else {
        showToast(`Server connection failed: ${data.error}`, 'error');
      }
    } catch (error: any) {
      setServerHealth({ status: 'error', error: error.message });
      showToast(`Failed to check server health: ${error.message}`, 'error');
    } finally {
      setIsCheckingServer(false);
    }
  };

  const fetchAcademicData = async () => {
    if (!supabase) return;
    setIsFetchingAcademic(true);
    try {
      const [classesRes, subjectsRes, sectionsRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('sections').select('*').order('name')
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (sectionsRes.error) throw sectionsRes.error;

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setSections(sectionsRes.data || []);
    } catch (e: any) {
      showToast("Failed to fetch academic data: " + e.message, "error");
    } finally {
      setIsFetchingAcademic(false);
    }
  };

  const handleSeedData = async () => {
    if (!supabase) return;
    setIsSeeding(true);
    try {
      // Seed Classes
      const classesToSeed = [
        { name: 'Class 1', section: 'A', room_no: '101', level: 1 },
        { name: 'Class 2', section: 'A', room_no: '102', level: 2 },
        { name: 'Class 3', section: 'A', room_no: '103', level: 3 },
        { name: 'Class 4', section: 'A', room_no: '104', level: 4 },
        { name: 'Class 5', section: 'A', room_no: '105', level: 5 }
      ];
      
      const { error: classError } = await supabase.from('classes').upsert(classesToSeed, { onConflict: 'name' });
      if (classError) throw classError;

      // Seed Subjects
      const subjectsToSeed = [
        { name: 'Mathematics' },
        { name: 'Science' },
        { name: 'English' },
        { name: 'History' },
        { name: 'Geography' }
      ];
      const { error: subjectError } = await supabase.from('subjects').upsert(subjectsToSeed, { onConflict: 'name' });
      if (subjectError) throw subjectError;

      // Seed Sections
      const sectionsToSeed = [
        { name: 'A' },
        { name: 'B' },
        { name: 'C' }
      ];
      const { error: sectionError } = await supabase.from('sections').upsert(sectionsToSeed, { onConflict: 'name' });
      if (sectionError) throw sectionError;

      showToast("Seed data applied successfully", "success");
      fetchAcademicData();
    } catch (e: any) {
      showToast("Failed to seed data: " + e.message, "error");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClass.name || !supabase) {
      showToast("Class name is required", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.from('classes').insert([
        { 
          name: newClass.name, 
          section: newClass.section, 
          room_no: newClass.room_no, 
          level: newClass.level 
        }
      ]).select();
      
      if (error) throw error;
      
      setClasses([...classes, data[0]]);
      setNewClass({ name: '', section: 'A', room_no: '', level: 0 });
      showToast("Class added successfully", "success");
    } catch (e: any) {
      showToast("Failed to add class: " + e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      setClasses(classes.filter(c => c.id !== id));
      showToast("Class removed", "success");
    } catch (e: any) {
      showToast("Failed to remove class: " + e.message, "error");
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim() || !supabase) {
      showToast("Subject name is required", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.from('subjects').insert([
        { name: newSubject.trim() }
      ]).select();
      
      if (error) throw error;
      
      setSubjects([...subjects, data[0]]);
      setNewSubject('');
      showToast("Subject added successfully", "success");
    } catch (e: any) {
      showToast("Failed to add subject: " + e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      setSubjects(subjects.filter(s => s.id !== id));
      showToast("Subject removed", "success");
    } catch (e: any) {
      showToast("Failed to remove subject: " + e.message, "error");
    }
  };

  const handleAddSection = async () => {
    if (!newSection.trim() || !supabase) {
      showToast("Section name is required", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.from('sections').insert([
        { name: newSection.trim() }
      ]).select();
      
      if (error) throw error;
      
      setSections([...sections, data[0]]);
      setNewSection('');
      showToast("Section added successfully", "success");
    } catch (e: any) {
      showToast("Failed to add section: " + e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('sections').delete().eq('id', id);
      if (error) throw error;
      setSections(sections.filter(s => s.id !== id));
      showToast("Section removed", "success");
    } catch (e: any) {
      showToast("Failed to remove section: " + e.message, "error");
    }
  };

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
      await saveSystemConfig({
        classes,
        subjects,
        sections
      });
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
          { id: 'mappings', icon: Link2, label: 'Relationship Mapping' },
          { id: 'academic', icon: BookOpen, label: 'Academic' },
          { id: 'system', icon: Server, label: 'System' }
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


        {activeTab === 'academic' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Classes Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-4">
                <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <Plus size={14} className="text-supabase-green" />
                    Add New Class
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Class Name</label>
                      <input 
                        type="text" 
                        value={newClass.name} 
                        onChange={e => setNewClass({...newClass, name: e.target.value})} 
                        placeholder="e.g. Class 10" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Section</label>
                        {sections.length > 0 ? (
                          <select 
                            value={newClass.section} 
                            onChange={e => setNewClass({...newClass, section: e.target.value})} 
                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green"
                          >
                            <option value="">Select</option>
                            {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            value={newClass.section} 
                            onChange={e => setNewClass({...newClass, section: e.target.value})} 
                            placeholder="A" 
                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Room No</label>
                        <input 
                          type="text" 
                          value={newClass.room_no} 
                          onChange={e => setNewClass({...newClass, room_no: e.target.value})} 
                          placeholder="101" 
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Level</label>
                      <select 
                        value={newClass.level} 
                        onChange={e => setNewClass({...newClass, level: parseInt(e.target.value)})} 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green"
                      >
                        <option value={0}>Junior</option>
                        <option value={1}>Senior</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleAddClass}
                      disabled={isProcessing}
                      className="w-full py-2.5 bg-supabase-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add Class
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Existing Classes</h3>
                {isFetchingAcademic ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-supabase-green" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {classes.map(cls => (
                      <div key={cls.id} className="p-4 bg-supabase-panel border border-supabase-border rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-supabase-green/10 flex items-center justify-center text-supabase-green font-black text-[10px]">
                            {cls.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-widest">{cls.name}</p>
                            <p className="text-[9px] text-supabase-muted uppercase tracking-widest">Sec: {cls.section} • Room: {cls.room_no}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteClass(cls.id)} className="text-supabase-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subjects Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-supabase-border">
              <div className="md:col-span-1 space-y-4">
                <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <Plus size={14} className="text-supabase-green" />
                    Add New Subject
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Subject Name</label>
                      <input 
                        type="text" 
                        value={newSubject} 
                        onChange={e => setNewSubject(e.target.value)} 
                        placeholder="e.g. Mathematics" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <button 
                      onClick={handleAddSubject}
                      disabled={isProcessing}
                      className="w-full py-2.5 bg-supabase-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add Subject
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Existing Subjects</h3>
                {isFetchingAcademic ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-supabase-green" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map(sub => (
                      <div key={sub.id} className="p-4 bg-supabase-panel border border-supabase-border rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <BookOpen size={16} className="text-supabase-green" />
                          <span className="text-[11px] font-black uppercase tracking-widest">{sub.name}</span>
                        </div>
                        <button onClick={() => handleDeleteSubject(sub.id)} className="text-supabase-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sections Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-supabase-border">
              <div className="md:col-span-1 space-y-4">
                <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <Plus size={14} className="text-supabase-green" />
                    Add New Section
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Section Name</label>
                      <input 
                        type="text" 
                        value={newSection} 
                        onChange={e => setNewSection(e.target.value)} 
                        placeholder="e.g. A, B, C" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <button 
                      onClick={handleAddSection}
                      disabled={isProcessing}
                      className="w-full py-2.5 bg-supabase-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add Section
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Existing Sections</h3>
                {isFetchingAcademic ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-supabase-green" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sections.map(sec => (
                      <div key={sec.id} className="p-4 bg-supabase-panel border border-supabase-border rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <Layers size={16} className="text-supabase-green" />
                          <span className="text-[11px] font-black uppercase tracking-widest">{sec.name}</span>
                        </div>
                        <button onClick={() => handleDeleteSection(sec.id)} className="text-supabase-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* System Health Section */}
              <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-supabase-border bg-supabase-sidebar flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <Activity size={14} className="text-supabase-green" />
                    System Health & Connectivity
                  </h3>
                  <button 
                    onClick={() => checkDatabaseConnection(true)}
                    className="p-1.5 text-supabase-muted hover:text-supabase-green transition-colors"
                  >
                    <RefreshCw size={14} className={dbStatus === 'Checking' ? 'animate-spin' : ''} />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Client Status</p>
                        <button 
                          onClick={() => checkDatabaseConnection(true)}
                          className="p-1 text-supabase-muted hover:text-supabase-green transition-colors"
                          title="Check Client Connection"
                        >
                          <RefreshCw size={10} className={dbStatus === 'Checking' ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          dbStatus === 'Connected' ? 'bg-supabase-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                          dbStatus === 'Checking' ? 'bg-orange-400 animate-pulse' : 
                          'bg-red-500'
                        }`} />
                        <span className={`text-sm font-black uppercase tracking-tight ${
                          dbStatus === 'Connected' ? 'text-supabase-green' : 
                          dbStatus === 'Checking' ? 'text-orange-400' : 
                          'text-red-500'
                        }`}>{dbStatus}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Server Status</p>
                        <button 
                          onClick={checkServerHealth}
                          disabled={isCheckingServer}
                          className="p-1 text-supabase-muted hover:text-supabase-green transition-colors disabled:opacity-50"
                          title="Check Server Connection"
                        >
                          <RefreshCw size={10} className={isCheckingServer ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          serverHealth?.status === 'ok' ? 'bg-supabase-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                          isCheckingServer ? 'bg-orange-400 animate-pulse' : 
                          serverHealth?.status === 'error' ? 'bg-red-500' :
                          'bg-supabase-muted'
                        }`} />
                        <span className={`text-sm font-black uppercase tracking-tight ${
                          serverHealth?.status === 'ok' ? 'text-supabase-green' : 
                          isCheckingServer ? 'text-orange-400' : 
                          serverHealth?.status === 'error' ? 'text-red-500' :
                          'text-supabase-muted'
                        }`}>
                          {isCheckingServer ? 'Checking' : (serverHealth?.status === 'ok' ? 'Connected' : (serverHealth?.status === 'error' ? 'Error' : 'Unknown'))}
                        </span>
                        {serverHealth?.duration && (
                          <span className="text-[10px] text-supabase-muted font-mono ml-auto">{serverHealth.duration}ms</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {serverHealth?.error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
                      <Server size={18} className="text-red-400 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Server Connection Error</p>
                        <p className="text-xs text-red-300/80 leading-relaxed font-mono">{serverHealth.error}</p>
                      </div>
                    </div>
                  )}

                  {dbError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                      <div className="flex gap-3">
                        <WifiOff size={18} className="text-red-400 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Connection Error</p>
                          <p className="text-xs text-red-300/80 leading-relaxed font-mono">{dbError}</p>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-red-500/10 flex flex-wrap gap-2">
                        <div className="px-2 py-1 bg-red-500/20 rounded text-[9px] font-mono text-red-300">
                          Reachability: {networkInfo.reachable === null ? 'Unknown' : (networkInfo.reachable ? 'YES' : 'NO')}
                        </div>
                        {networkInfo.latency && (
                          <div className="px-2 py-1 bg-red-500/20 rounded text-[9px] font-mono text-red-300">
                            Latency: {networkInfo.latency}ms
                          </div>
                        )}
                        {networkInfo.error && (
                          <div className="px-2 py-1 bg-red-500/20 rounded text-[9px] font-mono text-red-300">
                            Net Error: {networkInfo.error}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-supabase-muted">Environment Variables</h4>
                    <div className="space-y-2">
                      {[
                        { name: 'VITE_SUPABASE_URL', status: !!supabase },
                        { name: 'VITE_SUPABASE_ANON_KEY', status: !!supabase }
                      ].map(env => (
                        <div key={env.name} className="flex items-center justify-between p-3 bg-supabase-sidebar/50 border border-supabase-border/50 rounded-lg">
                          <span className="text-[10px] font-mono text-supabase-muted">{env.name}</span>
                          {env.status ? (
                            <Check size={12} className="text-supabase-green" />
                          ) : (
                            <X size={12} className="text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-supabase-border/50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-supabase-muted">Application Version</h4>
                    <div className="flex items-center justify-between p-3 bg-supabase-sidebar/50 border border-supabase-border/50 rounded-lg">
                      <span className="text-[10px] font-mono text-supabase-muted">Current Build</span>
                      <span className="text-[10px] font-mono text-supabase-green font-bold">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seed Data Section */}
              <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-supabase-border bg-supabase-sidebar">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <Database size={14} className="text-supabase-green" />
                    Seed Data Management
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="p-4 bg-supabase-green/5 border border-supabase-green/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-supabase-green/20 flex items-center justify-center text-supabase-green">
                        <Layers size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-supabase-text uppercase tracking-tight">Academic Infrastructure</p>
                        <p className="text-[10px] text-supabase-muted uppercase tracking-widest">Classes, Subjects, Sections</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-supabase-muted leading-relaxed">
                      Populate your database with a standard academic structure. This will add sample classes (1-5), core subjects, and default sections.
                    </p>
                    <button 
                      onClick={handleSeedData}
                      disabled={isSeeding || !supabase}
                      className="w-full py-3 bg-supabase-green text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all flex items-center justify-center gap-2 shadow-lg shadow-supabase-green/10 disabled:opacity-50"
                    >
                      {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Apply Academic Seed Data
                    </button>
                  </div>

                  <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-xl space-y-3 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-supabase-panel flex items-center justify-center text-supabase-muted">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-supabase-text uppercase tracking-tight">Sample Personnel</p>
                        <p className="text-[10px] text-supabase-muted uppercase tracking-widest">Coming Soon</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-supabase-muted leading-relaxed">
                      Populate sample teachers, students, and employees to test HR and attendance features.
                    </p>
                    <button 
                      disabled
                      className="w-full py-3 bg-supabase-panel border border-supabase-border text-supabase-muted rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
                    >
                      Locked
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-supabase-sidebar border border-supabase-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-supabase-panel border border-supabase-border flex items-center justify-center text-supabase-muted">
                  <Server size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-supabase-text uppercase tracking-tight">System Version</h4>
                  <p className="text-[10px] text-supabase-muted font-mono uppercase tracking-widest">v2.4.0-stable (Enterprise)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-supabase-text uppercase tracking-widest">Last Infrastructure Sync</p>
                  <p className="text-[10px] text-supabase-muted font-mono">{new Date().toLocaleString()}</p>
                </div>
                <button 
                  onClick={persistConfig}
                  className="px-6 py-2.5 bg-supabase-panel border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all"
                >
                  Full System Backup
                </button>
              </div>
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
