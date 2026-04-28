
import React, { useState, useEffect } from 'react';
import { 
    ClipboardList, 
    Search, 
    Plus, 
    Filter, 
    Loader2, 
    User, 
    Phone, 
    Mail, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Eye, 
    Save, 
    X,
    GraduationCap,
    CreditCard,
    RotateCcw
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { counsellingService } from '../services/counsellingService';
import { validateMobileNumber } from '../services/validationService';
import { useToast } from '../context/ToastContext';
import { ClassInfo, RowStudent } from '../types';

interface Registration {
    id: string;
    sid?: string;
    row_student_id?: string;
    student_name: string;
    gender?: string;
    date_of_birth?: string;
    address?: string;
    parent_name: string;
    phone: string;
    email: string;
    class_id: string;
    status: string; // '0' | '1' | '2' | '3' | '4' | '5'
    registration_fee_status: 'paid' | 'unpaid';
    registration_fee_required?: boolean;
    parent_data?: any;
    course_interest?: any;
    additional_information?: any;
    counsellor_eid?: string;
    map_leader_eid?: string;
    row_student_token_no?: string;
    created_at: string;
    counselling_data?: any;
}

const getStatusLabel = (status: string | undefined) => {
    const s = status?.toString().toLowerCase();
    switch (s) {
      case '0':
      case '30': return 'Pending';
      case '1':
      case '31': return 'Approved';
      case '2':
      case '32': return 'Reject';
      case '33': return 'Special Approval';
      case '40': return 'Admission Pending';
      case '41': return 'Admission Approved';
      case '42': return 'Admission Reject';
      case '43': return 'Admission Special Approval';
      case '5': case 'admitted': return 'Admitted';
      default: return 'Pending';
    }
};

const getStatusColor = (status: string | undefined) => {
    const s = status?.toString().toLowerCase();
    if (['1', '31', '33', '41', '43', '5', 'admitted'].includes(s || '')) return 'bg-supabase-green/10 text-supabase-green';
    if (['2', '32', '42', 'reject', 'rejected'].includes(s || '')) return 'bg-red-500/10 text-red-500';
    return 'bg-yellow-500/10 text-yellow-500';
};

const RegistrationView: React.FC = () => {
    const { showToast } = useToast();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [approveFormData, setApproveFormData] = useState({
        class_id: '',
        registration_fee_required: true
    });
    const [formData, setFormData] = useState<Partial<Registration>>({
        student_name: '',
        parent_name: '',
        phone: '',
        email: '',
        class_id: '',
        status: '3',
        registration_fee_status: 'unpaid'
    });

    const inputClasses = "w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2.5 text-supabase-text focus:outline-none focus:border-supabase-green transition-all font-medium placeholder:text-supabase-muted/50";
    const labelClasses = "text-[10px] font-black text-supabase-muted uppercase tracking-widest ml-1";

    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            try {
                const [classData] = await Promise.all([
                    scheduleService.getClasses(),
                    fetchRegistrations()
                ]);
                setClasses(classData);
                if (classData.length > 0) {
                    setFormData(prev => ({ ...prev, class_id: classData[0].id }));
                }
            } catch (error: any) {
                showToast("Initialization failed: " + error.message, "error");
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, []);

    const fetchRegistrations = async () => {
        if (!supabase) return;
        try {
            setIsLoading(true);
            // Fetch row_students with their linked registrations in a single query
            const { data: records, error } = await supabase
                .from('row_students')
                .select('*, registrations(*)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            const mappedRegs: Registration[] = (records as any[])
                .map(record => {
                    const regInfo = record.registrations?.[0];
                    return {
                        id: record.id,
                        sid: regInfo?.sid,
                        row_student_id: record.id,
                        student_name: record.student_name,
                        gender: regInfo?.gender || record.gender,
                        date_of_birth: regInfo?.date_of_birth || record.date_of_birth,
                        address: regInfo?.address || record.address,
                        parent_name: regInfo?.parent_data?.parents_name || record.parent_data?.parents_name || '',
                        phone: record.contact_no,
                        email: record.email || '',
                        class_id: regInfo?.class_id || record.additional_information?.class_id || null,
                        status: record.status || '3',
                        registration_fee_status: regInfo?.registration_fee_status || record.additional_information?.registration_fee_status || 'unpaid',
                        registration_fee_required: regInfo?.registration_fee_required ?? true,
                        parent_data: regInfo?.parent_data || record.parent_data || {},
                        course_interest: regInfo?.course_interest || record.course_interest || {},
                        additional_information: regInfo?.additional_information || record.additional_information || {},
                        counsellor_eid: regInfo?.counsellor_eid || record.counsellor_eid,
                        map_leader_eid: regInfo?.map_leader_eid || record.map_leader_eid,
                        row_student_token_no: regInfo?.row_student_token_no || record.token_no,
                        created_at: record.created_at || new Date().toISOString(),
                        counselling_data: record
                    };
                });
            
            setRegistrations(mappedRegs);
        } catch (error: any) {
            showToast("Failed to fetch registrations: " + error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        
        setIsSubmitting(true);
        try {
            const validation = await validateMobileNumber(formData.phone, 'registrations');
            if (!validation.isValid) throw new Error(validation.error || "Invalid mobile number");

            const newRecord: Omit<RowStudent, 'id' | 'created_at'> = {
                date: new Date().toISOString().split('T')[0],
                student_name: formData.student_name || '',
                contact_no: formData.phone || '',
                email: formData.email || '',
                current_class: classes.find(c => c.id === formData.class_id)?.name || '',
                gender: '',
                date_of_birth: '',
                address: '',
                parent_data: {
                    parents_name: formData.parent_name || '',
                    parent_contact_no: '',
                    occupation: ''
                },
                course_interest: {
                    current_education_level: '',
                    school_name: '',
                    preferred_course: '',
                    percentage_or_cgpa: '',
                    previous_coaching: ''
                },
                additional_information: {
                    heard_about: '',
                    concerns_or_queries: '',
                    class_id: formData.class_id,
                    registration_fee_status: formData.registration_fee_status || 'unpaid'
                },
                status: '3'
            };
            
            await counsellingService.addRecord(newRecord);
            
            showToast("Registration submitted successfully", "success");
            setIsModalOpen(false);
            setFormData({
                student_name: '',
                parent_name: '',
                phone: '',
                email: '',
                class_id: classes[0]?.id || '',
                status: '3',
                registration_fee_status: 'unpaid'
            });
            fetchRegistrations();
        } catch (error: any) {
            showToast("Failed to submit registration: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateSID = async () => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const randomDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        
        return `SID${year}${month}${randomDigits}`;
    };

    const updateStatus = async (id: string, newStatus: Registration['status'], extraData?: { class_id?: string, registration_fee_required?: boolean }) => {
        if (!supabase) return;
        try {
            // If status is being updated to '1' or '31' (Approved), generate SID and save to registrations table
            if (newStatus === '1' || newStatus === '31') {
                const record = registrations.find(r => r.id === id);
                console.log("Found record for approval:", record);
                if (record) {
                    const sid = await generateSID();
                    console.log("Generated SID:", sid);
                    console.log("Record data for registration:", record);
                    
                    const classId = extraData?.class_id || record.class_id;
                    const feeRequired = extraData?.registration_fee_required ?? true;

                    // Check if registration already exists
                    const { data: existingReg, error: checkError } = await supabase
                        .from('registrations')
                        .select('id')
                        .eq('row_student_id', id)
                        .single();

                    if (checkError && checkError.code !== 'PGRST116') {
                        console.error("Error checking existing registration:", checkError);
                    }

                    if (existingReg) {
                        const { error: updateError } = await supabase
                            .from('registrations')
                            .update({ 
                                sid: sid,
                                status: 'approved',
                                class_id: classId || null,
                                registration_fee_required: feeRequired,
                                gender: record.gender,
                                date_of_birth: record.date_of_birth,
                                address: record.address,
                                parent_data: record.parent_data || { parents_name: record.parent_name },
                                course_interest: record.course_interest || {},
                                additional_information: record.additional_information || {},
                                counsellor_eid: record.counsellor_eid,
                                map_leader_eid: record.map_leader_eid,
                                row_student_token_no: record.row_student_token_no
                            })
                            .eq('row_student_id', id);
                        
                        if (updateError) {
                            console.error("Error updating registration:", updateError);
                            throw updateError;
                        }
                    } else {
                        const { error: insertError } = await supabase
                            .from('registrations')
                            .insert([{
                                sid: sid,
                                row_student_id: id,
                                student_name: record.student_name,
                                gender: record.gender,
                                date_of_birth: record.date_of_birth,
                                address: record.address,
                                parent_data: record.parent_data || { parents_name: record.parent_name },
                                phone: record.phone,
                                email: record.email,
                                class_id: classId || null,
                                course_interest: record.course_interest || {},
                                additional_information: record.additional_information || {},
                                status: 'approved',
                                registration_fee_status: record.registration_fee_status,
                                registration_fee_required: feeRequired,
                                counsellor_eid: record.counsellor_eid,
                                map_leader_eid: record.map_leader_eid,
                                row_student_token_no: record.row_student_token_no
                            }]);
                        
                        if (insertError) {
                            console.error("Error inserting registration:", insertError);
                            throw insertError;
                        }
                    }
                }
            }

            await counsellingService.updateRecord(id, { status: newStatus });
            
            showToast(`Registration ${getStatusLabel(newStatus)}`, "success");
            fetchRegistrations();
        } catch (error: any) {
            showToast("Failed to update status: " + error.message, "error");
        }
    };

    const updateFeeStatus = async (id: string, newStatus: Registration['registration_fee_status']) => {
        if (!supabase) return;
        try {
            const record = registrations.find(r => r.id === id);
            if (record && record.counselling_data) {
                const updatedAdditionalInfo = {
                    ...(record.counselling_data.additional_information || {}),
                    registration_fee_status: newStatus
                };
                await counsellingService.updateRecord(id, { additional_information: updatedAdditionalInfo });
                showToast(`Fee status updated to ${newStatus}`, "success");
                fetchRegistrations();
            }
        } catch (error: any) {
            showToast("Failed to update fee status: " + error.message, "error");
        }
    };

    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch = reg.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             reg.phone.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 bg-supabase-bg min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-supabase-text uppercase tracking-widest flex items-center gap-3">
                        <ClipboardList className="text-supabase-green" />
                        Student Registration
                    </h1>
                    <p className="text-supabase-muted text-sm mt-1">Manage new student applications and registration fees</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={18} />
                    <input 
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-supabase-panel border border-supabase-border rounded-lg pl-10 pr-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-supabase-muted" size={18} />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-supabase-panel border border-supabase-border rounded-lg pl-10 pr-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green appearance-none transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="0">Pending</option>
                        <option value="1">Approved</option>
                        <option value="2">Rejected</option>
                        <option value="3">Registration</option>
                        <option value="4">Admission</option>
                        <option value="5">Admitted</option>
                        <option value="30">Pending</option>
                        <option value="31">Registration Approved</option>
                        <option value="32">Registration Reject</option>
                        <option value="33">Registration Special Approval</option>
                        <option value="40">Admission Pending</option>
                        <option value="41">Admission Approved</option>
                        <option value="42">Admission Reject</option>
                        <option value="43">Admission Special Approval</option>
                    </select>
                </div>
                <button 
                    onClick={fetchRegistrations}
                    className="flex items-center justify-center px-4 py-2 bg-supabase-panel border border-supabase-border rounded-lg text-supabase-text hover:bg-supabase-hover transition-all"
                    title="Refresh"
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-supabase-green mb-4" size={40} />
                    <p className="text-supabase-muted font-mono text-xs tracking-widest uppercase">Synchronizing Registry...</p>
                </div>
            ) : (
                <div className="bg-supabase-panel border border-supabase-border rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-supabase-sidebar/50 border-b border-supabase-border">
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest">SID</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Student Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Contact</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Class</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Fee Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-supabase-muted uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-supabase-border">
                                {filteredRegistrations.length > 0 ? (
                                    filteredRegistrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-supabase-hover/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs text-supabase-green font-bold">
                                                    {reg.sid || '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-supabase-green/10 rounded-lg flex items-center justify-center text-supabase-green">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-supabase-text">{reg.student_name}</div>
                                                        <div className="text-[10px] text-supabase-muted uppercase tracking-wider">Parent: {reg.parent_name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                                        <Phone size={12} />
                                                        {reg.phone}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-supabase-muted">
                                                        <Mail size={12} />
                                                        {reg.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-supabase-sidebar border border-supabase-border rounded text-[10px] font-bold text-supabase-text uppercase tracking-wider">
                                                    {classes.find(c => c.id === reg.class_id)?.name || 'Unknown'} - {classes.find(c => c.id === reg.class_id)?.section || '?'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {reg.registration_fee_required !== false ? (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter w-fit bg-supabase-green/10 text-supabase-green border border-supabase-green/20">
                                                            Fee Required
                                                        </div>
                                                        <button 
                                                            onClick={() => updateFeeStatus(reg.id, reg.registration_fee_status === 'paid' ? 'unpaid' : 'paid')}
                                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all w-fit ${
                                                                reg.registration_fee_status === 'paid' 
                                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                            }`}
                                                        >
                                                            <CreditCard size={12} />
                                                            {reg.registration_fee_status}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest italic">
                                                        No Fee Required
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(reg.status)}`}>
                                                    {reg.status === '0' || reg.status === 'pending' ? <Clock size={12} /> : null}
                                                    {reg.status === '1' || reg.status === 'approved' ? <CheckCircle2 size={12} /> : null}
                                                    {reg.status === '2' || reg.status === 'rejected' ? <XCircle size={12} /> : null}
                                                    {reg.status === '3' || reg.status === 'registration' ? <CheckCircle2 size={12} /> : null}
                                                    {reg.status === '4' || reg.status === 'admission' ? <GraduationCap size={12} /> : null}
                                                    {reg.status === '5' || reg.status === 'admitted' ? <GraduationCap size={12} /> : null}
                                                    {getStatusLabel(reg.status)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {reg.status === '1' && (
                                                        <>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedRegistration(reg);
                                                                    setApproveFormData({
                                                                        class_id: reg.class_id || (classes.length > 0 ? classes[0].id : ''),
                                                                        registration_fee_required: true
                                                                    });
                                                                    setIsApproveModalOpen(true);
                                                                }}
                                                                className="p-2 text-supabase-green hover:bg-supabase-green/10 rounded-lg transition-all"
                                                                title="Approve Registration"
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => updateStatus(reg.id, '32')}
                                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                title="Reject Registration"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {reg.status === '3' && (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedRegistration(reg);
                                                                setIsProcessModalOpen(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-supabase-green/10 text-supabase-green hover:bg-supabase-green hover:text-black rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                                                        >
                                                            <GraduationCap size={14} />
                                                            Process
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedRegistration(reg);
                                                            setIsViewModalOpen(true);
                                                        }}
                                                        className="p-2 text-supabase-muted hover:text-supabase-text rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-supabase-muted">
                                            No registrations found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar/50">
                            <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                                <Plus className="text-supabase-green" size={20} />
                                New Registration
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-supabase-muted hover:text-supabase-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Student Name</label>
                                    <input 
                                        required
                                        type="text"
                                        value={formData.student_name}
                                        onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Parent/Guardian</label>
                                    <input 
                                        required
                                        type="text"
                                        value={formData.parent_name}
                                        onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        placeholder="Parent Name"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Phone Number</label>
                                    <input 
                                        required
                                        type="number"
                                        value={formData.phone}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length <= 10) {
                                                setFormData({...formData, phone: val});
                                            }
                                        }}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        placeholder="Mobile Number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Email Address</label>
                                    <input 
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Class Interested</label>
                                <select 
                                    required
                                    value={formData.class_id}
                                    onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                                    className="w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                >
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-supabase-border rounded-lg text-sm font-bold text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Submit Application
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Approve Registration Modal */}
            {isApproveModalOpen && selectedRegistration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar/50">
                            <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="text-supabase-green" size={20} />
                                Approve Registration
                            </h2>
                            <button onClick={() => setIsApproveModalOpen(false)} className="text-supabase-muted hover:text-supabase-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-3">
                                <h3 className="text-[10px] font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Student Preview</h3>
                                <div>
                                    <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Name</p>
                                    <p className="text-sm text-supabase-text font-bold">{selectedRegistration.student_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Phone</p>
                                    <p className="text-sm text-supabase-text font-medium">{selectedRegistration.phone}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Assign Class</label>
                                    <select 
                                        value={approveFormData.class_id}
                                        onChange={(e) => setApproveFormData({...approveFormData, class_id: e.target.value})}
                                        className={inputClasses}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className={labelClasses}>Registration Fee Required?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                checked={approveFormData.registration_fee_required === true}
                                                onChange={() => setApproveFormData({...approveFormData, registration_fee_required: true})}
                                                className="text-supabase-green focus:ring-supabase-green"
                                            />
                                            <span className="text-sm text-supabase-text">Yes</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                checked={approveFormData.registration_fee_required === false}
                                                onChange={() => setApproveFormData({...approveFormData, registration_fee_required: false})}
                                                className="text-supabase-green focus:ring-supabase-green"
                                            />
                                            <span className="text-sm text-supabase-text">No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setIsApproveModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-supabase-border rounded-lg text-sm font-bold text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                            await updateStatus(selectedRegistration.id, '31', approveFormData);
                                            setIsApproveModalOpen(false);
                                            setSelectedRegistration(null);
                                        } catch (error) {
                                            // Error handled in updateStatus
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    Confirm Approval
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Process Registration Modal */}
            {isProcessModalOpen && selectedRegistration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar/50">
                            <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap className="text-supabase-green" size={20} />
                                Process Registration
                            </h2>
                            <button onClick={() => {
                                setIsProcessModalOpen(false);
                                setSelectedRegistration(null);
                            }} className="text-supabase-muted hover:text-supabase-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Student Information</h3>
                                {selectedRegistration.sid && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">SID:</span>
                                        <span className="font-mono text-sm text-supabase-green font-bold">{selectedRegistration.sid}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Student Name</label>
                                        <input 
                                            type="text"
                                            value={selectedRegistration.student_name}
                                            onChange={(e) => setSelectedRegistration({...selectedRegistration, student_name: e.target.value})}
                                            className="w-full bg-supabase-panel border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Parent/Guardian</label>
                                        <input 
                                            type="text"
                                            value={selectedRegistration.parent_name}
                                            onChange={(e) => setSelectedRegistration({...selectedRegistration, parent_name: e.target.value})}
                                            className="w-full bg-supabase-panel border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Contact Number</label>
                                        <input 
                                            type="number"
                                            value={selectedRegistration.phone}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val.length <= 10) {
                                                    setSelectedRegistration({...selectedRegistration, phone: val});
                                                }
                                            }}
                                            className="w-full bg-supabase-panel border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Email Address</label>
                                        <input 
                                            type="email"
                                            value={selectedRegistration.email || ''}
                                            onChange={(e) => setSelectedRegistration({...selectedRegistration, email: e.target.value})}
                                            className="w-full bg-supabase-panel border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        />
                                    </div>
                                    {selectedRegistration.counselling_data && (
                                        <>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Gender</p>
                                                <p className="text-sm text-supabase-text font-medium capitalize">{selectedRegistration.counselling_data.gender || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Date of Birth</p>
                                                <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.date_of_birth ? new Date(selectedRegistration.counselling_data.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Address</p>
                                                <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.address || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Parent's Occupation</p>
                                                <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.occupation || 'N/A'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedRegistration.counselling_data && (
                                <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-4">
                                    <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Academic & Course Interest</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Current Education Level</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.current_education_level || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">School/College Name</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.school_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Percentage / CGPA</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.percentage_or_cgpa || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Preferred Course</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.preferred_course || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">How Did You Find Us?</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.how_did_you_find_us || 'N/A'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Counsellor Remarks</p>
                                            <p className="text-sm text-supabase-text font-medium mt-1 p-3 bg-supabase-panel rounded-lg border border-supabase-border">{selectedRegistration.counselling_data.counsellor_remarks || 'No remarks provided.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Admission Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Class Assigning</label>
                                        <select 
                                            value={selectedRegistration.class_id}
                                            onChange={(e) => setSelectedRegistration({...selectedRegistration, class_id: e.target.value})}
                                            className="w-full bg-supabase-panel border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                        >
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedRegistration.registration_fee_required !== false && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Fee Status</label>
                                            <select 
                                                value={selectedRegistration.registration_fee_status}
                                                onChange={(e) => setSelectedRegistration({...selectedRegistration, registration_fee_status: e.target.value as 'paid' | 'unpaid'})}
                                                className="w-full bg-supabase-panel border border-supabase-border rounded-lg px-4 py-2 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all"
                                            >
                                                <option value="unpaid">Unpaid</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsProcessModalOpen(false);
                                        setSelectedRegistration(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-supabase-border rounded-lg text-sm font-bold text-supabase-muted hover:text-supabase-text hover:bg-supabase-hover transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                            const updatedAdditionalInfo = {
                                                ...(selectedRegistration.counselling_data?.additional_information || {}),
                                                class_id: selectedRegistration.class_id,
                                                registration_fee_status: selectedRegistration.registration_fee_status
                                            };
                                            await counsellingService.updateRecord(selectedRegistration.id, { 
                                                student_name: selectedRegistration.student_name,
                                                parent_data: {
                                                    ...selectedRegistration.counselling_data?.parent_data,
                                                    parents_name: selectedRegistration.parent_name,
                                                    parent_contact_no: selectedRegistration.counselling_data?.parent_data?.parent_contact_no || '',
                                                    occupation: selectedRegistration.counselling_data?.parent_data?.occupation || ''
                                                },
                                                contact_no: selectedRegistration.phone,
                                                email: selectedRegistration.email,
                                                current_class: classes.find(c => c.id === selectedRegistration.class_id)?.name || '',
                                                additional_information: updatedAdditionalInfo
                                            });
                                            showToast("Registration details saved successfully", "success");
                                            setIsProcessModalOpen(false);
                                            setSelectedRegistration(null);
                                            fetchRegistrations();
                                        } catch (error: any) {
                                            showToast("Failed to save registration: " + error.message, "error");
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-supabase-panel border border-supabase-border text-supabase-text px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-supabase-hover transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Changes
                                </button>
                                <button 
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                            const updatedAdditionalInfo = {
                                                ...(selectedRegistration.counselling_data?.additional_information || {}),
                                                class_id: selectedRegistration.class_id,
                                                registration_fee_status: selectedRegistration.registration_fee_status
                                            };
                                            await counsellingService.updateRecord(selectedRegistration.id, { 
                                                status: '5',
                                                student_name: selectedRegistration.student_name,
                                                parent_data: {
                                                    ...selectedRegistration.counselling_data?.parent_data,
                                                    parents_name: selectedRegistration.parent_name,
                                                    parent_contact_no: selectedRegistration.counselling_data?.parent_data?.parent_contact_no || '',
                                                    occupation: selectedRegistration.counselling_data?.parent_data?.occupation || ''
                                                },
                                                contact_no: selectedRegistration.phone,
                                                email: selectedRegistration.email,
                                                current_class: classes.find(c => c.id === selectedRegistration.class_id)?.name || '',
                                                additional_information: updatedAdditionalInfo
                                            });
                                            showToast("Registration processed and admitted successfully", "success");
                                            setIsProcessModalOpen(false);
                                            setSelectedRegistration(null);
                                            fetchRegistrations();
                                        } catch (error: any) {
                                            showToast("Failed to process registration: " + error.message, "error");
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-supabase-green text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/10 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    Complete Admission
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Registration Modal */}
            {isViewModalOpen && selectedRegistration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-supabase-panel border border-supabase-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-supabase-border flex items-center justify-between bg-supabase-sidebar/50">
                            <h2 className="text-lg font-black text-supabase-text uppercase tracking-widest flex items-center gap-2">
                                <Eye className="text-supabase-green" size={20} />
                                Registration Details
                            </h2>
                            <button onClick={() => {
                                setIsViewModalOpen(false);
                                setSelectedRegistration(null);
                            }} className="text-supabase-muted hover:text-supabase-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Student Information</h3>
                                {selectedRegistration.sid && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">SID:</span>
                                        <span className="font-mono text-sm text-supabase-green font-bold">{selectedRegistration.sid}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Student Name</p>
                                        <p className="text-sm text-supabase-text font-medium">{selectedRegistration.student_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Parent/Guardian</p>
                                        <p className="text-sm text-supabase-text font-medium">{selectedRegistration.parent_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Contact Number</p>
                                        <p className="text-sm text-supabase-text font-medium">{selectedRegistration.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Email Address</p>
                                        <p className="text-sm text-supabase-text font-medium">{selectedRegistration.email || 'N/A'}</p>
                                    </div>
                                    {selectedRegistration.counselling_data && (
                                        <>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Gender</p>
                                                <p className="text-sm text-supabase-text font-medium capitalize">{selectedRegistration.counselling_data.gender || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Date of Birth</p>
                                                <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.date_of_birth ? new Date(selectedRegistration.counselling_data.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Address</p>
                                                <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.address || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Parent's Occupation</p>
                                                <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.occupation || 'N/A'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedRegistration.counselling_data && (
                                <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-4">
                                    <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Academic & Course Interest</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Current Education Level</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.current_education_level || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">School/College Name</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.school_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Percentage / CGPA</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.percentage_or_cgpa || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Preferred Course</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.course_interest?.preferred_course || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">How Did You Find Us?</p>
                                            <p className="text-sm text-supabase-text font-medium">{selectedRegistration.counselling_data.how_did_you_find_us || 'N/A'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Counsellor Remarks</p>
                                            <p className="text-sm text-supabase-text font-medium mt-1 p-3 bg-supabase-panel rounded-lg border border-supabase-border">{selectedRegistration.counselling_data.counsellor_remarks || 'No remarks provided.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-supabase-sidebar border border-supabase-border rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-black text-supabase-muted uppercase tracking-widest border-b border-supabase-border pb-2">Admission Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Class Assigning</p>
                                        <p className="text-sm text-supabase-text font-medium">
                                            {classes.find(c => c.id === selectedRegistration.class_id)?.name || 'N/A'} - {classes.find(c => c.id === selectedRegistration.class_id)?.section || ''}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Fee Status</p>
                                        <p className="text-sm text-supabase-text font-medium capitalize">{selectedRegistration.registration_fee_status}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Current Status</p>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 mt-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(selectedRegistration.status)}`}>
                                            {getStatusLabel(selectedRegistration.status)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-supabase-muted uppercase tracking-widest">Registration Date</p>
                                        <p className="text-sm text-supabase-text font-medium">{new Date(selectedRegistration.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsViewModalOpen(false);
                                        setSelectedRegistration(null);
                                    }}
                                    className="px-6 py-2 bg-supabase-sidebar border border-supabase-border rounded-lg text-sm font-bold text-supabase-text hover:bg-supabase-hover transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationView;
