
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Trash2, Mail, Phone, Briefcase, User, Edit2, Loader2, Building2, Shield, X, Award, ChevronRight, Filter, BookOpen, ArrowLeft, Calendar, Fingerprint, Globe, FileText, CreditCard, Book, Activity, Download, Upload, Check, Save, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  job_role: string;
  department?: string;
  designation?: string;
  salary_grade_id?: string;
  status: string;
  created_at?: string;
}

interface PersonnelTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
}

type ProfileTab = 'overview' | 'document' | 'work_progress';

const EmployeesView: React.FC = () => {
  const { departments, designations, departmentDesignationMap } = useAuth();
  const { showToast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
  
  // Mocking available grades for selection
  const availableGrades = [
    { id: '1', name: 'Grade T1 (Entry)' },
    { id: '2', name: 'Grade T4 (Senior)' },
    { id: '3', name: 'Grade A2 (Admin)' },
    { id: '4', name: 'Grade M1 (Manager)' },
  ];

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  const [employeeTasks, setEmployeeTasks] = useState<PersonnelTask[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', description: '', due_date: '', priority: 'medium' });

  const [formData, setFormData] = useState<Partial<Employee>>({
    full_name: '',
    email: '',
    mobile: '',
    job_role: 'None',
    department: '',
    designation: '',
    salary_grade_id: '',
    status: 'Inactive'
  });

  useEffect(() => {
    fetchEmployees();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId && activeProfileTab === 'work_progress') {
      fetchEmployeeTasks(selectedEmployeeId);
    }
  }, [selectedEmployeeId, activeProfileTab]);

  const fetchEmployeeTasks = async (empId: string) => {
    if (!supabase) return;
    setIsTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('personnel_tasks')
        .select('*')
        .eq('assigned_to', empId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmployeeTasks(data as PersonnelTask[] || []);
    } catch (e: any) {
      showToast("Failed to fetch tasks: " + e.message, "error");
    } finally {
      setIsTasksLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedEmployeeId) return;
    
    try {
      const { error } = await supabase
        .from('personnel_tasks')
        .insert([{
          ...newTaskData,
          assigned_to: selectedEmployeeId,
          status: 'pending'
        }]);
      
      if (error) throw error;
      showToast("Task assigned successfully", "success");
      setIsAddingTask(false);
      setNewTaskData({ title: '', description: '', due_date: '', priority: 'medium' });
      fetchEmployeeTasks(selectedEmployeeId);
    } catch (e: any) {
      showToast("Failed to add task: " + e.message, "error");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!supabase || !selectedEmployeeId) return;
    try {
      const { error } = await supabase
        .from('personnel_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) throw error;
      fetchEmployeeTasks(selectedEmployeeId);
    } catch (e: any) {
      showToast("Update failed: " + e.message, "error");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!supabase || !selectedEmployeeId) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const { error } = await supabase
        .from('personnel_tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      showToast("Task deleted successfully", "success");
      fetchEmployeeTasks(selectedEmployeeId);
    } catch (e: any) {
      showToast("Deletion failed: " + e.message, "error");
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('full_name', { ascending: true });
            
            if (error) throw error;
            setEmployees(data as Employee[] || []);
        } catch (e: any) {
            showToast("Failed to fetch employees: " + e.message, "error");
        }
    }
    setIsLoading(false);
  };

  const fetchSubjects = async () => {
    try {
      const subs = await scheduleService.getSubjects();
      setAvailableSubjects(subs);
    } catch (e) {
      console.error("Failed to fetch subjects", e);
    }
  };

  const handleOpenModal = (e: React.MouseEvent, emp?: Employee) => {
    e.stopPropagation();
    if (emp) {
        setEditingId(emp.id);
        setFormData({
            full_name: emp.full_name,
            email: emp.email,
            mobile: emp.mobile || '',
            job_role: emp.job_role || 'None',
            department: emp.department || '',
            designation: emp.designation || '',
            salary_grade_id: emp.salary_grade_id || '',
            status: emp.status || 'Inactive'
        });
    } else {
        setEditingId(null);
        setFormData({
            full_name: '',
            email: '',
            mobile: '',
            job_role: 'None',
            department: '',
            designation: '',
            salary_grade_id: '',
            status: 'Inactive'
        });
    }
    setIsModalOpen(true);
  };

  // Fixed: Implemented handleDelete function
  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!supabase) return;
    if (!window.confirm(`Are you sure you want to remove ${name} from the matrix?`)) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      
      showToast(`${name} removed from registry`, 'success');
      if (selectedEmployeeId === id) setSelectedEmployeeId(null);
      fetchEmployees();
    } catch (err: any) {
      showToast("Deletion failed: " + err.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      setIsSubmitting(true);

      try {
          if (editingId) {
             const { error } = await supabase.from('employees').update(formData).eq('id', editingId);
             if (error) throw error;
             showToast('Employee updated successfully', 'success');
          } else {
             const { error } = await supabase.from('employees').insert([formData]);
             if (error) throw error;
             showToast('Employee added successfully', 'success');
          }
          fetchEmployees();
          setIsModalOpen(false);
      } catch (e: any) {
          showToast(e.message, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeptChange = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      department: dept,
      designation: '',
      job_role: 'None'
    }));
  };

  const filteredDesignations = useMemo(() => {
    if (!formData.department) return [];
    return departmentDesignationMap[formData.department] || [];
  }, [formData.department, departmentDesignationMap]);

  const isAcademicFaculty = useMemo(() => {
    const facultyDesignations = ['Teacher', 'Faculty Coordinator'];
    return formData.department === 'Academic' && formData.designation && facultyDesignations.includes(formData.designation);
  }, [formData.department, formData.designation]);

  const filteredEmployees = employees.filter(e => 
    e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const renderProfileContent = (emp: Employee) => {
    switch (activeProfileTab) {
      case 'document':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-supabase-text">Document Vault</h3>
                <p className="text-[10px] text-supabase-muted font-mono uppercase mt-1 tracking-tighter">Encrypted Storage ID: {emp.id.slice(0,8)}</p>
              </div>
              <button className="bg-supabase-green text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20">
                <Upload size={14} /> Upload New
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'National ID', date: '12/04/2024', status: 'verified' },
                { name: 'Degree Certificate', date: '12/04/2024', status: 'verified' },
                { name: 'Offer Letter', date: '15/04/2024', status: 'verified' },
                { name: 'Employment Contract', date: '16/04/2024', status: 'pending' }
              ].map((doc) => (
                <div key={doc.name} className="bg-supabase-panel border border-supabase-border rounded-xl p-4 flex items-center justify-between group hover:border-supabase-green/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-supabase-sidebar rounded-lg text-supabase-muted group-hover:text-supabase-green transition-colors">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-supabase-text">{doc.name}</div>
                      <div className="text-[9px] text-supabase-muted uppercase tracking-tighter flex items-center gap-1">
                        {doc.status === 'verified' ? <Check size={10} className="text-supabase-green" /> : <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                        {doc.status.toUpperCase()} • {doc.date}
                      </div>
                    </div>
                  </div>
                  <button className="text-supabase-muted hover:text-supabase-green transition-colors p-1.5 rounded hover:bg-supabase-sidebar"><Download size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'work_progress':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 pb-12">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-supabase-text">Active KPIs & Work Progress</h3>
              <button 
                onClick={() => setIsAddingTask(true)}
                className="bg-supabase-green text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
              >
                <Plus size={14} /> Assign Task
              </button>
            </div>

            {isAddingTask && (
              <div className="bg-supabase-panel border border-supabase-green/30 rounded-2xl p-6 animate-in slide-in-from-top-4">
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      placeholder="Task Title"
                      value={newTaskData.title}
                      onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                      className="bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2 text-xs text-supabase-text outline-none focus:border-supabase-green"
                    />
                    <input 
                      required
                      type="date"
                      value={newTaskData.due_date}
                      onChange={e => setNewTaskData({...newTaskData, due_date: e.target.value})}
                      className="bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2 text-xs text-supabase-text outline-none focus:border-supabase-green"
                    />
                  </div>
                  <textarea 
                    placeholder="Task Description"
                    value={newTaskData.description}
                    onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                    className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2 text-xs text-supabase-text outline-none focus:border-supabase-green h-20"
                  />
                  <div className="flex justify-between items-center">
                    <select 
                      value={newTaskData.priority}
                      onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as any})}
                      className="bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2 text-xs text-supabase-text outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsAddingTask(false)} className="px-4 py-2 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Cancel</button>
                      <button type="submit" className="bg-supabase-green text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Create Task</button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Task Completion Rate', 
                  val: employeeTasks.length > 0 ? Math.round((employeeTasks.filter(t => t.status === 'completed').length / employeeTasks.length) * 100) : 0, 
                  color: 'bg-supabase-green', 
                  text: 'text-supabase-green' 
                },
                { label: 'Attendance Consistency', val: 98, color: 'bg-blue-400', text: 'text-blue-400' },
                { label: 'Student Satisfaction', val: 94, color: 'bg-purple-400', text: 'text-purple-400' },
                { label: 'Pending Tasks', val: employeeTasks.filter(t => t.status !== 'completed').length, color: 'bg-yellow-400', text: 'text-yellow-400', isCount: true }
              ].map(stat => (
                <div key={stat.label} className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 shadow-lg group hover:border-supabase-green/30 transition-all">
                   <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-black uppercase text-supabase-muted tracking-widest leading-none">{stat.label}</span>
                      <span className={`text-xs font-black ${stat.text}`}>{stat.val}{stat.isCount ? '' : '%'}</span>
                   </div>
                   {!stat.isCount ? (
                     <div className="w-full h-1.5 bg-supabase-sidebar rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${stat.val}%` }}></div>
                     </div>
                   ) : (
                     <div className="flex items-end gap-2 mb-2">
                       <div className="text-2xl font-black text-supabase-text leading-none">{stat.val}</div>
                       <div className="text-[10px] text-supabase-muted font-bold uppercase tracking-tighter mb-0.5">Active Items</div>
                     </div>
                   )}
                   <div className="text-[9px] text-supabase-muted font-bold uppercase tracking-tighter italic">Last updated: Just now</div>
                </div>
              ))}
            </div>

            <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-6 sm:p-8 shadow-lg">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-supabase-text mb-6 flex items-center gap-2">
                <Activity size={16} className="text-supabase-green" /> Personnel Task Registry
              </h4>
              
              {isTasksLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-supabase-green" size={24} />
                </div>
              ) : employeeTasks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-supabase-border rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-supabase-muted">No active tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employeeTasks.map((task) => (
                    <div key={task.id} className="p-4 bg-supabase-sidebar border border-supabase-border rounded-2xl flex items-center justify-between group hover:border-supabase-green/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-supabase-green' : 
                          task.status === 'in-progress' ? 'bg-blue-400 animate-pulse' : 'bg-yellow-500'
                        }`} />
                        <div>
                          <div className="text-xs font-bold text-supabase-text uppercase tracking-tight">{task.title}</div>
                          <div className="text-[9px] text-supabase-muted uppercase tracking-widest mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()} • Priority: {task.priority}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status !== 'completed' && (
                          <button 
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="p-2 bg-supabase-green/10 text-supabase-green hover:bg-supabase-green hover:text-black rounded-lg transition-all"
                            title="Mark as Completed"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          title="Delete Task"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button className="p-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-text transition-all">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
            <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg">
              <h3 className="text-[10px] font-black uppercase text-supabase-muted tracking-[0.2em] flex items-center gap-2">
                <Globe size={14} className="text-supabase-green" /> Connectivity & Credentials
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-2xl flex items-center gap-4 group hover:border-supabase-green/30 transition-all">
                  <div className="p-3 bg-supabase-panel border border-supabase-border rounded-xl text-supabase-muted group-hover:text-supabase-green transition-colors">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Administrative Email</div>
                    <div className="text-sm font-bold text-supabase-text truncate">{emp.email || 'None provided'}</div>
                  </div>
                </div>

                <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-2xl flex items-center gap-4 group hover:border-supabase-green/30 transition-all">
                  <div className="p-3 bg-supabase-panel border border-supabase-border rounded-xl text-supabase-muted group-hover:text-supabase-green transition-colors">
                    <Phone size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Mobile Contact</div>
                    <div className="text-sm font-bold text-supabase-text truncate">{emp.mobile || 'None provided'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg">
              <h3 className="text-[10px] font-black uppercase text-supabase-muted tracking-[0.2em] flex items-center gap-2">
                <Shield size={14} className="text-supabase-green" /> Governance & Expertise
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-2xl flex items-center gap-4 group hover:border-supabase-green/30 transition-all">
                  <div className="p-3 bg-supabase-panel border border-supabase-border rounded-xl text-supabase-muted group-hover:text-supabase-green transition-colors">
                    <Briefcase size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Internal System Role</div>
                    <div className="text-sm font-bold text-supabase-text truncate">{emp.job_role || 'General Staff'}</div>
                  </div>
                </div>

                <div className="p-4 bg-supabase-sidebar border border-supabase-border rounded-2xl flex items-center gap-4 group hover:border-supabase-green/30 transition-all">
                  <div className="p-3 bg-supabase-panel border border-supabase-border rounded-xl text-supabase-muted group-hover:text-supabase-green transition-colors">
                    <Scale size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black text-supabase-muted uppercase tracking-widest">Assigned Salary Grade</div>
                    <div className="text-sm font-bold text-supabase-text truncate uppercase tracking-widest">
                        {availableGrades.find(g => g.id === emp.salary_grade_id)?.name || 'Pending Definition'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const renderProfile = (emp: Employee) => (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="min-h-[4rem] border-b border-supabase-border bg-supabase-panel flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-0 shrink-0 gap-4 sm:gap-0">
        <button 
          onClick={() => { setSelectedEmployeeId(null); setActiveProfileTab('overview'); }}
          className="flex items-center gap-2 text-supabase-muted hover:text-supabase-text transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              onClick={(e) => handleOpenModal(e, emp)}
              className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-supabase-green transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => handleDelete(e, emp.id, emp.full_name)}
              className="p-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-supabase-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8 bg-supabase-bg">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          {/* Hero Header */}
          <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-supabase-green/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-[2.5rem] bg-supabase-sidebar border-2 border-supabase-border flex items-center justify-center text-5xl font-black text-supabase-muted shadow-2xl group-hover:border-supabase-green transition-all">
                  {emp.full_name.charAt(0)}
                </div>
                <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full border-4 border-supabase-panel text-[10px] font-black uppercase tracking-widest shadow-lg ${emp.status === 'Active' ? 'bg-supabase-green text-black' : 'bg-red-500 text-white'}`}>
                  {emp.status}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-3">
                <h1 className="text-4xl font-black text-supabase-text tracking-tight uppercase leading-none">{emp.full_name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-supabase-muted">
                  <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest">
                    <Fingerprint size={12} className="text-supabase-green" />
                    ID: {emp.id.slice(0, 18).toUpperCase()}
                  </div>
                  <div className="w-1 h-1 bg-supabase-border rounded-full hidden md:block"></div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} className="text-supabase-green" />
                    JOINED {emp.created_at ? new Date(emp.created_at).toLocaleDateString().toUpperCase() : 'N/A'}
                  </div>
                </div>
                
                <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-2">
                   <div className="px-4 py-1.5 rounded-xl bg-supabase-green/10 border border-supabase-green/20 text-supabase-green text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Building2 size={12} /> {emp.department || 'Unassigned'}
                   </div>
                   <div className="px-4 py-1.5 rounded-xl bg-supabase-sidebar border border-supabase-border text-supabase-muted text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Award size={12} /> {emp.designation || 'Staff'}
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex border-b border-supabase-border gap-4 sm:gap-10 overflow-x-auto scrollbar-hide px-2">
             {[
               { id: 'overview', label: 'Overview', icon: User },
               { id: 'document', label: 'Documents', icon: FileText },
               { id: 'work_progress', label: 'Work Progress', icon: Activity }
             ].map((tab) => (
               <button 
                 key={tab.id}
                 onClick={() => { setActiveProfileTab(tab.id as ProfileTab); }}
                 className={`pb-4 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 transition-all relative whitespace-nowrap ${activeProfileTab === tab.id ? 'text-supabase-green' : 'text-supabase-muted hover:text-supabase-text'}`}
               >
                 <tab.icon size={14} />
                 {tab.label}
                 {activeProfileTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-supabase-green rounded-full shadow-[0_0_8px_rgba(62,207,142,0.4)]"></div>}
               </button>
             ))}
          </div>

          <div className="min-h-[300px]">
            {renderProfileContent(emp)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-supabase-bg">
      {selectedEmployeeId && selectedEmployee ? (
        renderProfile(selectedEmployee)
      ) : (
        <>
          <div className="min-h-[4rem] border-b border-supabase-border bg-supabase-panel flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-0 shrink-0 shadow-sm z-10 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-supabase-green/10 rounded-lg shadow-inner">
                    <Briefcase className="text-supabase-green" size={20} />
                 </div>
                 <div>
                    <h1 className="text-sm font-black text-supabase-text leading-none uppercase tracking-widest">Personnel Matrix</h1>
                    <p className="text-[10px] text-supabase-muted mt-1 uppercase tracking-tighter">Human Resource Core</p>
                 </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                 <div className="relative group flex-1 sm:flex-none">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="bg-supabase-sidebar border border-supabase-border rounded-full py-1.5 pl-9 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green w-full sm:w-72 transition-all shadow-inner" 
                    />
                </div>
                <button onClick={(e) => handleOpenModal(e)} className="bg-supabase-green text-black p-2 sm:px-4 sm:py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 flex items-center gap-2 shrink-0" title="Enroll Person">
                    <Plus size={14} />
                    <span className="hidden sm:inline">Enroll Person</span>
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 scrollbar-hide">
            {isLoading ? (
                 <div className="h-full flex flex-col items-center justify-center gap-4 text-supabase-muted animate-pulse">
                     <Loader2 className="animate-spin text-supabase-green" size={32} />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Matrix Storage...</span>
                 </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-supabase-muted opacity-40 space-y-4">
                    <Briefcase size={64} strokeWidth={1} />
                    <p className="text-xs font-black uppercase tracking-widest text-center">No matching personnel<br/>found in database.</p>
                </div>
            ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                     {filteredEmployees.map(emp => (
                         <div 
                           key={emp.id} 
                           onClick={() => setSelectedEmployeeId(emp.id)}
                           className="bg-supabase-panel border border-supabase-border rounded-2xl p-6 hover:border-supabase-green/40 transition-all group relative shadow-lg hover:shadow-supabase-green/5 overflow-hidden cursor-pointer ring-1 ring-white/5"
                         >
                             <div className="absolute top-0 right-0 w-24 h-24 bg-supabase-green/5 rounded-full -mr-12 -mt-12 group-hover:bg-supabase-green/10 transition-all duration-500"></div>
                             
                             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                  <button onClick={(e) => handleOpenModal(e, emp)} className="p-1.5 text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 rounded-md transition-colors shadow-sm"><Edit2 size={14} /></button>
                                  <button onClick={(e) => handleDelete(e, emp.id, emp.full_name)} className="p-1.5 text-supabase-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shadow-sm"><Trash2 size={14} /></button>
                             </div>
                             
                             <div className="flex flex-col gap-5 relative z-0">
                                 <div className="flex items-start gap-4">
                                     <div className="relative shrink-0">
                                        <div className="w-14 h-14 rounded-2xl bg-supabase-sidebar border border-supabase-border flex items-center justify-center text-2xl font-black text-supabase-muted group-hover:text-supabase-green transition-all shadow-inner">
                                            {emp.full_name ? emp.full_name.charAt(0) : '?'}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-supabase-panel shadow-sm ${emp.status === 'Active' ? 'bg-supabase-green' : 'bg-red-500'}`}></div>
                                     </div>
                                     <div className="min-w-0 flex-1">
                                         <h3 className="font-black text-supabase-text truncate tracking-tight text-base leading-tight uppercase">{emp.full_name}</h3>
                                         <div className="text-[10px] font-mono text-supabase-muted truncate mt-1 opacity-70">{emp.email || 'No email registered'}</div>
                                     </div>
                                 </div>

                                 <div className="space-y-4 bg-supabase-bg/40 p-4 rounded-xl border border-supabase-border/50 shadow-inner">
                                     <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-supabase-muted tracking-widest opacity-80">
                                            <Building2 size={12} className="text-supabase-green/60" />
                                            <span>{emp.department || 'Unassigned Dept'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-1 text-supabase-muted">
                                            <div className="w-px h-2 bg-supabase-border ml-1.5"></div>
                                            <ChevronRight size={10} className="text-supabase-border opacity-50" />
                                            <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-supabase-green/10 text-supabase-green border border-supabase-green/20 text-[9px] font-black uppercase tracking-[0.15em]">
                                                {emp.designation || 'Staff'}
                                            </div>
                                        </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            )}
          </div>
        </>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
              <div className="bg-supabase-panel border border-supabase-border rounded-[1.5rem] sm:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh] ring-1 ring-white/10 animate-in zoom-in-95 duration-200">
                  <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-supabase-border bg-supabase-sidebar shrink-0">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 bg-supabase-green/10 rounded-xl shadow-inner">
                                <Briefcase size={18} className="text-supabase-green" />
                            </div>
                            <h2 className="text-xs font-black text-supabase-text uppercase tracking-[0.3em] truncate">{editingId ? 'Modify Matrix Record' : 'Enroll New Personnel'}</h2>
                         </div>
                         <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text transition-colors p-2 hover:bg-supabase-bg rounded-lg shrink-0"><X size={20} /></button>
                      </div>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto scrollbar-hide">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.2em]">Full Legal Name</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={18} />
                            <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded-xl pl-12 pr-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none transition-all shadow-inner" placeholder="Johnathan Doe" />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="space-y-3">
                                <label className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.2em]">Official Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={18} />
                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded-xl pl-12 pr-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none transition-all shadow-inner" placeholder="j.doe@system.unacademy" />
                                </div>
                           </div>
                           <div className="space-y-3">
                                <label className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.2em]">Mobile Connection</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-green transition-colors" size={18} />
                                    <input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded-xl pl-12 pr-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none transition-all shadow-inner" placeholder="+1 (555) 000-0000" />
                                </div>
                           </div>
                      </div>

                      <div className="p-6 bg-supabase-bg/40 border border-supabase-border rounded-2xl space-y-6 shadow-inner">
                          <div className="flex items-center justify-between pb-3 border-b border-supabase-border/50">
                             <div className="flex items-center gap-3">
                                <Building2 size={16} className="text-supabase-green" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-supabase-text">Organizational Placement</span>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                               <div className="space-y-3">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Parent Division</label>
                                    <select 
                                        value={formData.department} 
                                        onChange={e => handleDeptChange(e.target.value)} 
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none cursor-pointer appearance-none font-bold"
                                    >
                                        <option value="">Choose Unit</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                               </div>
                               <div className="space-y-3">
                                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Active Designation</label>
                                    <select 
                                        value={formData.designation} 
                                        onChange={e => setFormData({...formData, designation: e.target.value})} 
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-xl px-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none cursor-pointer appearance-none font-bold disabled:opacity-30"
                                        disabled={!formData.department}
                                    >
                                        <option value="">Select Division First</option>
                                        {filteredDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                               </div>
                          </div>

                          <div className="pt-4 space-y-3">
                                <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Scale size={14} /> Compensation Grade Mapping
                                </label>
                                <select 
                                    value={formData.salary_grade_id} 
                                    onChange={e => setFormData({...formData, salary_grade_id: e.target.value})} 
                                    className="w-full bg-supabase-sidebar border border-purple-500/20 rounded-xl px-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none cursor-pointer font-black uppercase tracking-widest"
                                >
                                    <option value="">Unassigned (Review Required)</option>
                                    {availableGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                          </div>
                      </div>

                      {isAcademicFaculty && (
                          <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                              <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                <BookOpen size={14} /> Subject Specialization catalog
                              </label>
                              <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:text-supabase-green transition-colors"><ChevronRight size={18} /></div>
                                <select 
                                    value={formData.job_role === 'None' ? '' : formData.job_role} 
                                    onChange={e => setFormData({...formData, job_role: e.target.value})} 
                                    className="w-full bg-supabase-bg border border-blue-500/30 rounded-xl pl-12 pr-4 py-3 text-sm text-supabase-text focus:border-supabase-green outline-none transition-all cursor-pointer shadow-lg font-black uppercase tracking-widest appearance-none"
                                >
                                    <option value="">Select Domain Subject</option>
                                    {availableSubjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                                </select>
                              </div>
                          </div>
                      )}

                      <div className="pt-6 flex justify-end gap-4 border-t border-supabase-border mt-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-supabase-muted hover:text-supabase-text transition-colors uppercase tracking-[0.3em]">Cancel Enrollment</button>
                          <button type="submit" disabled={isSubmitting} className="bg-supabase-green text-black px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.25em] hover:bg-supabase-greenHover disabled:opacity-50 transition-all shadow-xl shadow-supabase-green/20">
                              {isSubmitting ? 'Processing Transaction...' : 'Commit Matrix Entry'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default EmployeesView;
