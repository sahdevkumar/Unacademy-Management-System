
import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, Loader2, Mail, Phone, User, MapPin, Calendar, MoreVertical, Edit2, Trash2, Download, X, ArrowLeft, Shield, Briefcase, Save } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { Parent } from '../types';

const ParentsView: React.FC = () => {
  const { showToast } = useToast();
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setParents(data || []);
      
      if (selectedParent) {
        const updated = data?.find(p => p.id === selectedParent.id);
        if (updated) setSelectedParent(updated);
      }
    } catch (error: any) {
      showToast("Failed to fetch parents: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent({ ...parent });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParent || !supabase) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('parents')
        .upsert({
          id: editingParent.id || undefined,
          full_name: editingParent.full_name,
          email: editingParent.email,
          phone: editingParent.phone,
          address: editingParent.address,
          occupation: editingParent.occupation,
          status: editingParent.status
        });

      if (error) throw error;

      showToast("Parent profile saved successfully", "success");
      setIsEditModalOpen(false);
      await fetchParents();
    } catch (error: any) {
      showToast("Save failed: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (parent: Parent) => {
    setParentToDelete(parent);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!parentToDelete || !supabase) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', parentToDelete.id);

      if (error) throw error;

      showToast("Parent record deleted", "success");
      setIsDeleteConfirmOpen(false);
      if (selectedParent?.id === parentToDelete.id) {
        setSelectedParent(null);
      }
      await fetchParents();
    } catch (error: any) {
      showToast("Deletion failed: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = (parent: Parent) => {
    if (parent.email) {
      window.location.href = `mailto:${parent.email}?subject=Academic Update`;
    } else {
      showToast("No email address registered for this parent", "error");
    }
  };

  const handleCall = (parent: Parent) => {
    if (parent.phone) {
      window.location.href = `tel:${parent.phone}`;
    } else {
      showToast("No contact number registered for this parent", "error");
    }
  };

  const filteredParents = parents.filter(parent => {
    const matchesSearch = 
      parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parent.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parent.phone.includes(searchTerm));
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-supabase-bg text-supabase-muted">
        <Loader2 className="animate-spin mb-4 text-supabase-green" size={40} />
        <p className="text-sm font-medium uppercase tracking-widest animate-pulse">Synchronizing Parent Registry...</p>
      </div>
    );
  }

  if (selectedParent) {
    return (
      <div className="flex flex-col h-full bg-supabase-bg overflow-hidden">
        <div className="p-6 border-b border-supabase-border bg-supabase-panel/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedParent(null)}
              className="p-2 text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-supabase-text uppercase tracking-tight">Parent Profile</h1>
              <p className="text-[10px] text-supabase-muted font-bold uppercase tracking-widest">Registry ID: {selectedParent.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleEdit(selectedParent)}
              className="p-2 text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 rounded-xl transition-all"
            >
              <Edit2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 scrollbar-hide">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-supabase-panel border border-supabase-border rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-supabase-green"></div>
                <div className="w-32 h-32 rounded-[2.5rem] bg-supabase-green/10 flex items-center justify-center text-supabase-green font-bold text-5xl mx-auto mb-6 border-4 border-supabase-green/20 shadow-inner overflow-hidden">
                  {selectedParent.full_name.charAt(0)}
                </div>
                <h2 className="text-2xl font-black text-supabase-text uppercase tracking-tighter mb-1">{selectedParent.full_name}</h2>
                <p className="text-sm text-supabase-muted font-bold uppercase tracking-widest mb-6">{selectedParent.occupation || 'Parent'}</p>
                
                <div className="flex items-center justify-center gap-2 mb-8">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedParent.status === 'inactive' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-supabase-green/10 text-supabase-green border border-supabase-green/20'}`}>
                    {selectedParent.status || 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleMessage(selectedParent)}
                    className="bg-supabase-green text-black py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
                  >
                    Message
                  </button>
                  <button 
                    onClick={() => handleCall(selectedParent)}
                    className="bg-supabase-bg border border-supabase-border text-supabase-text py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-supabase-hover transition-all"
                  >
                    Call
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <section>
                <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest mb-4 flex items-center gap-3">
                  <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<User size={16} />} label="Full Name" value={selectedParent.full_name} />
                  <InfoItem icon={<Mail size={16} />} label="Email Address" value={selectedParent.email || 'No Email Registered'} />
                  <InfoItem icon={<Phone size={16} />} label="Phone Number" value={selectedParent.phone} />
                  <InfoItem icon={<MapPin size={16} />} label="Address" value={selectedParent.address || 'No Address Listed'} />
                  <InfoItem icon={<Briefcase size={16} />} label="Occupation" value={selectedParent.occupation || 'Not Specified'} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-supabase-bg">
      <div className="p-4 sm:p-6 border-b border-supabase-border bg-supabase-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-supabase-text uppercase tracking-tighter flex items-center gap-3">
              <Users className="text-supabase-green" size={24} />
              Parent Directory
            </h1>
            <p className="text-[10px] sm:text-xs text-supabase-muted mt-1 font-medium uppercase tracking-wider">
              Managing {filteredParents.length} Total Parents
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20"
              onClick={() => {
                setEditingParent({ id: '', full_name: '', phone: '', status: 'active' });
                setIsEditModalOpen(true);
              }}
            >
              <Plus size={18} />
              <span>Add Parent</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={18} />
            <input 
              type="text"
              placeholder="Search parents..."
              className="w-full bg-supabase-bg border border-supabase-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 scrollbar-hide">
        {filteredParents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-supabase-muted border-2 border-dashed border-supabase-border rounded-2xl">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">No parents found</p>
            <p className="text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <div className="bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden shadow-xl overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-supabase-bg/50 border-b border-supabase-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Parent Info</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Phone</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted">Occupation</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-supabase-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-supabase-border">
                {filteredParents.map((parent) => (
                  <tr 
                    key={parent.id} 
                    className="hover:bg-supabase-hover/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedParent(parent)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-supabase-green/10 flex items-center justify-center text-supabase-green font-bold text-lg border border-supabase-green/20">
                          {parent.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-supabase-text group-hover:text-supabase-green transition-colors">{parent.full_name}</div>
                          <div className="text-[10px] text-supabase-muted uppercase tracking-tighter">{parent.email || 'No Email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-supabase-muted">
                        <Phone size={14} />
                        {parent.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-supabase-text font-medium">{parent.occupation || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(parent); }}
                          className="p-2 text-supabase-muted hover:text-supabase-green hover:bg-supabase-green/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(parent); }}
                          className="p-2 text-supabase-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
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
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingParent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-supabase-panel border border-supabase-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-supabase-border flex items-center justify-between bg-supabase-bg/50">
              <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                <Edit2 size={18} className="text-supabase-green" />
                {editingParent.id ? 'Edit Parent Profile' : 'Add New Parent'}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-supabase-muted hover:text-supabase-text rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text"
                    className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                    value={editingParent.full_name}
                    onChange={(e) => setEditingParent({...editingParent, full_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="text"
                    className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                    value={editingParent.phone}
                    onChange={(e) => setEditingParent({...editingParent, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email"
                    className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                    value={editingParent.email || ''}
                    onChange={(e) => setEditingParent({...editingParent, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Occupation</label>
                  <input 
                    type="text"
                    className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                    value={editingParent.occupation || ''}
                    onChange={(e) => setEditingParent({...editingParent, occupation: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Address</label>
                  <textarea 
                    className="w-full bg-supabase-bg border border-supabase-border rounded-xl px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all min-h-[80px]"
                    value={editingParent.address || ''}
                    onChange={(e) => setEditingParent({...editingParent, address: e.target.value})}
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
                  {editingParent.id ? 'Save Changes' : 'Add Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && parentToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-supabase-panel border border-supabase-border w-full max-w-md rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-6 border-2 border-red-500/20">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-black text-supabase-text uppercase tracking-tight mb-2">Delete Parent Record?</h2>
            <p className="text-sm text-supabase-muted mb-8 leading-relaxed">
              You are about to permanently delete <span className="text-supabase-text font-bold">{parentToDelete.full_name}</span> from the registry. This action cannot be undone.
            </p>
            
            <div className="flex flex-col gap-3">
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
};

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="bg-supabase-panel border border-supabase-border p-4 rounded-2xl flex items-start gap-4 group hover:border-supabase-green/30 transition-all">
    <div className="w-10 h-10 rounded-xl bg-supabase-bg flex items-center justify-center text-supabase-muted group-hover:text-supabase-green transition-colors">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-supabase-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-supabase-text">{value}</p>
    </div>
  </div>
);

export default ParentsView;
