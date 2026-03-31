
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, Calendar, User, Phone, BookOpen, Download, Loader2, Filter, ChevronRight, Eye, X, Edit2, CheckCircle2, XCircle, Save, Mail, MapPin, Clock, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { counsellingService } from '../services/counsellingService';
import { academicService, PreferredCourse } from '../services/academicService';
import { CounsellingRecord } from '../types';
import ConfirmModal from './ConfirmModal';

const CounsellingLogView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [records, setRecords] = useState<CounsellingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<CounsellingRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [courses, setCourses] = useState<PreferredCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [editFormData, setEditFormData] = useState<Partial<CounsellingRecord>>({});

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await counsellingService.getRecords();
      setRecords(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const data = await academicService.getCourses();
      setCourses(data.filter(c => c.status === 'active'));
    } catch (error: any) {
      console.error('Failed to load courses', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      await counsellingService.deleteRecord(recordToDelete);
      showToast('Record deleted successfully', 'success');
      setRecords(prev => prev.filter(r => r.id !== recordToDelete));
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to delete record', 'error');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdating(id);
    try {
      const record = records.find(r => r.id === id);
      const updater = user?.name || 'System';
      const newActivity = {
        action: status,
        user: updater,
        timestamp: new Date().toISOString()
      };

      const updates: Partial<CounsellingRecord> = { 
        status,
        activity_log: [...(record?.activity_log || []), newActivity]
      };
      
      if (status === 'approved') {
        updates.approved_by = updater;
      } else {
        updates.rejected_by = updater;
      }
      
      const updated = await counsellingService.updateRecord(id, updates);
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
      if (selectedRecord?.id === id) {
        setSelectedRecord(updated);
      }
      showToast(`Record ${status} successfully`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update record', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEditClick = (record: CounsellingRecord) => {
    setEditFormData({ ...record });
    setIsEditing(true);
    setSelectedRecord(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setEditFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as any),
          [field]: value
        }
      }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;
    
    setIsUpdating(editFormData.id);
    try {
      const updater = user?.name || 'System';
      const newActivity = {
        action: 'edited' as const,
        user: updater,
        timestamp: new Date().toISOString()
      };

      const updates = { 
        ...editFormData,
        last_edited_by: updater,
        activity_log: [...(editFormData.activity_log || []), newActivity]
      };
      const updated = await counsellingService.updateRecord(editFormData.id, updates);
      setRecords(prev => prev.map(r => r.id === editFormData.id ? updated : r));
      showToast('Record updated successfully', 'success');
      setIsEditing(false);
      setEditFormData({});
    } catch (error: any) {
      showToast(error.message || 'Failed to update record', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.contact_no.includes(searchTerm) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCreatedBy = createdByFilter === 'all' || 
      (record.created_by || 'System') === createdByFilter;

    return matchesSearch && matchesCreatedBy;
  });

  const uniqueCreators = Array.from(new Set(records.map(r => r.created_by || 'System'))).sort();

  const exportToCSV = () => {
    const headers = ['Date', 'Student Name', 'Contact', 'Gender', 'Current Class', 'Parents Name', 'Course Interest', 'Preferred Batch'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => [
        r.date,
        `"${r.student_name}"`,
        r.contact_no,
        r.gender,
        r.current_class,
        `"${r.parents_name}"`,
        `"${r.course_interest.preferred_course}"`,
        r.course_interest.preferred_batch_timing
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `counselling_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-supabase-text uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-supabase-green/10 rounded-xl flex items-center justify-center text-supabase-green">
              <Calendar size={24} />
            </div>
            Counselling Log
          </h1>
          <p className="text-supabase-muted text-sm mt-1">View and manage all student counselling records.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-supabase-sidebar border border-supabase-border text-supabase-text px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-supabase-hover transition-all"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search by student name, contact, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-supabase-panel border border-supabase-border rounded-xl pl-10 pr-4 py-3 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
            className="bg-supabase-panel border border-supabase-border text-supabase-text px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-supabase-green transition-all min-w-[160px]"
          >
            <option value="all">All Counsellors</option>
            {uniqueCreators.map(creator => (
              <option key={creator} value={creator}>{creator}</option>
            ))}
          </select>
          <button className="bg-supabase-panel border border-supabase-border text-supabase-muted px-4 py-3 rounded-xl flex items-center gap-2 hover:text-supabase-text transition-all">
            <Filter size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-supabase-sidebar border-b border-supabase-border">
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Student Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Course Interest</th>
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest">Created By</th>
                <th className="px-6 py-4 text-[10px] font-black text-supabase-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-supabase-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-supabase-green" size={32} />
                      <span className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Loading Records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-supabase-muted">
                    <p className="text-sm italic">No counselling records found.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-supabase-sidebar/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-mono text-supabase-green">
                        <Calendar size={14} />
                        {record.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-supabase-text uppercase tracking-tight">{record.student_name}</span>
                        <span className="text-[10px] text-supabase-muted uppercase tracking-widest">{record.current_class}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-blue-400">{record.course_interest.preferred_course}</span>
                        <span className="text-[10px] text-supabase-muted uppercase tracking-widest">{record.course_interest.preferred_batch_timing}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-supabase-text">
                          <Phone size={12} className="text-supabase-muted" />
                          {record.contact_no}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-supabase-muted">
                          <User size={12} />
                          {record.parents_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        record.status === 'approved' ? 'bg-supabase-green/10 text-supabase-green' :
                        record.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-supabase-muted/10 text-supabase-muted'
                      }`}>
                        {record.status || 'pending'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-supabase-muted italic">
                        <User size={12} />
                        {record.created_by || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRecord(record)}
                        className="p-2 text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Record Modal */}
      {isEditing && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-supabase-text uppercase tracking-tight">Edit Record</h3>
                  <p className="text-supabase-muted text-xs uppercase tracking-widest">Update student information</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              {/* Form fields adapted from NewCounsellingView */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-supabase-green uppercase tracking-[0.2em] border-b border-supabase-green/20 pb-2">Personal Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Student Name</label>
                      <input 
                        type="text" 
                        name="student_name"
                        required
                        value={editFormData.student_name || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Contact No</label>
                        <input 
                          type="tel" 
                          name="contact_no"
                          required
                          value={editFormData.contact_no || ''}
                          onChange={handleEditChange}
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Gender</label>
                        <select 
                          name="gender"
                          required
                          value={editFormData.gender || ''}
                          onChange={handleEditChange}
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Date of Birth</label>
                        <input 
                          type="date" 
                          name="date_of_birth"
                          value={editFormData.date_of_birth || ''}
                          onChange={handleEditChange}
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Current Class</label>
                        <input 
                          type="text" 
                          name="current_class"
                          value={editFormData.current_class || ''}
                          onChange={handleEditChange}
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Email</label>
                      <input 
                        type="email" 
                        name="email"
                        value={editFormData.email || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Address</label>
                      <textarea 
                        name="address"
                        rows={2}
                        value={editFormData.address || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] border-b border-blue-400/20 pb-2">Parent Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Parent Name</label>
                      <input 
                        type="text" 
                        name="parents_name"
                        value={editFormData.parents_name || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Parent Contact No</label>
                      <input 
                        type="tel" 
                        name="parent_contact_no"
                        value={editFormData.parent_contact_no || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Occupation</label>
                      <input 
                        type="text" 
                        name="occupation"
                        value={editFormData.occupation || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      />
                    </div>
                  </div>

                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] border-b border-purple-400/20 pb-2 pt-4">Academic Interest</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Preferred Course</label>
                      <select 
                        name="course_interest.preferred_course"
                        value={editFormData.course_interest?.preferred_course || ''}
                        onChange={handleEditChange}
                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.name}>{course.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Batch Timing</label>
                        <input 
                          type="text" 
                          name="course_interest.preferred_batch_timing"
                          value={editFormData.course_interest?.preferred_batch_timing || ''}
                          onChange={handleEditChange}
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-supabase-muted uppercase font-bold mb-1 block">Last Score</label>
                        <input 
                          type="text" 
                          name="course_interest.percentage_or_cgpa"
                          value={editFormData.course_interest?.percentage_or_cgpa || ''}
                          onChange={handleEditChange}
                          className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-supabase-border">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-text transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!!isUpdating}
                  className="bg-supabase-green text-black px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20 flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-supabase-green/10 rounded-xl flex items-center justify-center text-supabase-green">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-supabase-text uppercase tracking-tight">{selectedRecord.student_name}</h3>
                  <p className="text-supabase-muted text-xs uppercase tracking-widest">Counselling Details • {selectedRecord.date}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-supabase-green uppercase tracking-[0.2em] border-b border-supabase-green/20 pb-2">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-supabase-muted uppercase font-bold">Gender</p>
                      <p className="text-sm text-supabase-text">{selectedRecord.gender}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-supabase-muted uppercase font-bold">Date of Birth</p>
                      <p className="text-sm text-supabase-text">{selectedRecord.date_of_birth || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-supabase-muted uppercase font-bold">Current Class</p>
                      <p className="text-sm text-supabase-text">{selectedRecord.current_class}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-supabase-muted uppercase font-bold">Contact No</p>
                      <p className="text-sm text-supabase-text">{selectedRecord.contact_no}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Email</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Address</p>
                    <p className="text-sm text-supabase-text leading-relaxed">{selectedRecord.address || 'N/A'}</p>
                  </div>
                </div>

                {/* Parent Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] border-b border-blue-400/20 pb-2">Parent/Guardian Information</h4>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Parent Name</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.parents_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Parent Contact</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.parent_contact_no}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Occupation</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.occupation || 'N/A'}</p>
                  </div>
                </div>

                {/* Academic/Course Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] border-b border-purple-400/20 pb-2">Academic & Course Interest</h4>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Preferred Course</p>
                    <p className="text-sm font-bold text-supabase-text">{selectedRecord.course_interest.preferred_course}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-supabase-muted uppercase font-bold">Education Level</p>
                      <p className="text-sm text-supabase-text">{selectedRecord.course_interest.current_education_level}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-supabase-muted uppercase font-bold">Last Score</p>
                      <p className="text-sm text-supabase-text">{selectedRecord.course_interest.percentage_or_cgpa}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">School Name</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.course_interest.school_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Batch Timing</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.course_interest.preferred_batch_timing}</p>
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] border-b border-orange-400/20 pb-2">Additional Information</h4>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Heard About Us Via</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.additional_information.heard_about}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Previous Coaching</p>
                    <p className="text-sm text-supabase-text">{selectedRecord.additional_information.previous_coaching || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-supabase-muted uppercase font-bold">Concerns/Queries</p>
                    <p className="text-sm text-supabase-text leading-relaxed">{selectedRecord.additional_information.concerns_or_queries || 'None'}</p>
                  </div>
                  <div className="pt-4 border-t border-supabase-border/50 space-y-4">
                    <h4 className="text-[10px] font-black text-supabase-muted uppercase tracking-[0.2em] pb-1">Activity History</h4>
                    <div className="space-y-3">
                      {selectedRecord.activity_log && selectedRecord.activity_log.length > 0 ? (
                        selectedRecord.activity_log.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-xs">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              log.action === 'created' ? 'bg-supabase-green' :
                              log.action === 'approved' ? 'bg-supabase-green' :
                              log.action === 'rejected' ? 'bg-red-500' :
                              'bg-blue-400'
                            }`} />
                            <div>
                              <p className="font-bold text-supabase-text">
                                <span className="uppercase tracking-wider mr-2">{log.action}</span>
                                <span className="text-supabase-muted font-normal">by</span> {log.user}
                              </p>
                              <p className="text-[10px] text-supabase-muted">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] text-supabase-muted uppercase font-bold">Counselling Done By</p>
                            <p className="text-sm font-bold text-supabase-green">
                              {selectedRecord.created_by || 'System'}
                              {selectedRecord.created_at && (
                                <span className="ml-2 text-[10px] font-normal text-supabase-muted">
                                  ({new Date(selectedRecord.created_at).toLocaleString()})
                                </span>
                              )}
                            </p>
                          </div>
                          {selectedRecord.last_edited_by && (
                            <div>
                              <p className="text-[9px] text-supabase-muted uppercase font-bold">Last Edited By</p>
                              <p className="text-sm font-bold text-blue-400">
                                {selectedRecord.last_edited_by}
                                {selectedRecord.updated_at && (
                                  <span className="ml-2 text-[10px] font-normal text-supabase-muted">
                                    ({new Date(selectedRecord.updated_at).toLocaleString()})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-supabase-border bg-supabase-sidebar flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditClick(selectedRecord)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-400/10 transition-all border border-blue-400/20"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <div className="h-6 w-[1px] bg-supabase-border mx-2" />
                <button 
                  onClick={() => handleStatusUpdate(selectedRecord.id, 'approved')}
                  disabled={isUpdating === selectedRecord.id || selectedRecord.status === 'approved'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                    selectedRecord.status === 'approved' 
                      ? 'text-supabase-green bg-supabase-green/10 border-supabase-green/20 opacity-50 cursor-not-allowed' 
                      : 'text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 border-supabase-border'
                  }`}
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button 
                  onClick={() => handleStatusUpdate(selectedRecord.id, 'rejected')}
                  disabled={isUpdating === selectedRecord.id || selectedRecord.status === 'rejected'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                    selectedRecord.status === 'rejected' 
                      ? 'text-red-500 bg-red-500/10 border-red-500/20 opacity-50 cursor-not-allowed' 
                      : 'text-supabase-muted hover:text-red-500 hover:bg-red-500/10 border-supabase-border'
                  }`}
                >
                  <XCircle size={14} /> Reject
                </button>
                <div className="h-6 w-[1px] bg-supabase-border mx-2" />
                <button 
                  onClick={() => {
                    setRecordToDelete(selectedRecord.id);
                    setIsDeleteModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all border border-red-500/20"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="bg-supabase-green text-black px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Record"
        message="Are you sure you want to delete this counselling record? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default CounsellingLogView;
