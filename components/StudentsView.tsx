
import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, Loader2, Mail, Phone, User, GraduationCap, MapPin, Calendar, MoreVertical, Edit2, Trash2, Download, X, ArrowLeft, Shield, Award, Clock, FileText, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { validateMobileNumber } from '../services/validationService';
import { useToast } from '../context/ToastContext';
import { ClassInfo, Student, Parent } from '../types';

const StudentsView: React.FC = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All Classes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Parent Search State
  const [searchTermParent, setSearchTermParent] = useState('');
  const [showAddParentForm, setShowAddParentForm] = useState(false);
  const [newParent, setNewParent] = useState<Partial<Parent>>({ full_name: '', phone: '', status: 'active' });

  // Attendance History State
  const [isAttendanceHistoryOpen, setIsAttendanceHistoryOpen] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // Edit/Add Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        // Fetch classes, students, and parents in parallel
        const [classData] = await Promise.all([
          scheduleService.getClasses(),
          fetchStudents(),
          fetchParents()
        ]);
        setClasses(classData);
      } catch (error: any) {
        showToast("Initialization failed: " + error.message, "error");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  const fetchStudents = async () => {
    if (!supabase) return;
    
    try {
      let query = supabase.from('students').select('*').order('full_name', { ascending: true });
      
      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
      
      // Update selected student if we are in profile view to reflect changes
      if (selectedStudent) {
        const updated = data?.find(s => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (error: any) {
      showToast("Failed to fetch students: " + error.message, "error");
    }
  };

  const fetchParents = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('parents').select('*').order('full_name', { ascending: true });
      if (error) throw error;
      setParents(data || []);
    } catch (error: any) {
      console.error("Failed to fetch parents:", error.message);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent({ ...student });
    const parent = parents.find(p => p.id === student.parent_id);
    setSearchTermParent(parent ? parent.full_name : '');
    setShowAddParentForm(false);
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIsEditModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStudent) return;

    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !supabase) return;

    setIsSaving(true);
    try {
      if (showAddParentForm) {
        if (!newParent.full_name || !newParent.phone || !newParent.email || !newParent.occupation) {
            throw new Error("Please fill all required New Parent details (Name, Phone, Email, Occupation)");
        }
        const validation = await validateMobileNumber(newParent.phone, 'parents');
        if (!validation.isValid) throw new Error(validation.error || "Invalid mobile number");
      } else if (editingStudent.contact_number) {
        // Validate contact number length
        const numericOnly = editingStudent.contact_number.replace(/\D/g, '');
        if (numericOnly.length !== 10) throw new Error("Mobile number must be exactly 10 digits");
      }

      let finalPhotoUrl = editingStudent.profile_photo_url;
      
      if (selectedPhotoFile) {
        setIsUploading(true);
        const result = await scheduleService.uploadStudentPhoto(selectedPhotoFile);
        if (result.success && result.url) {
          finalPhotoUrl = result.url;
        } else {
          showToast("Photo upload failed: " + result.error, "error");
          setIsUploading(false);
          setIsSaving(false);
          return;
        }
        setIsUploading(false);
      }

      let finalParentId = editingStudent.parent_id;
      let finalGuardianName = editingStudent.guardian_name;
      let finalContactNumber = editingStudent.contact_number;

      // If adding a new parent
      if (showAddParentForm && newParent.full_name && newParent.phone) {
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .insert({
            full_name: newParent.full_name,
            phone: newParent.phone,
            email: newParent.email,
            address: newParent.address,
            occupation: newParent.occupation,
            status: 'active'
          })
          .select()
          .single();

        if (parentError) throw parentError;
        finalParentId = parentData.id;
        finalGuardianName = newParent.full_name;
        finalContactNumber = newParent.phone;
        await fetchParents(); // Refresh parents list
      }

      const studentData = {
        full_name: editingStudent.full_name,
        roll_number: editingStudent.roll_number,
        class_name: editingStudent.class_name,
        parent_id: finalParentId,
        guardian_name: finalGuardianName,
        contact_number: finalContactNumber,
        email: editingStudent.email,
        address: editingStudent.address,
        date_of_birth: editingStudent.date_of_birth,
        gender: editingStudent.gender,
        status: editingStudent.status,
        profile_photo_url: finalPhotoUrl
      };

      if (editingStudent.id) {
        // Update
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);
        if (error) throw error;
        showToast("Student profile updated successfully", "success");
      }

      setIsEditModalOpen(false);
      await fetchStudents();
    } catch (error: any) {
      showToast("Save failed: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteConfirmOpen(true);
  };

  const confirmInactive = async () => {
    if (!studentToDelete || !supabase) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'inactive' })
        .eq('id', studentToDelete.id);

      if (error) throw error;

      showToast("Student marked as inactive", "success");
      setIsDeleteConfirmOpen(false);
      if (selectedStudent?.id === studentToDelete.id) {
        setSelectedStudent(prev => prev ? {...prev, status: 'inactive'} : null);
      }
      await fetchStudents();
    } catch (error: any) {
      showToast("Operation failed: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete || !supabase) return;

    setIsSaving(true);
    try {
      const parentId = studentToDelete.parent_id;

      // First, delete any associated feedback records to avoid foreign key constraints
      await supabase
        .from('student_feedback')
        .delete()
        .eq('student_id', studentToDelete.id);

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (error) throw error;

      if (parentId) {
        const { count, error: countError } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', parentId);

        if (!countError && count === 0) {
          await supabase.from('parents').delete().eq('id', parentId);
        }
      }

      showToast("Student record deleted", "success");
      setIsDeleteConfirmOpen(false);
      if (selectedStudent?.id === studentToDelete.id) {
        setSelectedStudent(null);
      }
      await fetchStudents();
    } catch (error: any) {
      showToast("Deletion failed: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = (student: Student) => {
    if (student.email) {
      window.location.href = `mailto:${student.email}?subject=Academic Update for ${student.full_name}`;
    } else {
      showToast("No email address registered for this student", "error");
    }
  };

  const handleCall = (student: Student) => {
    if (student.contact_number) {
      window.location.href = `tel:${student.contact_number}`;
    } else {
      showToast("No contact number registered for this student", "error");
    }
  };

  const fetchAttendanceHistory = async (studentId: string) => {
    if (!supabase) return;
    setIsAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setAttendanceLogs(data || []);
      setIsAttendanceHistoryOpen(true);
    } catch (error: any) {
      showToast("Failed to fetch attendance history: " + error.message, "error");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const groupAttendanceByMonth = (logs: any[]) => {
    const months: { [key: string]: any[] } = {};
    logs.forEach(log => {
      const date = new Date(log.date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!months[monthYear]) months[monthYear] = [];
      months[monthYear].push(log);
    });
    return months;
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesClass = selectedClass === 'All Classes' || student.class_name === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-supabase-bg text-supabase-muted">
        <Loader2 className="animate-spin mb-4 text-supabase-green" size={40} />
        <p className="text-sm font-medium uppercase tracking-widest animate-pulse">Synchronizing Student Registry...</p>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <div className="flex flex-col h-full bg-supabase-bg overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 border-b border-supabase-border bg-supabase-panel/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedStudent(null)}
              className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-supabase-text uppercase tracking-tight">Student Profile</h1>
              <p className="text-[10px] text-supabase-muted font-bold uppercase tracking-widest">Registry ID: {selectedStudent.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleEdit(selectedStudent)}
              className="p-2 text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 rounded-xl transition-all"
              title="Edit Profile"
            >
              <Edit2 size={20} />
            </button>
            <button 
              onClick={() => handleDelete(selectedStudent)}
              className="p-2 text-supabase-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Delete or Deactivate Profile"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 scrollbar-hide">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-supabase-green"></div>
                <div className="w-32 h-32 rounded-[2.5rem] bg-supabase-green/10 flex items-center justify-center text-supabase-green font-bold text-5xl mx-auto mb-6 border-4 border-supabase-green/20 shadow-inner overflow-hidden">
                  {selectedStudent.profile_photo_url ? (
                    <img 
                      src={selectedStudent.profile_photo_url} 
                      alt={selectedStudent.full_name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    selectedStudent.full_name.charAt(0)
                  )}
                </div>
                <h2 className="text-2xl font-black text-supabase-text uppercase tracking-tighter mb-1">{selectedStudent.full_name}</h2>
                <p className="text-sm text-supabase-muted font-bold uppercase tracking-widest mb-6">{selectedStudent.class_name} • Roll {selectedStudent.roll_number || 'N/A'}</p>
                
                <div className="flex items-center justify-center gap-2 mb-8">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedStudent.status === 'inactive' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-supabase-green/10 text-supabase-green border border-supabase-green/20'}`}>
                    {selectedStudent.status || 'Active'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-supabase-hover text-supabase-muted border border-supabase-border">
                    Student
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleMessage(selectedStudent)}
                    className="bg-supabase-green text-black py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
                  >
                    Message
                  </button>
                  <button 
                    onClick={() => handleCall(selectedStudent)}
                    className="bg-supabase-bg border border-supabase-border text-supabase-text py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-supabase-hover transition-all"
                  >
                    Call
                  </button>
                </div>
              </div>

              <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Shield size={14} className="text-supabase-green" />
                  Quick Actions
                </h3>
                <button 
                  onClick={() => showToast("Generating report card for " + selectedStudent.full_name, "info")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-supabase-hover transition-all text-sm text-supabase-text group"
                >
                  <div className="w-8 h-8 rounded-lg bg-supabase-bg flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-colors">
                    <FileText size={16} />
                  </div>
                  <span>Generate Report Card</span>
                </button>
                <button 
                  onClick={() => showToast("Fetching achievements for " + selectedStudent.full_name, "info")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-supabase-hover transition-all text-sm text-supabase-text group"
                >
                  <div className="w-8 h-8 rounded-lg bg-supabase-bg flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-colors">
                    <Award size={16} />
                  </div>
                  <span>View Achievements</span>
                </button>
                <button 
                  onClick={() => fetchAttendanceHistory(selectedStudent.id)}
                  disabled={isAttendanceLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-supabase-hover transition-all text-sm text-supabase-text group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-supabase-bg flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-colors">
                    {isAttendanceLoading ? <Loader2 className="animate-spin" size={16} /> : <Clock size={16} />}
                  </div>
                  <span>Attendance History</span>
                </button>
              </div>
            </div>

            {/* Right Column: Detailed Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Personal Details */}
              <section>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest mb-4 flex items-center gap-3">
                  <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<User size={16} />} label="Full Name" value={selectedStudent.full_name} />
                  <InfoItem icon={<Calendar size={16} />} label="Date of Birth" value={selectedStudent.date_of_birth || 'Not Provided'} />
                  <InfoItem icon={<GraduationCap size={16} />} label="Gender" value={selectedStudent.gender || 'Not Specified'} />
                  <InfoItem icon={<MapPin size={16} />} label="Address" value={selectedStudent.address || 'No Address Listed'} />
                </div>
              </section>

              {/* Academic Details */}
              <section>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest mb-4 flex items-center gap-3">
                  <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                  Academic Records
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<GraduationCap size={16} />} label="Current Class" value={selectedStudent.class_name} />
                  <InfoItem icon={<FileText size={16} />} label="Roll Number" value={selectedStudent.roll_number || 'N/A'} />
                  <InfoItem icon={<Clock size={16} />} label="Admission Date" value={selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : 'N/A'} />
                  <InfoItem icon={<Shield size={16} />} label="Enrollment Status" value={selectedStudent.status || 'Active'} />
                </div>
              </section>

              {/* Contact Details */}
              <section>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest mb-4 flex items-center gap-3">
                  <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<User size={16} />} label="Guardian Name" value={selectedStudent.guardian_name || 'Not Listed'} />
                  <InfoItem icon={<Phone size={16} />} label="Contact Number" value={selectedStudent.contact_number || 'N/A'} />
                  <InfoItem icon={<Mail size={16} />} label="Email Address" value={selectedStudent.email || 'No Email Registered'} />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Attendance History Modal */}
        {isAttendanceHistoryOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-supabase-panel border border-supabase-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-bg/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-supabase-green/10 flex items-center justify-center text-supabase-green">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest">Attendance History</h2>
                    <p className="text-[10px] text-supabase-muted font-bold uppercase tracking-widest">{selectedStudent.full_name}</p>
                  </div>
                </div>
                <button onClick={() => setIsAttendanceHistoryOpen(false)} className="p-2 text-supabase-muted hover:text-supabase-text rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-8">
                {attendanceLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-supabase-muted">
                    <Calendar size={48} className="mb-4 opacity-20" />
                    <p className="font-bold">No attendance records found</p>
                    <p className="text-xs">This student has no logged attendance yet.</p>
                  </div>
                ) : (
                  Object.entries(groupAttendanceByMonth(attendanceLogs)).map(([month, logs]) => (
                    <div key={month} className="space-y-4">
                      <h3 className="text-xs font-black text-supabase-text uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                        {month}
                        <span className="text-supabase-muted font-medium tracking-normal ml-auto">
                          {logs.filter(l => l.status === 'present').length} Present • {logs.filter(l => l.status === 'absent').length} Absent
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {logs.map((log, idx) => (
                          <div key={idx} className="bg-supabase-bg/50 border border-supabase-border p-3 rounded-xl flex items-center justify-between group hover:border-supabase-green/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                log.status === 'present' ? 'bg-supabase-green' : 
                                log.status === 'absent' ? 'bg-red-500' : 'bg-yellow-500'
                              }`}></div>
                              <span className="text-sm font-bold text-supabase-text">
                                {new Date(log.date).toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                              log.status === 'present' ? 'bg-supabase-green/10 text-supabase-green' : 
                              log.status === 'absent' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t border-supabase-border bg-supabase-bg/50 flex justify-end">
                <button 
                  onClick={() => setIsAttendanceHistoryOpen(false)}
                  className="bg-supabase-green text-black px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && editingStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-supabase-panel border border-supabase-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-bg/50">
                <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                  <Edit2 size={18} className="text-supabase-green" />
                  Edit Student Profile
                </h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-supabase-muted hover:text-supabase-text rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center justify-center p-4 bg-supabase-bg/30 rounded-2xl border border-dashed border-supabase-border">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-supabase-green/10 flex items-center justify-center text-supabase-green font-bold text-3xl border-2 border-supabase-green/20 overflow-hidden">
                      {(photoPreviewUrl || editingStudent.profile_photo_url) ? (
                        <img 
                          src={photoPreviewUrl || editingStudent.profile_photo_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        editingStudent.full_name?.charAt(0) || 'S'
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploading || isSaving}
                      />
                      {isUploading ? (
                        <Loader2 className="animate-spin text-white" size={24} />
                      ) : (
                        <Plus className="text-white" size={24} />
                      )}
                    </label>
                  </div>
                  <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest mt-3">
                    {isUploading ? 'Uploading...' : 'Click to change photo'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Full Name</label>
                    <input 
                      type="text"
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.full_name || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, full_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Roll Number</label>
                    <input 
                      type="text"
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.roll_number || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, roll_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Class</label>
                    <select 
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.class_name || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, class_name: e.target.value})}
                      required
                    >
                      <option value="" disabled>Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.name}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.status || 'active'}
                      onChange={(e) => setEditingStudent({...editingStudent, status: e.target.value as 'active' | 'inactive'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Parent Selection Section */}
                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-supabase-border">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Parent / Guardian Information</label>
                      <button 
                        type="button"
                        onClick={() => setShowAddParentForm(!showAddParentForm)}
                        className="text-[10px] font-black text-supabase-green uppercase tracking-widest hover:underline"
                      >
                        {showAddParentForm ? 'Search Existing Parent' : 'Add New Parent'}
                      </button>
                    </div>

                    {!showAddParentForm ? (
                      <div className="space-y-2 relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={16} />
                          <input 
                            type="text"
                            placeholder="Search existing parents by name or phone..."
                            className="w-full bg-supabase-bg border border-supabase-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                            value={searchTermParent}
                            onChange={(e) => setSearchTermParent(e.target.value)}
                          />
                        </div>
                        
                        {searchTermParent && (
                          <div className="absolute z-20 w-full mt-1 bg-supabase-panel border border-supabase-border rounded-xl shadow-2xl max-h-48 overflow-y-auto scrollbar-hide">
                            {parents
                              .filter(p => 
                                p.full_name.toLowerCase().includes(searchTermParent.toLowerCase()) || 
                                p.phone.includes(searchTermParent)
                              )
                              .map(parent => (
                                <button
                                  key={parent.id}
                                  type="button"
                                  onClick={() => {
                                    setEditingStudent({
                                      ...editingStudent, 
                                      parent_id: parent.id,
                                      guardian_name: parent.full_name,
                                      contact_number: parent.phone
                                    });
                                    setSearchTermParent(parent.full_name);
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-supabase-hover transition-all border-b border-supabase-border last:border-0"
                                >
                                  <div className="text-sm font-bold text-supabase-text">{parent.full_name}</div>
                                  <div className="text-[10px] text-supabase-muted uppercase tracking-widest">{parent.phone} • {parent.occupation || 'Parent'}</div>
                                </button>
                              ))
                            }
                            {parents.filter(p => 
                                p.full_name.toLowerCase().includes(searchTermParent.toLowerCase()) || 
                                p.phone.includes(searchTermParent)
                              ).length === 0 && (
                                <div className="px-4 py-3 text-sm text-supabase-muted italic">No parents found. Click "Add New Parent" above.</div>
                              )
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-supabase-bg/20 p-4 rounded-2xl border border-supabase-border">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Parent Full Name</label>
                          <input 
                            type="text"
                            className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                            value={newParent.full_name || ''}
                            onChange={(e) => setNewParent({...newParent, full_name: e.target.value})}
                            required={showAddParentForm}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Parent Phone</label>
                          <input 
                            type="number"
                            className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                            value={newParent.phone || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.length <= 10) {
                                setNewParent({...newParent, phone: val});
                              }
                            }}
                            required={showAddParentForm}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Parent Email</label>
                          <input 
                            type="email"
                            className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                            value={newParent.email || ''}
                            onChange={(e) => setNewParent({...newParent, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Parent Occupation</label>
                          <input 
                            type="text"
                            className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                            value={newParent.occupation || ''}
                            onChange={(e) => setNewParent({...newParent, occupation: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Guardian Name (Display)</label>
                    <input 
                      type="text"
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.guardian_name || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardian_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Contact Number (Display)</label>
                    <input 
                      type="number"
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.contact_number || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 10) {
                          setEditingStudent({...editingStudent, contact_number: val});
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Student Email Address</label>
                    <input 
                      type="email"
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                      value={editingStudent.email || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Address</label>
                    <textarea 
                      className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all min-h-[80px]"
                      value={editingStudent.address || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 bg-supabase-bg border border-supabase-border text-supabase-text py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-supabase-hover transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-supabase-green text-black py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && studentToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-supabase-panel border border-supabase-border w-full max-w-md rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-6 border-2 border-red-500/20">
                {/* Trash icon removed */}
              </div>
              <h2 className="text-xl font-black text-supabase-text uppercase tracking-tight mb-2">Delete or Deactivate?</h2>
              <p className="text-sm text-supabase-muted mb-8 leading-relaxed">
                You can mark <span className="text-supabase-text font-bold">{studentToDelete.full_name}</span> as inactive, or permanently delete them. Deletion cannot be undone.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmInactive}
                  disabled={isSaving}
                  className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="animate-spin" size={16} />}
                  Mark as Inactive
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isSaving}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="animate-spin" size={16} />}
                  Confirm Permanent Deletion
                </button>
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="w-full bg-supabase-bg border border-supabase-border text-supabase-text py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-supabase-hover transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-supabase-bg">
      {/* Header Section */}
      <div className="p-4 sm:p-6 border-b border-supabase-border bg-supabase-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-supabase-panel border border-supabase-border rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden group"
            >
              <div className="relative z-10 text-supabase-green font-black text-2xl sm:text-3xl">S</div>
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-supabase-text uppercase tracking-tighter flex flex-wrap items-center gap-2 sm:gap-3">
                Students
                <span className="text-[10px] px-2 py-0.5 bg-supabase-green/10 text-supabase-green border border-supabase-green/20 rounded-full font-bold tracking-widest whitespace-nowrap">DIRECTORY</span>
              </h1>
              <div className="text-[10px] sm:text-xs text-supabase-muted mt-1 sm:mt-2 font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] flex items-start sm:items-center gap-2">
                <Users size={12} className="text-supabase-green shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-snug sm:leading-normal">Managing {filteredStudents.length} of {students.length} Total Students</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded-lg transition-all"
              title={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={18} />
            <input 
              type="text"
              placeholder="Search..."
              className="w-full bg-supabase-bg border border-supabase-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              className="flex-1 sm:flex-none bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all appearance-none cursor-pointer sm:min-w-[160px]"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="All Classes">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
            
            <button className="flex items-center gap-2 bg-supabase-panel border border-supabase-border text-supabase-text px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-supabase-hover transition-all">
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-auto p-6 scrollbar-hide">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-supabase-muted border-2 border-dashed border-supabase-border rounded-2xl">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">No students found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden shadow-xl overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-supabase-bg/50 border-b border-supabase-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Student Info</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Roll No</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Class</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Guardian</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-supabase-border">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-supabase-hover/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-supabase-green/10 flex items-center justify-center text-supabase-green font-bold text-lg border border-supabase-green/20 overflow-hidden">
                          {student.profile_photo_url ? (
                            <img 
                              src={student.profile_photo_url} 
                              alt={student.full_name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            student.full_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-supabase-text group-hover:text-supabase-green transition-colors">{student.full_name}</div>
                            {student.status === 'inactive' && (
                              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-supabase-muted uppercase tracking-tighter">{student.email || 'No Email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-supabase-muted bg-supabase-bg px-2 py-1 rounded border border-supabase-border">
                        {student.roll_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-supabase-text">
                        <GraduationCap size={14} className="text-supabase-green" />
                        {student.class_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-supabase-text font-medium">{student.guardian_name || 'Not Listed'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-supabase-muted">
                        <Phone size={14} />
                        {student.contact_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(student); }}
                          className="p-2 text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(student); }}
                          className="p-2 text-supabase-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete / Deactivate"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <div 
                key={student.id} 
                className="bg-supabase-panel border border-supabase-border rounded-2xl p-5 hover:border-supabase-green/50 transition-all group relative overflow-hidden shadow-lg cursor-pointer"
                onClick={() => setSelectedStudent(student)}
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(student); }}
                    className="p-1.5 text-supabase-muted hover:text-supabase-green bg-supabase-sidebar/80 backdrop-blur-sm rounded-lg"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(student); }}
                    className="p-1.5 text-supabase-muted hover:text-red-500 bg-supabase-sidebar/80 backdrop-blur-sm rounded-lg"
                    title="Delete / Deactivate"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-20 h-20 rounded-3xl bg-supabase-green/10 flex items-center justify-center text-supabase-green font-bold text-3xl mb-4 border-2 border-supabase-green/20 group-hover:scale-110 transition-transform overflow-hidden">
                    {student.profile_photo_url ? (
                      <img 
                        src={student.profile_photo_url} 
                        alt={student.full_name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      student.full_name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-lg font-black text-supabase-text uppercase tracking-tight group-hover:text-supabase-green transition-colors">
                    {student.full_name}
                  </h3>
                  <p className="text-[10px] text-supabase-muted font-black uppercase tracking-widest mt-1 mb-2">
                    Roll: {student.roll_number || 'N/A'}
                  </p>
                  {student.status === 'inactive' && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block">
                      Inactive
                    </span>
                  )}
                </div>
                
                <div className="space-y-3 pt-4 border-t border-supabase-border">
                  <div className="flex items-center gap-3 text-xs text-supabase-muted">
                    <GraduationCap size={14} className="text-supabase-green" />
                    <span className="font-bold text-supabase-text">{student.class_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-supabase-muted">
                    <User size={14} />
                    <span>{student.guardian_name || 'No Guardian'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-supabase-muted">
                    <Phone size={14} />
                    <span>{student.contact_number || 'No Phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-supabase-muted truncate">
                    <Mail size={14} />
                    <span className="truncate">{student.email || 'No Email'}</span>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2">
                  <button className="flex-1 bg-supabase-bg border border-supabase-border text-supabase-text py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-supabase-hover transition-all">
                    Profile
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="flex-1 bg-supabase-green/10 text-supabase-green py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-supabase-green/20 transition-all"
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-supabase-panel border border-supabase-border p-4 rounded-2xl flex items-start gap-4 hover:border-supabase-green/30 transition-all group">
    <div className="w-10 h-10 rounded-xl bg-supabase-bg flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-colors">
      {icon}
    </div>
    <div>
      <div className="text-[10px] font-black text-supabase-muted uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-bold text-supabase-text leading-tight">{value}</div>
    </div>
  </div>
);

export default StudentsView;
