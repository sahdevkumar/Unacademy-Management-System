
import React, { useState, useEffect } from 'react';
import { 
    UserPlus, 
    Search, 
    Plus, 
    Loader2, 
    User, 
    CheckCircle2, 
    ArrowRight, 
    Save, 
    X,
    ClipboardCheck,
    Calendar,
    Hash,
    MapPin,
    ShieldCheck,
    Briefcase,
    Phone,
    Mail
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { useToast } from '../context/ToastContext';
import { ClassInfo, Parent, Student } from '../types';
import { Search as SearchIcon } from 'lucide-react';

interface Registration {
    id: string;
    sid?: string;
    student_name: string;
    gender?: string;
    date_of_birth?: string;
    address?: string;
    parent_data?: any;
    phone: string;
    email: string;
    class_id: string;
    status: string; // '0' | '1' | '2' | '3' | '4' | '5'
    registration_fee_status: 'paid' | 'unpaid';
    created_at: string;
}

const getStatusLabel = (status: string | undefined) => {
    switch (status?.toString().toLowerCase()) {
      case '40': return 'Pending';
      case '41': return 'Approved';
      case '42': return 'Reject';
      case '43': return 'Special Approval';
      case '5': case 'admitted': return 'Admitted';
      default: return 'Pending';
    }
};

const getStatusColor = (status: string | undefined) => {
    const s = status?.toString().toLowerCase();
    if (['41', '43', '5', 'admitted'].includes(s || '')) return 'bg-supabase-green/10 text-supabase-green';
    if (['42', 'reject', 'rejected'].includes(s || '')) return 'bg-red-500/10 text-red-500';
    return 'bg-yellow-500/10 text-yellow-500';
};

const AdmissionView: React.FC = () => {
    const { showToast } = useToast();
    const [approvedRegistrations, setApprovedRegistrations] = useState<Registration[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [parents, setParents] = useState<Parent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Parent Search State
    const [searchTermParent, setSearchTermParent] = useState('');
    const [showAddParentForm, setShowAddParentForm] = useState(false);
    const [newParent, setNewParent] = useState<Partial<Parent>>({ full_name: '', phone: '', email: '', occupation: '', status: 'active' });

    // Admission Modal state
    const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    
    const [admissionData, setAdmissionData] = useState<Partial<Student>>({
        user_id: '',
        full_name: '',
        roll_number: '',
        class_name: '',
        parent_id: '',
        guardian_name: '',
        contact_number: '',
        email: '',
        address: '',
        date_of_birth: '',
        gender: 'Male',
        status: 'active'
    });

    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            try {
                const [classData] = await Promise.all([
                    scheduleService.getClasses(),
                    fetchApprovedRegistrations(),
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

    const fetchApprovedRegistrations = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .in('status', ['approved', 'admission', '4', '40', '41', '43']);
            
            if (error) throw error;
            setApprovedRegistrations(data || []);
        } catch (error: any) {
            showToast("Failed to fetch approved registrations: " + error.message, "error");
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

    useEffect(() => {
        const fetchIdentifiers = async () => {
            if (!supabase || !isAdmissionModalOpen) return;
            
            try {
                // Fetch user_id globally
                const { data: userData, error: userError } = await supabase
                    .from('students')
                    .select('user_id');

                let nextUserId = 'UCS00001';
                if (!userError && userData) {
                    const userIds = userData
                        .map(s => s.user_id)
                        .filter(Boolean)
                        .filter(u => typeof u === 'string' && u.startsWith('UCS'));
                    
                    if (userIds.length > 0) {
                        let maxNum = 0;
                        for (const u of userIds) {
                            const match = u.match(/UCS(\d+)/);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > maxNum) maxNum = num;
                            }
                        }
                        nextUserId = `UCS${String(maxNum + 1).padStart(5, '0')}`;
                    }
                }

                if (!admissionData.class_name) {
                    setAdmissionData(prev => ({ ...prev, user_id: nextUserId }));
                    return;
                }

                // Fetch roll number for specific class
                const { data: rollData, error: rollError } = await supabase
                    .from('students')
                    .select('roll_number')
                    .eq('class_name', admissionData.class_name);

                let nextRoll = 'R0001';
                if (!rollError && rollData) {
                    const rollNumbers = rollData
                        .map(s => s.roll_number)
                        .filter(Boolean)
                        .filter(r => typeof r === 'string' && r.startsWith('R'));
                    
                    if (rollNumbers.length > 0) {
                        let maxNum = 0;
                        for (const r of rollNumbers) {
                            const match = r.match(/R(\d+)/);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > maxNum) maxNum = num;
                            }
                        }
                        nextRoll = `R${String(maxNum + 1).padStart(4, '0')}`;
                    }
                }

                setAdmissionData(prev => ({ ...prev, roll_number: nextRoll, user_id: nextUserId }));
            } catch(error) {
                console.error("Identifier generation failed:", error);
            }
        };

        fetchIdentifiers();
    }, [admissionData.class_name, isAdmissionModalOpen]);


    const handleStartAdmission = (reg: Registration) => {
        setSelectedRegistration(reg);
        setCurrentStep(1);
        
        // Find class name from class_id
        const targetClass = classes.find(c => c.id === reg.class_id);
        
        // Try to find parent by phone
        const existingParent = parents.find(p => p.phone === reg.phone);

        setAdmissionData({
            user_id: '', // To be filled
            full_name: reg.student_name,
            roll_number: '', // To be filled
            class_name: targetClass?.name || '',
            parent_id: existingParent?.id || '',
            guardian_name: reg.parent_data?.parents_name || '',
            contact_number: reg.phone,
            email: reg.email || '',
            address: reg.address || '',
            date_of_birth: reg.date_of_birth || '',
            gender: reg.gender || 'Male',
            status: 'active'
        });
        setSearchTermParent(existingParent?.full_name || reg.parent_data?.parents_name || '');
        setShowAddParentForm(!existingParent);
        if (!existingParent) {
            setNewParent({
                full_name: reg.parent_data?.parents_name || '',
                phone: reg.phone || '',
                email: reg.email || '',
                occupation: '',
                status: 'active'
            });
        }
        setIsAdmissionModalOpen(true);
    };

    const handleDirectAdmission = () => {
        setSelectedRegistration(null);
        setCurrentStep(1);
        setAdmissionData({
            user_id: '',
            full_name: '',
            roll_number: '',
            class_name: classes[0]?.name || '',
            parent_id: '',
            guardian_name: '',
            contact_number: '',
            email: '',
            address: '',
            date_of_birth: '',
            gender: 'Male',
            status: 'active'
        });
        setSearchTermParent('');
        setShowAddParentForm(false);
        setNewParent({ full_name: '', phone: '', email: '', occupation: '', status: 'active' });
        setIsAdmissionModalOpen(true);
    };

    const handleSubmitAdmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        
        setIsSubmitting(true);
        try {
            let finalParentId = admissionData.parent_id || null;
            let finalGuardianName = admissionData.guardian_name;
            let finalContactNumber = admissionData.contact_number;

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

            // 1. Create student record
            const { error: studentError } = await supabase
                .from('students')
                .insert([{
                    ...admissionData,
                    parent_id: finalParentId,
                    guardian_name: finalGuardianName,
                    contact_number: finalContactNumber
                }]);
            
            if (studentError) throw studentError;
            
            // 2. Update registration status if applicable
            if (selectedRegistration) {
                const { error: regError } = await supabase
                    .from('registrations')
                    .update({ status: 'admitted' })
                    .eq('id', selectedRegistration.id);
                
                if (regError) throw regError;
            }
            
            showToast("Admission completed successfully", "success");
            setIsAdmissionModalOpen(false);
            await fetchApprovedRegistrations();
        } catch (error: any) {
            showToast("Failed to complete admission: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRegistrations = approvedRegistrations.filter(reg => 
        reg.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        reg.phone.includes(searchTerm)
    );

    return (
        <div className="p-6 bg-supabase-bg min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-supabase-text uppercase tracking-widest flex items-center gap-3">
                        <UserPlus className="text-supabase-green" />
                        Student Admission
                    </h1>
                    <p className="text-supabase-muted text-sm mt-1">Convert approved registrations to active students</p>
                </div>
                <button 
                    onClick={handleDirectAdmission}
                    className="bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10"
                >
                    <Plus size={18} />
                    Direct Admission
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Approved Registrations */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-supabase-panel border border-supabase-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                        <Search className="text-supabase-muted" size={18} />
                        <input 
                            type="text"
                            placeholder="Search approved registrations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm text-supabase-text focus:outline-none"
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-supabase-green mb-4" size={40} />
                            <p className="text-supabase-muted font-mono text-xs tracking-widest uppercase">Fetching Approved Applications...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredRegistrations.length > 0 ? (
                                filteredRegistrations.map((reg) => (
                                    <div key={reg.id} className="bg-supabase-panel border border-supabase-border rounded-xl p-5 hover:border-supabase-green/50 transition-all group shadow-sm">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-supabase-green/10 rounded-xl flex items-center justify-center text-supabase-green">
                                                <User size={24} />
                                            </div>
                                            <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${getStatusColor(reg.status)}`}>
                                                {getStatusLabel(reg.status)}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-supabase-text mb-1">{reg.student_name}</h3>
                                        <p className="text-xs text-supabase-muted mb-4 uppercase tracking-wider">Class ID: {reg.class_id}</p>
                                        
                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                                <ClipboardCheck size={14} className="text-supabase-green" />
                                                Fee: {reg.registration_fee_status === 'paid' ? 'Paid' : 'Unpaid'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                                <Calendar size={14} className="text-supabase-green" />
                                                Applied: {new Date(reg.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleStartAdmission(reg)}
                                            className="w-full bg-supabase-sidebar border border-supabase-border text-supabase-text hover:bg-supabase-green hover:text-black hover:border-supabase-green px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                        >
                                            Complete Admission
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full bg-supabase-panel border border-supabase-border border-dashed rounded-xl p-12 text-center">
                                    <div className="w-16 h-16 bg-supabase-sidebar rounded-full flex items-center justify-center text-supabase-muted mx-auto mb-4">
                                        <ClipboardCheck size={32} />
                                    </div>
                                    <h3 className="text-supabase-text font-bold mb-1 uppercase tracking-widest">No Pending Admissions</h3>
                                    <p className="text-supabase-muted text-xs">All approved registrations have been processed.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Admission Stats/Info */}
                <div className="space-y-6">
                    <div className="bg-supabase-panel border border-supabase-border rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-black text-supabase-text uppercase tracking-widest mb-6 flex items-center gap-2">
                            <ShieldCheck className="text-supabase-green" size={18} />
                            Admission Policy
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="w-5 h-5 bg-supabase-green/10 rounded flex items-center justify-center text-supabase-green shrink-0 mt-0.5">
                                    <CheckCircle2 size={12} />
                                </div>
                                <p className="text-xs text-supabase-muted leading-relaxed">
                                    Ensure all registration fees are cleared before completing admission.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-5 h-5 bg-supabase-green/10 rounded flex items-center justify-center text-supabase-green shrink-0 mt-0.5">
                                    <CheckCircle2 size={12} />
                                </div>
                                <p className="text-xs text-supabase-muted leading-relaxed">
                                    Verify student age and class eligibility as per school guidelines.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-5 h-5 bg-supabase-green/10 rounded flex items-center justify-center text-supabase-green shrink-0 mt-0.5">
                                    <CheckCircle2 size={12} />
                                </div>
                                <p className="text-xs text-supabase-muted leading-relaxed">
                                    Assign a unique roll number to each student upon admission.
                                </p>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-supabase-green/5 border border-supabase-green/20 rounded-xl p-6">
                        <h4 className="text-supabase-green font-black text-[10px] uppercase tracking-[0.2em] mb-2">Quick Tip</h4>
                        <p className="text-xs text-supabase-text/80 leading-relaxed">
                            You can directly admit students without a registration if they have completed the walk-in process.
                        </p>
                    </div>
                </div>
            </div>

            {/* Admission Modal */}
            {isAdmissionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar/50">
                            <div className="flex flex-col">
                                <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                                    <UserPlus className="text-supabase-green" size={20} />
                                    {selectedRegistration ? 'Complete Admission' : 'Direct Admission'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    {[1, 2, 3].map((step) => (
                                        <div 
                                            key={step}
                                            className={`h-1 w-8 rounded-full transition-all ${
                                                currentStep >= step ? 'bg-supabase-green' : 'bg-supabase-border'
                                            }`}
                                        />
                                    ))}
                                    <span className="text-[10px] font-black text-supabase-muted uppercase tracking-widest ml-2">
                                        Step {currentStep} of 3
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setIsAdmissionModalOpen(false)} className="text-supabase-muted hover:text-supabase-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (currentStep === 3) {
                                    handleSubmitAdmission(e);
                                }
                            }} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                }
                            }}
                            className="p-6 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="space-y-6 mb-6">
                                {currentStep === 1 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        {/* Student Details Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-supabase-border">
                                                <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                                                <h3 className="text-[11px] font-bold text-supabase-text uppercase tracking-widest">Student Information</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Full Name</label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={16} />
                                                        <input 
                                                            required
                                                            type="text"
                                                            value={admissionData.full_name || ''}
                                                            onChange={(e) => setAdmissionData({...admissionData, full_name: e.target.value})}
                                                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                                            placeholder="Student's Full Name"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Date of Birth</label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={16} />
                                                        <input 
                                                            required
                                                            type="date"
                                                            value={admissionData.date_of_birth || ''}
                                                            onChange={(e) => setAdmissionData({...admissionData, date_of_birth: e.target.value})}
                                                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Class Assignment</label>
                                                    <select 
                                                        required
                                                        value={admissionData.class_name}
                                                        onChange={(e) => setAdmissionData({...admissionData, class_name: e.target.value})}
                                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                                    >
                                                        {classes.map(c => (
                                                            <option key={c.id} value={c.name}>{c.name} - {c.section}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Gender</label>
                                                    <div className="flex gap-4 h-9 items-center">
                                                        {['Male', 'Female', 'Other'].map(g => (
                                                            <label key={g} className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="radio"
                                                                    name="gender"
                                                                    value={g}
                                                                    checked={admissionData.gender === g}
                                                                    onChange={(e) => setAdmissionData({...admissionData, gender: e.target.value})}
                                                                    className="accent-supabase-green"
                                                                />
                                                                <span className="text-xs text-supabase-text">{g}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        {/* Guardian Details Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-supabase-border">
                                                <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                                                <h3 className="text-[11px] font-bold text-supabase-text uppercase tracking-widest">Guardian Information</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2 space-y-2 relative">
                                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">
                                                        Guardian Name
                                                    </label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={16} />
                                                        <input 
                                                            required
                                                            type="text"
                                                            value={admissionData.guardian_name || ''}
                                                            onChange={(e) => {
                                                                setAdmissionData({...admissionData, guardian_name: e.target.value});
                                                                setSearchTermParent(e.target.value);
                                                            }}
                                                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-10 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                                            placeholder="Search or Enter Guardian Name"
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setShowAddParentForm(!showAddParentForm);
                                                                if (!showAddParentForm) {
                                                                    setNewParent({ ...newParent, full_name: admissionData.guardian_name });
                                                                }
                                                            }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-supabase-green hover:text-supabase-green/80 transition-colors p-1 rounded-md hover:bg-supabase-green/10"
                                                            title="Add New Parent"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                        
                                                        {searchTermParent && !showAddParentForm && !admissionData.parent_id && (
                                                            <div className="absolute z-20 left-0 right-0 mt-1 bg-supabase-sidebar border border-supabase-border rounded-xl shadow-2xl max-h-48 overflow-y-auto">
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
                                                                                setAdmissionData({ 
                                                                                    ...admissionData, 
                                                                                    parent_id: parent.id, 
                                                                                    guardian_name: parent.full_name, 
                                                                                    contact_number: parent.phone,
                                                                                    address: parent.address || admissionData.address
                                                                                });
                                                                                setSearchTermParent('');
                                                                                setShowAddParentForm(false);
                                                                            }}
                                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-supabase-hover flex items-center justify-between group"
                                                                        >
                                                                            <div>
                                                                                <div className="font-bold text-supabase-text">{parent.full_name}</div>
                                                                                <div className="text-[10px] text-supabase-muted">{parent.phone}</div>
                                                                            </div>
                                                                            {admissionData.parent_id === parent.id && <CheckCircle2 size={14} className="text-supabase-green" />}
                                                                        </button>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {admissionData.parent_id && !showAddParentForm && (
                                                        <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-supabase-green/10 border border-supabase-green/20 rounded-md">
                                                            <CheckCircle2 size={12} className="text-supabase-green" />
                                                            <span className="text-[10px] text-supabase-green font-medium">Linked to existing record</span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setAdmissionData({...admissionData, parent_id: ''})}
                                                                className="ml-auto text-[10px] text-supabase-muted hover:text-supabase-red"
                                                            >
                                                                Unlink
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {showAddParentForm && (
                                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-supabase-bg/50 border border-supabase-border rounded-xl animate-in fade-in slide-in-from-top-2">
                                                        <div className="md:col-span-2 flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-supabase-text uppercase tracking-widest">New Parent Details</span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setShowAddParentForm(false)}
                                                                className="text-[10px] text-supabase-muted hover:text-supabase-red"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-supabase-muted uppercase font-bold">Full Name</label>
                                                            <div className="relative">
                                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={14} />
                                                                <input 
                                                                    type="text"
                                                                    value={newParent.full_name || ''}
                                                                    onChange={(e) => setNewParent({...newParent, full_name: e.target.value})}
                                                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-supabase-muted uppercase font-bold">Phone</label>
                                                            <div className="relative">
                                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={14} />
                                                                <input 
                                                                    type="text"
                                                                    value={newParent.phone || ''}
                                                                    onChange={(e) => setNewParent({...newParent, phone: e.target.value})}
                                                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-supabase-muted uppercase font-bold">Email</label>
                                                            <div className="relative">
                                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={14} />
                                                                <input 
                                                                    type="email"
                                                                    value={newParent.email || ''}
                                                                    onChange={(e) => setNewParent({...newParent, email: e.target.value})}
                                                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-supabase-muted uppercase font-bold">Occupation</label>
                                                            <div className="relative">
                                                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={14} />
                                                                <input 
                                                                    type="text"
                                                                    value={newParent.occupation || ''}
                                                                    onChange={(e) => setNewParent({...newParent, occupation: e.target.value})}
                                                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Address</label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-3 text-supabase-muted" size={16} />
                                                        <textarea 
                                                            required
                                                            rows={2}
                                                            value={admissionData.address || ''}
                                                            onChange={(e) => setAdmissionData({...admissionData, address: e.target.value})}
                                                            className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg pl-10 pr-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all resize-none"
                                                            placeholder="Full Residential Address"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="flex items-center gap-2 pb-2 border-b border-supabase-border">
                                            <div className="w-1 h-4 bg-supabase-green rounded-full"></div>
                                            <h3 className="text-[11px] font-bold text-supabase-text uppercase tracking-widest">Review Admission Details</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-supabase-sidebar/30 p-6 rounded-2xl border border-supabase-border">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Student Info</h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">Name:</span>
                                                        <span className="text-supabase-text font-bold">{admissionData.full_name}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">Roll No:</span>
                                                        <span className="text-supabase-text font-bold">{admissionData.roll_number}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">Class:</span>
                                                        <span className="text-supabase-text font-bold">{admissionData.class_name}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">DOB:</span>
                                                        <span className="text-supabase-text font-bold">{admissionData.date_of_birth}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Guardian Info</h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">Guardian:</span>
                                                        <span className="text-supabase-text font-bold">{showAddParentForm ? newParent.full_name : admissionData.guardian_name}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">Contact:</span>
                                                        <span className="text-supabase-text font-bold">{showAddParentForm ? newParent.phone : admissionData.contact_number}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-supabase-muted">Email:</span>
                                                        <span className="text-supabase-text font-bold">{showAddParentForm ? newParent.email : admissionData.email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 space-y-2 pt-4 border-t border-supabase-border/50">
                                                <h4 className="text-[10px] font-black text-supabase-muted uppercase tracking-widest">Address</h4>
                                                <p className="text-xs text-supabase-text leading-relaxed">{admissionData.address}</p>
                                            </div>
                                        </div>

                                        <div className="bg-supabase-green/10 border border-supabase-green/20 p-4 rounded-xl flex gap-3">
                                            <CheckCircle2 className="text-supabase-green shrink-0" size={18} />
                                            <p className="text-xs text-supabase-green leading-relaxed">
                                                By clicking "Confirm Admission", you verify that all the above information is correct and the student is officially admitted to the institution.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-supabase-border flex gap-3">
                                {currentStep > 1 && (
                                    <button 
                                        type="button"
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        className="flex-1 px-4 py-2 border border-supabase-border rounded-lg text-sm font-bold text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover transition-all"
                                    >
                                        Back
                                    </button>
                                )}
                                {currentStep < 3 ? (
                                    <button 
                                        type="button"
                                        onClick={() => setCurrentStep(prev => prev + 1)}
                                        className="flex-1 bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10"
                                    >
                                        Next Step
                                        <ArrowRight size={18} />
                                    </button>
                                ) : (
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Confirm Admission
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdmissionView;
