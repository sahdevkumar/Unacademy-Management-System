import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, Mail, Phone, Briefcase, User, GraduationCap, X, Loader2, Check, LayoutGrid, List, Edit2, Camera, Upload, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Teacher } from '../types';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';

const TeachersView: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<{
      name: string;
      email: string;
      subjects: string[];
      phone: string;
      status: 'active' | 'inactive';
      profile_photo_url?: string;
  }>({
      name: '',
      email: '',
      subjects: [],
      phone: '',
      status: 'active',
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
      setFormData({ name: '', email: '', subjects: [], phone: '', status: 'active', profile_photo_url: '' });
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseModal = () => { setIsModalOpen(false); resetForm(); };

  const handleEdit = (teacher: Teacher) => {
      setFormData({
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects || [],
          phone: teacher.phone || '',
          status: teacher.status || 'active',
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
          const objectUrl = URL.createObjectURL(file);
          setImagePreview(objectUrl);
      }
  };

  const triggerFileInput = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      if (formData.subjects.length === 0) {
          showToast('Please select at least one subject', 'error');
          setIsSubmitting(false);
          return;
      }
      let finalPhotoUrl = formData.profile_photo_url;
      if (imageFile) {
          const { success, url, error } = await scheduleService.uploadTeacherPhoto(imageFile);
          if (success && url) finalPhotoUrl = url;
          else { showToast('Failed to upload image: ' + error, 'error'); setIsSubmitting(false); return; }
      }
      const teacherData = { ...formData, profile_photo_url: finalPhotoUrl };
      let result;
      if (editingId) {
          result = await scheduleService.updateTeacher({ ...teacherData, id: editingId } as Teacher);
      } else {
          result = await scheduleService.addTeacher(teacherData);
      }
      const { success, error } = result;
      if (success) {
          showToast(`Teacher '${formData.name}' ${editingId ? 'updated' : 'added'} successfully`, 'success');
          setIsModalOpen(false);
          resetForm();
          fetchTeachers();
      } else { showToast(`Failed: ${error}`, 'error'); }
      setIsSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
      if(confirm(`Are you sure?`)) {
          const { success, error } = await scheduleService.deleteTeacher(id);
          if (success) { showToast('Teacher removed', 'success'); fetchTeachers(); }
          else { showToast(`Failed: ${error}`, 'error'); }
      }
  };

  const toggleSubject = (subjectName: string) => {
      setFormData(prev => {
          if (prev.subjects.includes(subjectName)) return { ...prev, subjects: prev.subjects.filter(s => s !== subjectName) };
          return { ...prev, subjects: [...prev.subjects, subjectName] };
      });
  };

  const filteredTeachers = teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.subjects && t.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="h-full flex flex-col bg-supabase-bg">
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
             <GraduationCap className="text-supabase-green" size={24} />
             <div>
                <h1 className="text-lg font-medium text-supabase-text leading-none">Teachers</h1>
                <p className="text-xs text-supabase-muted mt-1">Manage faculty directory</p>
             </div>
        </div>
        <div className="flex items-center gap-4">
             <div className="flex bg-supabase-sidebar border border-supabase-border rounded-md p-0.5">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-supabase-panel shadow-sm text-supabase-text' : 'text-supabase-muted hover:text-supabase-text'}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-supabase-panel shadow-sm text-supabase-text' : 'text-supabase-muted hover:text-supabase-text'}`}><List size={16} /></button>
             </div>
             <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-supabase-muted group-focus-within:text-supabase-text" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-supabase-sidebar border border-supabase-border rounded-full py-1.5 pl-9 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green w-64" />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-supabase-green text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-supabase-greenHover flex items-center gap-2"><Plus size={16} />Add Teacher</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
          {isLoading ? <Loader2 className="animate-spin text-supabase-green m-auto" size={32} /> : (
            <>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTeachers.map(teacher => (
                            <div key={teacher.id} className="bg-supabase-panel border border-supabase-border rounded-lg p-5 group relative">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                    <button onClick={() => handleEdit(teacher)} className="p-1.5 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(teacher.id, teacher.name)} className="p-1.5 text-supabase-muted hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={16} /></button>
                                </div>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-full border border-white/10 shrink-0 overflow-hidden bg-supabase-sidebar">
                                            {teacher.profile_photo_url ? <img src={teacher.profile_photo_url} alt={teacher.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center font-bold">{teacher.name.charAt(0)}</div>}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-supabase-panel ${teacher.status === 'active' ? 'bg-supabase-green' : 'bg-red-500'}`}></div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-supabase-text text-base truncate">{teacher.name}</h3>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {teacher.subjects?.map((subj, idx) => <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-supabase-green/10 text-supabase-green border border-supabase-green/20">{subj}</span>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-supabase-border">
                                     <div className="flex items-center gap-2 text-sm text-supabase-muted"><Mail size={14} /><span className="truncate">{teacher.email || 'N/A'}</span></div>
                                     <div className="flex items-center gap-2 text-sm text-supabase-muted"><Phone size={14} /><span className="truncate">{teacher.phone || 'N/A'}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-supabase-panel border border-supabase-border rounded-md overflow-hidden">
                         <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-supabase-sidebar">
                                    <th className="px-6 py-3 text-xs font-medium text-supabase-muted uppercase">Status</th>
                                    <th className="px-6 py-3 text-xs font-medium text-supabase-muted uppercase">Teacher</th>
                                    <th className="px-6 py-3 text-xs font-medium text-supabase-muted uppercase">Subjects</th>
                                    <th className="px-6 py-3 text-xs font-medium text-supabase-muted uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeachers.map(teacher => (
                                    <tr key={teacher.id} className="hover:bg-supabase-hover/50">
                                        <td className="px-6 py-4 border-b border-supabase-border">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${teacher.status === 'active' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>{teacher.status}</span>
                                        </td>
                                        <td className="px-6 py-4 border-b border-supabase-border flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-supabase-sidebar">
                                                {teacher.profile_photo_url ? <img src={teacher.profile_photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{teacher.name.charAt(0)}</div>}
                                            </div>
                                            <span className="text-sm font-medium text-supabase-text">{teacher.name}</span>
                                        </td>
                                        <td className="px-6 py-4 border-b border-supabase-border">
                                            <div className="flex gap-1">{teacher.subjects?.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-supabase-green/10 text-supabase-green border border-supabase-green/20">{s}</span>)}</div>
                                        </td>
                                        <td className="px-6 py-4 border-b border-supabase-border text-right">
                                             <button onClick={() => handleEdit(teacher)} className="p-1.5 text-supabase-muted hover:text-supabase-text"><Edit2 size={16} /></button>
                                             <button onClick={() => handleDelete(teacher.id, teacher.name)} className="p-1.5 text-supabase-muted hover:text-red-400"><Trash2 size={16} /></button>
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

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-supabase-panel border border-supabase-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-supabase-border bg-supabase-sidebar shrink-0">
                      <h2 className="text-sm font-semibold text-supabase-text">{editingId ? 'Edit Teacher' : 'Add Teacher'}</h2>
                      <button onClick={handleCloseModal} className="text-supabase-muted hover:text-supabase-text"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleAddTeacher} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                      <div className="flex justify-center mb-2">
                          <div className="relative w-20 h-20 rounded-full border border-supabase-border bg-supabase-bg group cursor-pointer overflow-hidden flex items-center justify-center" onClick={triggerFileInput}>
                              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera size={24} className="text-supabase-muted" />}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center"><Upload size={20} className="text-white" /></div>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-medium text-supabase-muted uppercase">Status</label>
                          <div className="flex gap-2">
                              <button type="button" onClick={() => setFormData({...formData, status: 'active'})} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border text-xs font-bold transition-all ${formData.status === 'active' ? 'bg-green-900/20 border-supabase-green text-supabase-green' : 'bg-supabase-bg border-supabase-border text-supabase-muted hover:border-supabase-muted'}`}><ShieldCheck size={14}/> ACTIVE</button>
                              <button type="button" onClick={() => setFormData({...formData, status: 'inactive'})} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border text-xs font-bold transition-all ${formData.status === 'inactive' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-supabase-bg border-supabase-border text-supabase-muted hover:border-supabase-muted'}`}><ShieldAlert size={14}/> INACTIVE</button>
                          </div>
                      </div>

                      <div className="space-y-1.5"><label className="text-xs font-medium text-supabase-muted">Full Name</label><div className="relative"><User className="absolute left-3 top-2.5 text-supabase-muted" size={16} /><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded pl-9 pr-3 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none" /></div></div>
                      <div className="space-y-2"><label className="text-xs font-medium text-supabase-muted">Subjects</label><div className="border border-supabase-border rounded-md bg-supabase-bg p-4 flex flex-wrap gap-2">{availableSubjects.map(subj => { const isSelected = formData.subjects.includes(subj.name); return <button type="button" key={subj.id} onClick={() => toggleSubject(subj.name)} className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${isSelected ? 'bg-supabase-green text-black border-supabase-green' : 'bg-transparent text-supabase-muted border-supabase-border'}`}>{isSelected && <Check size={12} />}{subj.name}</button>; })}</div></div>
                      <div className="space-y-1.5"><label className="text-xs font-medium text-supabase-muted">Email</label><div className="relative"><Mail className="absolute left-3 top-2.5 text-supabase-muted" size={16} /><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded pl-9 pr-3 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none" /></div></div>
                      <div className="space-y-1.5"><label className="text-xs font-medium text-supabase-muted">Phone</label><div className="relative"><Phone className="absolute left-3 top-2.5 text-supabase-muted" size={16} /><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-supabase-bg border border-supabase-border rounded pl-9 pr-3 py-2 text-sm text-supabase-text focus:border-supabase-green outline-none" /></div></div>
                      <div className="pt-2 flex justify-end gap-3"><button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm text-supabase-muted hover:text-supabase-text">Cancel</button><button type="submit" disabled={isSubmitting} className="bg-supabase-green text-black px-4 py-2 rounded text-sm font-medium hover:bg-supabase-greenHover flex items-center gap-2">{isSubmitting ? 'Saving...' : 'Save Teacher'}</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default TeachersView;