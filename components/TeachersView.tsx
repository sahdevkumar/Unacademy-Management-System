import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, Mail, Phone, Briefcase, User, GraduationCap, X, Loader2, Check, LayoutGrid, List, Edit2, Camera, Upload } from 'lucide-react';
import { Teacher } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';

const TeachersView: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Available Subjects (fetched from DB)
  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const [formData, setFormData] = useState<{
      name: string;
      email: string;
      subjects: string[];
      phone: string;
      profile_photo_url?: string;
  }>({
      name: '',
      email: '',
      subjects: [],
      phone: '',
      profile_photo_url: ''
  });

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, []);

  const fetchTeachers = async () => {
    setIsLoading(true);
    const data = await scheduleService.getTeachers();
    setTeachers(data);
    setIsLoading(false);
  };

  const fetchSubjects = async () => {
      const subs = await scheduleService.getSubjects();
      setAvailableSubjects(subs);
  };

  const resetForm = () => {
      setFormData({
          name: '',
          email: '',
          subjects: [],
          phone: '',
          profile_photo_url: ''
      });
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      resetForm();
  };

  const handleEdit = (teacher: Teacher) => {
      setFormData({
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects || [],
          phone: teacher.phone || '',
          profile_photo_url: teacher.profile_photo_url || ''
      });
      setImagePreview(teacher.profile_photo_url || null);
      setEditingId(teacher.id);
      setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          
          // Create preview URL
          const objectUrl = URL.createObjectURL(file);
          setImagePreview(objectUrl);
      }
  };

  const triggerFileInput = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      if (formData.subjects.length === 0) {
          showToast('Please select at least one subject', 'error');
          setIsSubmitting(false);
          return;
      }

      // Handle Image Upload First
      let finalPhotoUrl = formData.profile_photo_url;
      if (imageFile) {
          const { success, url, error } = await scheduleService.uploadTeacherPhoto(imageFile);
          if (success && url) {
              finalPhotoUrl = url;
          } else {
              showToast('Failed to upload image: ' + error, 'error');
              setIsSubmitting(false);
              return;
          }
      }

      const teacherData = {
          ...formData,
          profile_photo_url: finalPhotoUrl
      };

      let result;
      if (editingId) {
          // Update existing
          const teacherToUpdate = { ...teacherData, id: editingId };
          result = await scheduleService.updateTeacher(teacherToUpdate as Teacher);
      } else {
          // Add new
          result = await scheduleService.addTeacher(teacherData);
      }

      const { success, error } = result;
      
      if (success) {
          showToast(`Teacher '${formData.name}' ${editingId ? 'updated' : 'added'} successfully`, 'success');
          setIsModalOpen(false);
          resetForm();
          fetchTeachers();
      } else {
          showToast(`Failed to ${editingId ? 'update' : 'add'} teacher: ${error}`, 'error');
      }
      setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
      if(confirm(`Are you sure you want to remove ${name}?`)) {
          const { success, error } = await scheduleService.deleteTeacher(id);
          if (success) {
              showToast('Teacher removed', 'success');
              fetchTeachers();
          } else {
              showToast(`Failed to delete: ${error}`, 'error');
          }
      }
  };

  const toggleSubject = (subjectName: string) => {
      setFormData(prev => {
          if (prev.subjects.includes(subjectName)) {
              return { ...prev, subjects: prev.subjects.filter(s => s !== subjectName) };
          } else {
              return { ...prev, subjects: [...prev.subjects, subjectName] };
          }
      });
  };

  const filteredTeachers = teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.subjects && t.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="h-full flex flex-col bg-supabase-bg">
      {/* Toolbar */}
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
             <GraduationCap className="text-supabase-green" size={24} />
             <div>
                <h1 className="text-lg font-medium text-supabase-text leading-none">Teachers</h1>
                <p className="text-xs text-supabase-muted mt-1">Manage faculty and staff members</p>
             </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex bg-supabase-sidebar border border-supabase-border rounded-md p-0.5">
                <button 
                    onClick={() => setViewMode('grid')} 
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-supabase-panel shadow-sm text-supabase-text' : 'text-supabase-muted hover:text-supabase-text'}`}
                    title="Grid View"
                >
                    <LayoutGrid size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('list')} 
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-supabase-panel shadow-sm text-supabase-text' : 'text-supabase-muted hover:text-supabase-text'}`}
                    title="List View"
                >
                    <List size={16} />
                </button>
             </div>

             <div className="h-6 w-px bg-supabase-border mx-1"></div>

             <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-text" />
                <input 
                    type="text" 
                    placeholder="Search teachers..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-supabase-sidebar border border-supabase-border rounded-full py-1.5 pl-9 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green focus:ring-1 focus:ring-supabase-green w-64 transition-all"
                />
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-supabase-green text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-supabase-greenHover transition-colors flex items-center gap-2"
            >
                <Plus size={16} fill="currentColor" />
                Add Teacher
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-supabase-muted gap-3">
                 <Loader2 className="animate-spin text-supabase-green" size={32} />
                 <p className="text-sm">Loading faculty directory...</p>
             </div>
          ) : teachers.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-supabase-muted border-2 border-dashed border-supabase-border rounded-lg bg-supabase-panel/50">
                 <div className="p-4 bg-supabase-sidebar rounded-full mb-3">
                     <GraduationCap size={32} className="opacity-50" />
                 </div>
                 <h3 className="text-lg font-medium text-supabase-text">No teachers found</h3>
                 <p className="text-sm mb-4 max-w-xs text-center">Get started by adding your first faculty member to the database.</p>
                 <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 border border-supabase-green text-supabase-green rounded-md text-sm font-medium hover:bg-supabase-green/10"
                >
                    Add Teacher
                </button>
             </div>
          ) : (
            <>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTeachers.map(teacher => (
                            <div key={teacher.id} className="bg-supabase-panel border border-supabase-border rounded-lg p-5 hover:shadow-lg transition-all group relative">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                    <button 
                                        onClick={() => handleEdit(teacher)}
                                        className="p-1.5 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(teacher.id, teacher.name)}
                                        className="p-1.5 text-supabase-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-supabase-text font-bold text-lg border border-white/10 shrink-0 overflow-hidden bg-supabase-sidebar">
                                        {teacher.profile_photo_url ? (
                                            <img src={teacher.profile_photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                                {teacher.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-supabase-text text-base truncate">{teacher.name}</h3>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {teacher.subjects && teacher.subjects.map((subj, idx) => (
                                                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-supabase-green/10 text-supabase-green border border-supabase-green/20 truncate max-w-full">
                                                    {subj}
                                                </span>
                                            ))}
                                            {(!teacher.subjects || teacher.subjects.length === 0) && (
                                                <span className="text-xs text-supabase-muted italic">No subjects assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 pt-4 border-t border-supabase-border">
                                     <div className="flex items-center gap-2 text-sm text-supabase-muted">
                                         <Mail size={14} className="shrink-0" />
                                         <span className="truncate">{teacher.email || 'No email'}</span>
                                     </div>
                                     <div className="flex items-center gap-2 text-sm text-supabase-muted">
                                         <Phone size={14} className="shrink-0" />
                                         <span className="truncate">{teacher.phone || 'No phone'}</span>
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-supabase-panel border border-supabase-border rounded-md overflow-hidden">
                         <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 border-b border-supabase-border bg-supabase-sidebar text-xs font-medium text-supabase-muted uppercase tracking-wider">Teacher</th>
                                    <th className="px-6 py-3 border-b border-supabase-border bg-supabase-sidebar text-xs font-medium text-supabase-muted uppercase tracking-wider">Subjects</th>
                                    <th className="px-6 py-3 border-b border-supabase-border bg-supabase-sidebar text-xs font-medium text-supabase-muted uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 border-b border-supabase-border bg-supabase-sidebar text-xs font-medium text-supabase-muted uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeachers.map((teacher, index) => (
                                    <tr key={teacher.id} className="hover:bg-supabase-hover/50 group transition-colors">
                                        <td className="px-6 py-4 border-b border-supabase-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-supabase-text font-bold text-xs border border-white/10 overflow-hidden bg-supabase-sidebar">
                                                    {teacher.profile_photo_url ? (
                                                        <img src={teacher.profile_photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                                            {teacher.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-supabase-text">{teacher.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-b border-supabase-border">
                                            <div className="flex flex-wrap gap-1">
                                                {teacher.subjects && teacher.subjects.length > 0 ? (
                                                    teacher.subjects.map((subj, idx) => (
                                                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-supabase-green/10 text-supabase-green border border-supabase-green/20">
                                                            {subj}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-supabase-muted italic">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-b border-supabase-border">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                                    <Mail size={12} />
                                                    {teacher.email || '-'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                                    <Phone size={12} />
                                                    {teacher.phone || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-b border-supabase-border text-right">
                                             <div className="flex items-center justify-end gap-2">
                                                 <button 
                                                    onClick={() => handleEdit(teacher)}
                                                    className="p-1.5 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(teacher.id, teacher.name)}
                                                    className="p-1.5 text-supabase-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    title="Delete"
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
                )}
            </>
          )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-supabase-border bg-supabase-sidebar shrink-0">
                      <h2 className="text-sm font-semibold text-supabase-text">{editingId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
                      <button onClick={handleCloseModal} className="text-supabase-muted hover:text-supabase-text">
                          <X size={18} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleAddTeacher} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                      
                      {/* Image Upload */}
                      <div className="flex justify-center mb-2">
                          <div 
                            className="relative w-20 h-20 rounded-full border border-supabase-border bg-supabase-bg group cursor-pointer overflow-hidden flex items-center justify-center"
                            onClick={triggerFileInput}
                          >
                              {imagePreview ? (
                                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                  <Camera size={24} className="text-supabase-muted" />
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Upload size={20} className="text-white" />
                              </div>
                          </div>
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleImageChange}
                          />
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-medium text-supabase-muted">Full Name</label>
                          <div className="relative">
                              <User className="absolute left-3 top-2.5 text-supabase-muted" size={16} />
                              <input 
                                  required
                                  type="text"
                                  value={formData.name}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                                  className="w-full bg-supabase-bg border border-supabase-border rounded pl-9 pr-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                  placeholder="e.g. Dr. Jane Smith"
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-medium text-supabase-muted">Assign Subjects</label>
                          <div className="border border-supabase-border rounded-md bg-supabase-bg p-4">
                              {availableSubjects.length === 0 ? (
                                  <div className="text-center py-4">
                                      <p className="text-xs text-supabase-muted">No subjects found in database.</p>
                                      <p className="text-[10px] text-supabase-muted mt-1">Please add subjects via SQL Editor first.</p>
                                  </div>
                              ) : (
                                  <div className="flex flex-wrap gap-2">
                                      {availableSubjects.map(subj => {
                                          const isSelected = formData.subjects.includes(subj.name);
                                          return (
                                              <button
                                                  type="button"
                                                  key={subj.id}
                                                  onClick={() => toggleSubject(subj.name)}
                                                  className={`
                                                      text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5
                                                      ${isSelected 
                                                          ? 'bg-supabase-green text-black border-supabase-green hover:bg-supabase-greenHover shadow-sm' 
                                                          : 'bg-transparent text-supabase-muted border-supabase-border hover:border-supabase-text hover:text-supabase-text'
                                                      }
                                                  `}
                                              >
                                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                                  {subj.name}
                                              </button>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                          {availableSubjects.length > 0 && formData.subjects.length === 0 && (
                               <div className="text-[10px] text-supabase-muted flex items-center gap-1">
                                   <Briefcase size={10} />
                                   Select one or more subjects taught by this teacher.
                               </div>
                          )}
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-medium text-supabase-muted">Email Address</label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-2.5 text-supabase-muted" size={16} />
                              <input 
                                  type="email"
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                                  className="w-full bg-supabase-bg border border-supabase-border rounded pl-9 pr-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                  placeholder="jane.smith@uni.edu"
                              />
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-medium text-supabase-muted">Phone Number</label>
                          <div className="relative">
                              <Phone className="absolute left-3 top-2.5 text-supabase-muted" size={16} />
                              <input 
                                  type="text"
                                  value={formData.phone}
                                  onChange={e => setFormData({...formData, phone: e.target.value})}
                                  className="w-full bg-supabase-bg border border-supabase-border rounded pl-9 pr-3 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                  placeholder="+1 (555) 000-0000"
                              />
                          </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-3 shrink-0">
                          <button 
                              type="button"
                              onClick={handleCloseModal}
                              className="px-4 py-2 text-sm text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              disabled={isSubmitting}
                              className="bg-supabase-green text-black px-4 py-2 rounded text-sm font-medium hover:bg-supabase-greenHover transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                              {isSubmitting ? 'Saving...' : (editingId ? 'Update Teacher' : 'Add Teacher')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default TeachersView;