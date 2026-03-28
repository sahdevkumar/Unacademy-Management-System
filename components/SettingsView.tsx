
import React, { useState, useEffect } from 'react';
/* Added ChevronRight to imports */
import { 
  Shield, Trash2, ShieldPlus, Save, Loader2, Building2, Plus, 
  Database, CloudCheck, Layout, Briefcase, Award, Link2, Check, Search, Upload, Clock,
  ChevronRight, Fingerprint, Cpu, UploadCloud, DownloadCloud, Activity, 
  RefreshCw, Server, Wifi, WifiOff, X, UserCheck, BookOpen, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { biometricService } from '../services/biometricService';

interface BiometricDevice {
  id: string;
  name: string;
  cloud_key: string | null;
  serial_number: string;
  location: string;
  status: 'Online' | 'Offline' | 'Connecting';
  last_sync: string | null;
}

const SettingsView: React.FC = () => {
  const { 
    availableRoles, deleteRole, addRole, 
    departments, addDepartment, deleteDepartment, 
    designations, addDesignation, deleteDesignation,
    departmentDesignationMap, updateDeptMap, saveSystemConfig
  } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'roles' | 'departments' | 'designations' | 'mappings' | 'biometric' | 'academic' | 'system'>('roles');
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

  // Biometric State
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [isFetchingDevices, setIsFetchingDevices] = useState(false);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // deviceId_type
  const [fetchedUsers, setFetchedUsers] = useState<any[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedDeviceName, setSelectedDeviceName] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeletingCommand, setIsDeletingCommand] = useState<number | null>(null);
  const [commandToDelete, setCommandToDelete] = useState<{ id: number, title: string } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isUploadingSelected, setIsUploadingSelected] = useState(false);
  const [uploadSearchTerm, setUploadSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, currentName: string } | null>(null);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [fetchedCommands, setFetchedCommands] = useState<any[]>([]);
  const [isFetchingCommands, setIsFetchingCommands] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [fetchedLogs, setFetchedLogs] = useState<any[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [dbStatus, setDbStatus] = useState<'Checking' | 'Connected' | 'Error' | 'Disconnected'>('Checking');
  const [dbError, setDbError] = useState<string | null>(null);

  const [cloudConfig, setCloudConfig] = useState({
    baseUrl: '',
    username: '',
    password: ''
  });
  const [newDevice, setNewDevice] = useState({
    name: '',
    cloud_key: '',
    location: ''
  });

  useEffect(() => {
    checkDatabaseConnection();
    if (activeTab === 'biometric') {
      fetchDevices();
      fetchCloudConfig();
    }
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
    
    const supabaseUrl = currentSupabase.supabaseUrl;
    
    // Create a promise that rejects after 20 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Connection timed out after 20 seconds trying to reach: ${supabaseUrl}. Please verify this URL is publicly accessible from your browser and not blocked by a firewall.`)), 20000)
    );

    try {
      // First, try a simple fetch to the Supabase REST API root to check basic connectivity
      const healthCheckUrl = `${supabaseUrl}/rest/v1/`;
      const healthCheckPromise = fetch(healthCheckUrl, { method: 'GET' }).then(res => {
        if (!res.ok && res.status !== 404 && res.status !== 401 && res.status !== 400) {
          throw new Error(`HTTP Error ${res.status} when reaching ${healthCheckUrl}`);
        }
        return true;
      }).catch(e => {
        // If it's a TypeError, it's likely a CORS or network issue
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
           throw new Error(`Network error or CORS issue when reaching ${healthCheckUrl}. Is the server running and accessible?`);
        }
        throw new Error(`Failed to reach ${healthCheckUrl}: ${e.message}`);
      });

      await Promise.race([healthCheckPromise, timeoutPromise]);

      // Perform a simple query to verify connection with a timeout
      const queryPromise = currentSupabase.from('system_config').select('key').limit(1);
      
      const { error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error) throw error;
      setDbStatus('Connected');
      setDbError(null);
      if (manual) showToast('Database connected successfully', 'success');
    } catch (e: any) {
      setDbStatus('Error');
      setDbError(e.message || 'Unknown connection error');
      if (manual) showToast(`Connection failed: ${e.message || 'Unknown error'}`, 'error');
      console.error("Database connection check failed:", e);
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

  const handleSyncAllDevices = async () => {
    if (devices.length === 0) {
      showToast("No devices to sync", "error");
      return;
    }
    
    setIsProcessing(true);
    try {
      for (const device of devices) {
        await syncData(device.id, 'logs');
        await syncData(device.id, 'users');
      }
      showToast("All devices synced successfully", "success");
    } catch (e: any) {
      showToast("Sync all failed: " + e.message, "error");
    } finally {
      setIsProcessing(false);
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

  const fetchCloudConfig = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'biometric_api_config').maybeSingle();
      if (data?.value) {
        setCloudConfig(data.value as any);
      }
    } catch (e) {
      console.error("Failed to fetch cloud config:", e);
    }
  };

  const saveCloudConfig = async () => {
    if (!supabase) return;
    setIsSavingConfig(true);
    try {
      const { error } = await supabase.from('system_config').upsert({
        key: 'biometric_api_config',
        value: cloudConfig
      }, { onConflict: 'key' });
      if (error) throw error;
      await biometricService.initialize();
      showToast("Cloud API configuration saved", "success");
    } catch (e: any) {
      showToast("Failed to save config: " + e.message, "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const fetchDevices = async () => {
    if (!supabase) return;
    setIsFetchingDevices(true);
    try {
      // 1. Fetch devices from Supabase
      const { data: dbDevices, error: dbError } = await supabase
        .from('biometric_devices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dbError) throw dbError;

      // 2. Fetch live data from Cloud API
      await biometricService.initialize();
      const apiDevices = await biometricService.getDevices();

      // 3. Merge live data into DB devices
      const mergedDevices = (dbDevices || []).map(dbDev => {
        const apiDev = apiDevices.find(a => a.cloud_key === dbDev.cloud_key);
        return {
          ...dbDev,
          status: apiDev ? apiDev.status : 'Offline',
          last_sync: apiDev ? apiDev.last_sync : dbDev.last_sync
        };
      });

      setDevices(mergedDevices);
    } catch (e: any) {
      showToast("Failed to fetch devices: " + e.message, "error");
    } finally {
      setIsFetchingDevices(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.cloud_key || !supabase) {
      showToast("Name and Cloud Key are required", "error");
      return;
    }
    setIsAddingDevice(true);
    try {
      const { data, error } = await supabase.from('biometric_devices').insert([
        { ...newDevice, status: 'Offline' }
      ]).select();
      if (error) throw error;
      setNewDevice({ name: '', cloud_key: '', location: '' });
      showToast("Device added successfully", "success");
      await fetchDevices();
    } catch (e: any) {
      showToast("Failed to add device: " + e.message, "error");
    } finally {
      setIsAddingDevice(false);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('biometric_devices').delete().eq('id', id);
      if (error) throw error;
      setDevices(devices.filter(d => d.id !== id));
      showToast("Device removed", "success");
    } catch (e: any) {
      showToast("Failed to remove device: " + e.message, "error");
    }
  };

  const testConnection = async (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device || !device.cloud_key) return;

    setDevices(devices.map(d => d.id === id ? { ...d, status: 'Connecting' } : d));
    
    try {
      const isOnline = await biometricService.testConnection(device.cloud_key);
      const newStatus = isOnline ? 'Online' : 'Offline';
      if (supabase) {
        await supabase.from('biometric_devices').update({ status: newStatus }).eq('id', id);
      }
      setDevices(devices.map(d => d.id === id ? { ...d, status: newStatus } : d));
      showToast(isOnline ? "Device is Online" : "Connection failed", isOnline ? "success" : "error");
    } catch (e: any) {
      showToast("Connection test failed: " + e.message, "error");
      setDevices(devices.map(d => d.id === id ? { ...d, status: 'Offline' } : d));
    }
  };

  const syncData = async (id: string, type: 'upload' | 'logs' | 'users' | 'commands') => {
    const device = devices.find(d => d.id === id);
    if (!device || !device.cloud_key) return;

    const syncKey = `${id}_${type}`;
    setIsSyncing(syncKey);
    
    try {
      if (type === 'logs') {
        setIsFetchingLogs(true);
        const logs = await biometricService.fetchLogs(device.cloud_key);
        setFetchedLogs(logs);
        setSelectedDeviceName(device.name);
        setSelectedDeviceId(device.id);
        setShowLogsModal(true);
        
        // Trigger server-side sync for background processing
        fetch('/api/sync-biometric', { method: 'POST' }).catch(console.error);
        
        await biometricService.syncLogsToSupabase(logs);
        setIsFetchingLogs(false);
        showToast(`Fetched ${logs.length} logs and synced to attendance`, "success");
      } else if (type === 'users') {
        const users = await biometricService.fetchUsersFromDevice(device.cloud_key);
        setFetchedUsers(users);
        setSelectedDeviceName(device.name);
        setSelectedDeviceId(device.id);
        setShowUsersModal(true);
        showToast(`Found ${users.length} users on device`, "success");
      } else if (type === 'commands') {
        setIsFetchingCommands(true);
        const commands = await biometricService.fetchCommands(device.cloud_key);
        setFetchedCommands(commands);
        setSelectedDeviceName(device.name);
        setSelectedDeviceId(device.id);
        setShowCommandsModal(true);
        showToast(`Retrieved ${commands.length} command statuses`, "success");
      } else {
        if (!supabase) return;
        // Fetch students from the 'students' table to show in the selection modal
        const { data: students, error: studentError } = await supabase.from('students').select('*').order('full_name');
        if (studentError) throw studentError;
        
        if (students && students.length > 0) {
          setDbStudents(students);
          setSelectedStudentIds(new Set());
          setSelectedDeviceName(device.name);
          setSelectedDeviceId(device.id);
          setShowUploadModal(true);
        } else {
          showToast("No students found in database", "info");
        }
      }

      const now = new Date().toISOString();
      if (supabase) {
        await supabase.from('biometric_devices').update({ last_sync: now }).eq('id', id);
      }
      setDevices(devices.map(d => d.id === id ? { ...d, last_sync: now } : d));
    } catch (e: any) {
      showToast("Sync failed: " + e.message, "error");
    } finally {
      setIsSyncing(null);
    }
  };

  const handleUploadSelected = async () => {
    const device = devices.find(d => d.id === selectedDeviceId);
    if (!device || !device.cloud_key || selectedStudentIds.size === 0) return;

    setIsUploadingSelected(true);
    let successCount = 0;
    const studentsToUpload = dbStudents.filter(s => selectedStudentIds.has(s.id));
    setUploadProgress({ current: 0, total: studentsToUpload.length, currentName: '' });
    
    try {
      for (let i = 0; i < studentsToUpload.length; i++) {
        const student = studentsToUpload[i];
        setUploadProgress({ current: i + 1, total: studentsToUpload.length, currentName: student.full_name });
        try {
          await biometricService.uploadUser({
            userId: student.roll_number || student.id,
            userName: student.full_name,
            cardNumber: "",
            accessLevel: "User",
            password: "" 
          }, device.cloud_key);
          successCount++;
        } catch (err) {
          console.error(`Failed to upload ${student.full_name}:`, err);
        }
      }
      
      showToast(`Successfully uploaded ${successCount} of ${studentsToUpload.length} students`, "success");
      setShowUploadModal(false);
    } catch (e: any) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setIsUploadingSelected(false);
      setUploadProgress(null);
    }
  };

  const toggleStudentSelection = (id: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudentIds(newSelected);
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.size === filteredDbStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredDbStudents.map(s => s.id)));
    }
  };

  const filteredDbStudents = dbStudents.filter(s => 
    s.full_name.toLowerCase().includes(uploadSearchTerm.toLowerCase()) ||
    (s.roll_number && s.roll_number.toLowerCase().includes(uploadSearchTerm.toLowerCase()))
  );

  const handleDeleteUserFromDevice = async (userId: string) => {
    const device = devices.find(d => d.id === selectedDeviceId);
    if (!device || !device.cloud_key) return;

    setIsDeletingUser(userId);
    try {
      await biometricService.deleteUserFromDevice(userId, device.cloud_key);
      setFetchedUsers(fetchedUsers.filter(u => (u.UserId || u.userId) !== userId));
      showToast("User deleted from device", "success");
      setUserToDelete(null);
    } catch (e: any) {
      showToast("Failed to delete user: " + e.message, "error");
    } finally {
      setIsDeletingUser(null);
    }
  };

  const handleDeleteCommand = async (commandId: number) => {
    setIsDeletingCommand(commandId);
    try {
      const success = await biometricService.deleteCommand(commandId);
      if (success) {
        showToast("Command deleted successfully", "success");
        setFetchedCommands(prev => prev.filter(c => c.id !== commandId));
        setCommandToDelete(null);
      } else {
        showToast("Failed to delete command from server", "error");
      }
    } catch (e: any) {
      showToast("Error deleting command: " + e.message, "error");
    } finally {
      setIsDeletingCommand(null);
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
      }, cloudConfig);
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
          { id: 'biometric', icon: Fingerprint, label: 'Biometric System' },
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

        {activeTab === 'biometric' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <Plus size={14} className="text-supabase-green" />
                    Register New Device
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Device Name</label>
                      <input 
                        type="text" 
                        value={newDevice.name} 
                        onChange={e => setNewDevice({...newDevice, name: e.target.value})} 
                        placeholder="e.g. Main Entrance" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Cloud Access Key</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={newDevice.cloud_key} 
                          onChange={e => setNewDevice({...newDevice, cloud_key: e.target.value})} 
                          placeholder="Enter Cloud API Key..." 
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green pr-10" 
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-supabase-muted">
                          <Shield size={14} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Location</label>
                      <input 
                        type="text" 
                        value={newDevice.location} 
                        onChange={e => setNewDevice({...newDevice, location: e.target.value})} 
                        placeholder="Ground Floor" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <button 
                      onClick={handleAddDevice}
                      disabled={isAddingDevice}
                      className="w-full py-2.5 bg-supabase-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all flex items-center justify-center gap-2"
                    >
                      {isAddingDevice ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                      Register Device
                    </button>
                  </div>
                </div>

                <div className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text flex items-center gap-2">
                    <CloudCheck size={14} className="text-supabase-green" />
                    Cloud API Config
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Base URL</label>
                      <input 
                        type="text" 
                        value={cloudConfig.baseUrl} 
                        onChange={e => setCloudConfig({...cloudConfig, baseUrl: e.target.value})} 
                        placeholder="http://192.168.1.251:94" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Username</label>
                      <input 
                        type="text" 
                        value={cloudConfig.username} 
                        onChange={e => setCloudConfig({...cloudConfig, username: e.target.value})} 
                        placeholder="biomax" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Password</label>
                      <input 
                        type="password" 
                        value={cloudConfig.password} 
                        onChange={e => setCloudConfig({...cloudConfig, password: e.target.value})} 
                        placeholder="••••••••" 
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-3 py-2 text-sm text-supabase-text outline-none focus:border-supabase-green" 
                      />
                    </div>
                    <button 
                      onClick={saveCloudConfig}
                      disabled={isSavingConfig}
                      className="w-full py-2.5 bg-supabase-sidebar border border-supabase-border text-supabase-text rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all flex items-center justify-center gap-2"
                    >
                      {isSavingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Config
                    </button>
                  </div>
                </div>

                <div className="bg-supabase-panel border border-supabase-border border-dashed rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-supabase-muted flex items-center gap-2">
                      <Activity size={12} /> System Status
                    </h4>
                    <button 
                      onClick={() => checkDatabaseConnection(true)}
                      className="p-1 text-supabase-muted hover:text-supabase-green transition-colors"
                      title="Refresh Status"
                    >
                      <RefreshCw size={10} className={dbStatus === 'Checking' ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-supabase-muted">Database</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          dbStatus === 'Connected' ? 'bg-supabase-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                          dbStatus === 'Checking' ? 'bg-orange-400 animate-pulse' : 
                          'bg-red-500'
                        }`} />
                        <span className={`text-[11px] font-bold ${
                          dbStatus === 'Connected' ? 'text-supabase-green' : 
                          dbStatus === 'Checking' ? 'text-orange-400' : 
                          'text-red-500'
                        }`}>{dbStatus}</span>
                      </div>
                    </div>
                    {dbError && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-[9px] text-red-400 leading-tight">{dbError}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-supabase-muted">Active Devices</span>
                      <span className="text-[11px] font-bold text-supabase-text">{devices.filter(d => d.status === 'Online').length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-supabase-text">Managed Devices</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSyncAllDevices}
                      disabled={isProcessing || devices.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 bg-supabase-sidebar border border-supabase-border text-supabase-muted hover:text-supabase-green hover:border-supabase-green rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Sync All
                    </button>
                    <button onClick={fetchDevices} className="p-1.5 text-supabase-muted hover:text-supabase-green transition-colors">
                      <RefreshCw size={14} className={isFetchingDevices ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {isFetchingDevices ? (
                  <div className="flex flex-col items-center justify-center py-20 text-supabase-muted opacity-30 gap-3">
                    <Loader2 size={32} className="animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Scanning Network...</p>
                  </div>
                ) : devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-supabase-muted border border-supabase-border border-dashed rounded-2xl opacity-30 gap-3">
                    <Cpu size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No devices registered</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {devices.map(device => (
                      <div key={device.id} className="bg-supabase-panel border border-supabase-border rounded-2xl p-5 group hover:border-supabase-green/30 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                              device.status === 'Online' ? 'bg-supabase-green/10 border-supabase-green/20 text-supabase-green' : 
                              device.status === 'Connecting' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                              'bg-red-500/10 border-red-500/20 text-red-500'
                            }`}>
                              {device.status === 'Online' ? <Wifi size={24} /> : device.status === 'Connecting' ? <Loader2 size={24} className="animate-spin" /> : <WifiOff size={24} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-supabase-text uppercase tracking-tight">{device.name}</h4>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                  device.status === 'Online' ? 'bg-supabase-green/10 text-supabase-green' : 
                                  device.status === 'Connecting' ? 'bg-yellow-500/10 text-yellow-500' :
                                  'bg-red-500/10 text-red-500'
                                }`}>
                                  {device.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-supabase-muted font-mono">
                                {device.location}
                                {device.cloud_key && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-supabase-sidebar border border-supabase-border rounded text-[8px] text-supabase-green">
                                    Cloud Enabled
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => testConnection(device.id)}
                              className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green hover:border-supabase-green transition-all"
                              title="Test Connection"
                            >
                              <RefreshCw size={14} className={device.status === 'Connecting' ? 'animate-spin' : ''} />
                            </button>
                            <button 
                              onClick={() => syncData(device.id, 'upload')}
                              disabled={isSyncing === `${device.id}_upload`}
                              className="flex items-center gap-2 px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green transition-all disabled:opacity-50"
                              title="Upload all system users to device"
                            >
                              {isSyncing === `${device.id}_upload` ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                              <span className="hidden sm:inline">Upload</span>
                            </button>
                            <button 
                              onClick={() => syncData(device.id, 'logs')}
                              disabled={isSyncing === `${device.id}_logs`}
                              className="flex items-center gap-2 px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green transition-all disabled:opacity-50"
                              title="Fetch attendance logs from device"
                            >
                              {isSyncing === `${device.id}_logs` ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                              <span className="hidden sm:inline">Logs</span>
                            </button>
                            <button 
                              onClick={() => syncData(device.id, 'commands')}
                              disabled={isSyncing === `${device.id}_commands`}
                              className="flex items-center gap-2 px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green transition-all disabled:opacity-50"
                              title="View command queue status"
                            >
                              {isSyncing === `${device.id}_commands` ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                              <span className="hidden sm:inline">Queue</span>
                            </button>
                            <button 
                              onClick={() => syncData(device.id, 'users')}
                              disabled={isSyncing === `${device.id}_users`}
                              className="flex items-center gap-2 px-3 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green transition-all disabled:opacity-50"
                              title="View users registered on device"
                            >
                              {isSyncing === `${device.id}_users` ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                              <span className="hidden sm:inline">Users</span>
                            </button>
                            <button 
                              onClick={() => deleteDevice(device.id)}
                              className="p-2 text-supabase-muted hover:text-red-400 transition-colors"
                              title="Remove Device"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {device.last_sync && (
                          <div className="mt-4 pt-4 border-t border-supabase-border flex items-center gap-2 text-[9px] text-supabase-muted uppercase tracking-widest">
                            <Activity size={10} />
                            Last Sync: {new Date(device.last_sync).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                      <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Database Status</p>
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
                      <p className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Auth Service</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-supabase-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-sm font-black uppercase tracking-tight text-supabase-green">Operational</span>
                      </div>
                    </div>
                  </div>

                  {dbError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
                      <WifiOff size={18} className="text-red-400 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Connection Error</p>
                        <p className="text-xs text-red-300/80 leading-relaxed font-mono">{dbError}</p>
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

      {/* Users Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Users on {selectedDeviceName}</h3>
                <p className="text-[10px] text-supabase-muted font-black uppercase tracking-widest mt-1">Found {fetchedUsers.length} registered users</p>
              </div>
              <button 
                onClick={() => setShowUsersModal(false)}
                className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-sidebar rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {fetchedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-supabase-muted opacity-30 gap-3">
                  <Fingerprint size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No users found on this device</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fetchedUsers.map((user, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-supabase-border bg-supabase-sidebar flex flex-col gap-3 group hover:border-supabase-green/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-supabase-green/10 flex items-center justify-center text-supabase-green font-black text-xs shrink-0">
                          {(user.userName || user.userId || '?').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black text-supabase-text uppercase tracking-tight truncate">{user.userName || 'Unknown'}</p>
                            <div 
                              className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-supabase-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} 
                              title={user.isActive ? 'Active' : 'Inactive'} 
                            />
                          </div>
                          <p className="text-[10px] text-supabase-muted font-mono">ID: {user.userId}</p>
                        </div>
                        <button
                          onClick={() => setUserToDelete({ id: user.userId, name: user.userName || 'Unknown' })}
                          disabled={isDeletingUser === user.userId}
                          className="p-2 text-supabase-muted hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete User from Device"
                        >
                          {isDeletingUser === user.userId ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-3 border-t border-supabase-border/30">
                        <div className="flex items-center gap-1.5 text-[9px] text-supabase-muted uppercase tracking-widest">
                          <Shield size={10} className="text-supabase-green" />
                          <span className="truncate">{user.privilege || 'USER'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-supabase-muted uppercase tracking-widest">
                          <Fingerprint size={10} className="text-supabase-green" />
                          <span>FP: {user.fpCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-supabase-muted uppercase tracking-widest">
                          <UserCheck size={10} className="text-supabase-green" />
                          <span>FACE: {user.faceCount || 0}</span>
                        </div>
                        {user.cardNumber && (
                          <div className="flex items-center gap-1.5 text-[9px] text-supabase-green uppercase tracking-widest font-mono">
                            <Link2 size={10} />
                            <span className="truncate">{user.cardNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-supabase-border bg-supabase-sidebar flex justify-end">
              <button
                onClick={() => setShowUsersModal(false)}
                className="px-6 py-2 bg-supabase-panel border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Confirm Deletion</h3>
              <p className="text-xs text-supabase-muted">
                Are you sure you want to delete user <strong>{userToDelete.name}</strong> (ID: {userToDelete.id}) from this device? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-2 bg-supabase-sidebar border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUserFromDevice(userToDelete.id)}
                disabled={isDeletingUser === userToDelete.id}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingUser === userToDelete.id ? <Loader2 size={12} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Delete Confirmation Modal */}
      {commandToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Delete Command</h3>
              <p className="text-xs text-supabase-muted">
                Are you sure you want to delete command <strong>{commandToDelete.title}</strong> (ID: {commandToDelete.id}) from the history?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setCommandToDelete(null)}
                className="flex-1 px-4 py-2 bg-supabase-sidebar border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCommand(commandToDelete.id)}
                disabled={isDeletingCommand === commandToDelete.id}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingCommand === commandToDelete.id ? <Loader2 size={12} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Device Logs: {selectedDeviceName}</h3>
                <p className="text-[10px] text-supabase-muted font-black uppercase tracking-widest mt-1">Raw attendance data from device</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => syncData(selectedDeviceId, 'logs')}
                  className="p-2 text-supabase-muted hover:text-supabase-green transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={isFetchingLogs ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setShowLogsModal(false)}
                  className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-sidebar rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {fetchedLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-supabase-border">
                          <th className="py-3 px-4 text-[9px] font-black text-supabase-muted uppercase tracking-widest">User</th>
                          <th className="py-3 px-4 text-[9px] font-black text-supabase-muted uppercase tracking-widest">User ID</th>
                          <th className="py-3 px-4 text-[9px] font-black text-supabase-muted uppercase tracking-widest">Time</th>
                          <th className="py-3 px-4 text-[9px] font-black text-supabase-muted uppercase tracking-widest">Mode</th>
                          <th className="py-3 px-4 text-[9px] font-black text-supabase-muted uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fetchedLogs.map((log, idx) => (
                          <tr key={idx} className="border-b border-supabase-border/50 hover:bg-supabase-sidebar/50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="text-xs font-black text-supabase-text uppercase tracking-tight">{log.userName || 'Unknown'}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-[10px] text-supabase-muted font-mono">{log.userId}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-[10px] text-supabase-text font-mono">{log.ioTime}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-supabase-panel border border-supabase-border text-[8px] font-black uppercase tracking-widest text-supabase-muted">
                                {log.verifyMode || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                log.ioMode === 'Check-In' ? 'bg-supabase-green/20 text-supabase-green border border-supabase-green/30' :
                                'bg-supabase-panel border border-supabase-border text-supabase-muted'
                              }`}>
                                {log.ioMode || 'Entry'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-supabase-muted opacity-30 gap-3">
                    <Activity size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No logs found for today</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-supabase-border bg-supabase-sidebar flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-8 py-2 bg-supabase-panel border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Queue Modal */}
      {showCommandsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Command Queue: {selectedDeviceName}</h3>
                <p className="text-[10px] text-supabase-muted font-black uppercase tracking-widest mt-1">Live status of device operations</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => syncData(selectedDeviceId, 'commands')}
                  className="p-2 text-supabase-muted hover:text-supabase-green transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={isFetchingCommands ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setShowCommandsModal(false)}
                  className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-sidebar rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {fetchedCommands.length > 0 ? (
                  fetchedCommands.map((cmd, idx) => (
                    <div key={idx} className="p-4 bg-supabase-sidebar border border-supabase-border rounded-xl flex items-center justify-between group hover:border-supabase-green/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          cmd.status === 'Success' ? 'bg-supabase-green/10 text-supabase-green' :
                          cmd.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {cmd.status === 'Success' ? <Check size={16} /> : 
                           cmd.status === 'Pending' ? <Clock size={16} /> : 
                           <X size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-supabase-text uppercase tracking-tight">
                            {cmd.title || cmd.commandType || 'Unknown Command'}
                          </p>
                          <p className="text-[10px] text-supabase-muted font-mono">
                            ID: {cmd.id || 'N/A'} • {cmd.createTime ? new Date(cmd.createTime).toLocaleString() : 'No date'}
                          </p>
                          {cmd.createdBy && (
                            <p className="text-[9px] text-supabase-muted mt-0.5 font-mono italic">By: {cmd.createdBy}</p>
                          )}
                          {cmd.executionResult && cmd.executionResult !== 'OK' && (
                            <p className="text-[9px] text-red-400 mt-1 font-mono">Result: {cmd.executionResult}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            cmd.status === 'Success' ? 'bg-supabase-green/20 text-supabase-green border border-supabase-green/30' :
                            cmd.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-500 border border-red-500/30'
                          }`}>
                            {cmd.status || 'Unknown'}
                          </span>
                          {cmd.responseTime && (
                            <p className="text-[9px] text-supabase-muted mt-1 font-mono">Processed: {cmd.responseTime}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setCommandToDelete({ id: cmd.id, title: cmd.title || cmd.commandType })}
                          className="p-2 text-supabase-muted hover:text-red-500 transition-colors"
                          title="Delete command"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-supabase-muted opacity-30 gap-3">
                    <Activity size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No commands in queue</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-supabase-border bg-supabase-sidebar flex justify-end">
              <button
                onClick={() => setShowCommandsModal(false)}
                className="px-8 py-2 bg-supabase-panel border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Selection Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest">Upload Students to {selectedDeviceName}</h3>
                <p className="text-[10px] text-supabase-muted font-black uppercase tracking-widest mt-1">Select students to enroll on device</p>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-sidebar rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-supabase-border bg-supabase-panel/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={14} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={uploadSearchTerm}
                  onChange={(e) => setUploadSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-supabase-sidebar border border-supabase-border rounded-xl text-[10px] text-supabase-text focus:border-supabase-green outline-none transition-all uppercase font-black tracking-widest"
                />
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">
                  {selectedStudentIds.size} Selected
                </p>
                <button
                  onClick={toggleAllStudents}
                  className="text-[10px] font-black text-supabase-green uppercase tracking-widest hover:underline"
                >
                  {selectedStudentIds.size === filteredDbStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDbStudents.map((student) => (
                  <div 
                    key={student.id} 
                    onClick={() => toggleStudentSelection(student.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 group ${
                      selectedStudentIds.has(student.id) 
                        ? 'border-supabase-green bg-supabase-green/5' 
                        : 'border-supabase-border bg-supabase-sidebar hover:border-supabase-green/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      selectedStudentIds.has(student.id)
                        ? 'bg-supabase-green border-supabase-green text-black'
                        : 'border-supabase-border bg-supabase-panel'
                    }`}>
                      {selectedStudentIds.has(student.id) && <Check size={12} strokeWidth={4} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-supabase-text uppercase tracking-tight truncate">{student.full_name}</p>
                      <p className="text-[10px] text-supabase-muted font-mono">ID: {student.roll_number || student.id}</p>
                    </div>
                  </div>
                ))}
              </div>
              {filteredDbStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-supabase-muted opacity-30 gap-3">
                  <Search size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No matching students found</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-supabase-border bg-supabase-sidebar flex flex-col gap-4">
              {uploadProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-black text-supabase-green uppercase tracking-widest animate-pulse">
                        Uploading: {uploadProgress.currentName}
                      </p>
                      <button 
                        onClick={() => {
                          setShowUploadModal(false);
                          syncData(selectedDeviceId, 'commands');
                        }}
                        className="text-[8px] font-black text-supabase-muted hover:text-supabase-green uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                        <Activity size={10} /> View Command Queue
                      </button>
                    </div>
                    <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">
                      {uploadProgress.current} / {uploadProgress.total}
                    </p>
                  </div>
                  <div className="h-1.5 w-full bg-supabase-panel rounded-full overflow-hidden border border-supabase-border">
                    <div 
                      className="h-full bg-supabase-green transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploadingSelected}
                  className="px-6 py-2 bg-supabase-panel border border-supabase-border text-supabase-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-supabase-green transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSelected}
                  disabled={selectedStudentIds.size === 0 || isUploadingSelected}
                  className="px-8 py-2 bg-supabase-green text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-supabase-green/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingSelected ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Upload Selected
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
