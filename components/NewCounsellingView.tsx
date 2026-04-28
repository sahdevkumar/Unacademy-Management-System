
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Phone, Mail, MapPin, BookOpen, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { counsellingService } from '../services/counsellingService';
import { academicService, PreferredCourse } from '../services/academicService';
import { systemConfigService } from '../services/systemConfigService';
import { LeadSource, Counsellor, MapLeader, RowStudent } from '../types';

const NewCounsellingView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState<PreferredCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [loadingLeadSources, setLoadingLeadSources] = useState(true);
  const [leadBy, setLeadBy] = useState<string[]>([]);
  const [loadingLeadBy, setLoadingLeadBy] = useState(true);
  const [mapLeaders, setMapLeaders] = useState<MapLeader[]>([]);
  const [loadingMapLeaders, setLoadingMapLeaders] = useState(true);
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [loadingCounsellors, setLoadingCounsellors] = useState(true);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    student_name: '',
    contact_no: '',
    gender: '',
    date_of_birth: '',
    current_class: '',
    email: '',
    address: '',
    parent_data: {
      parents_name: '',
      parent_contact_no: '',
      occupation: ''
    },
    counsellor: '',
    course_interest: {
      current_education_level: '',
      school_name: '',
      preferred_course: '',
      percentage_or_cgpa: '',
      previous_coaching: ''
    },
    additional_information: {
      heard_about: '',
      lead_by: '',
      map_leader: '',
      concerns_or_queries: ''
    }
  });

  useEffect(() => {
    if (user?.name && !formData.counsellor && !loadingCounsellors) {
      // Check if user.name exists in counsellors list (case-insensitive)
      const matchingCounsellor = counsellors.find(c => 
        c.name.toLowerCase() === user.name.toLowerCase()
      );
      
      if (matchingCounsellor) {
        setFormData(prev => ({ ...prev, counsellor: matchingCounsellor.name }));
      } else if (user.role === 'superadmin' || user.role === 'admin') {
        // For admins, we might allow them to be the counsellor even if not in the list
        // or just set it anyway and let the select handle it
        setFormData(prev => ({ ...prev, counsellor: user.name }));
      }
    }
  }, [user, counsellors, loadingCounsellors]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const [courseData, leadSourceData, leadByData, counsellorData, mapLeaderData] = await Promise.all([
          academicService.getCourses(),
          systemConfigService.getLeadSources(),
          systemConfigService.getLeadBy(),
          systemConfigService.getCounsellors(),
          systemConfigService.getMapLeaders()
        ]);
        
        console.log('Fetched courses:', courseData);
        console.log('Fetched lead sources:', leadSourceData);
        console.log('Fetched lead by:', leadByData);
        console.log('Fetched counsellors:', counsellorData);
        console.log('Fetched map leaders:', mapLeaderData);

        if (Array.isArray(courseData)) {
          setCourses(courseData.filter(c => c && c.status === 'active'));
        } else {
          console.warn('courseData is not an array:', courseData);
          setCourses([]);
        }

        if (Array.isArray(leadSourceData)) {
          setLeadSources(leadSourceData as LeadSource[]);
        } else {
          console.warn('leadSourceData is not an array:', leadSourceData);
          setLeadSources([]);
        }

        if (Array.isArray(leadByData)) {
          setLeadBy(leadByData);
        } else {
          console.warn('leadByData is not an array:', leadByData);
          setLeadBy([]);
        }

        if (Array.isArray(counsellorData)) {
          setCounsellors(counsellorData);
        } else {
          console.warn('counsellorData is not an array:', counsellorData);
          setCounsellors([]);
        }

        if (Array.isArray(mapLeaderData)) {
          setMapLeaders(mapLeaderData);
        } else {
          console.warn('mapLeaderData is not an array:', mapLeaderData);
          setMapLeaders([]);
        }
      } catch (error: any) {
        console.error('Initialization error:', error);
        showToast('Failed to load initial data', 'error');
      } finally {
        setLoadingCourses(false);
        setLoadingLeadSources(false);
        setLoadingLeadBy(false);
        setLoadingCounsellors(false);
        setLoadingMapLeaders(false);
      }
    };
    initialize();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => {
        const updatedSection = {
          ...(prev[section as keyof typeof prev] as any),
          [field]: value
        };

        // If heard_about changes and is no longer the first one, clear lead_by
        if (name === 'additional_information.heard_about') {
          const selectedSource = leadSources.find(ls => ls.name === value);
          const isLeadByTriggered = selectedSource?.id === '1';
          const isMapLeaderTriggered = selectedSource?.code === 'I1';
          
          if (!isLeadByTriggered) {
            updatedSection.lead_by = '';
          }
          if (!isMapLeaderTriggered) {
            updatedSection.map_leader = '';
          }
        }

        return {
          ...prev,
          [section]: updatedSection
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting counselling form...', formData);
    setIsSubmitting(true);
    try {
      const creator = user?.name || 'Unknown';
      
      // Generate Token
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `UT${year}${month}`;
      
      console.log('Generating token with prefix:', prefix);
      const latestToken = await counsellingService.getLatestToken(prefix);
      console.log('Latest token found:', latestToken);
      
      let nextNumber = 1;
      if (latestToken) {
        const lastFour = latestToken.slice(-4);
        const parsed = parseInt(lastFour, 10);
        if (!isNaN(parsed)) {
          nextNumber = parsed + 1;
        }
      }
      
      const token_no = `${prefix}${String(nextNumber).padStart(4, '0')}`;
      console.log('Generated new token:', token_no);

      const selectedCounsellor = counsellors.find(c => c.name === formData.counsellor);
      const selectedMapLeader = mapLeaders.find(ml => ml.name === formData.additional_information.map_leader);

      const recordToSave: Omit<RowStudent, 'id' | 'created_at'> = {
        ...formData,
        status: '0',
        token_no,
        created_by: creator,
        counsellor_eid: selectedCounsellor?.employee_id || (formData.counsellor === user?.name ? user?.employee_id : undefined),
        map_leader_eid: selectedMapLeader?.employee_id || (formData.additional_information.map_leader === user?.name ? user?.employee_id : undefined),
        activity_log: [
          {
            action: 'created' as const,
            user: creator,
            timestamp: new Date().toISOString()
          }
        ]
      };

      console.log('Saving record to database...', recordToSave);
      await counsellingService.addRecord(recordToSave);
      console.log('Record saved successfully');
      
      showToast(`Counselling record saved successfully. Token: ${token_no}`, 'success');
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        student_name: '',
        contact_no: '',
        gender: '',
        date_of_birth: '',
        current_class: '',
        email: '',
        address: '',
        parent_data: {
          parents_name: '',
          parent_contact_no: '',
          occupation: ''
        },
        counsellor: user?.name || '',
        course_interest: {
          current_education_level: '',
          school_name: '',
          preferred_course: '',
          percentage_or_cgpa: '',
          previous_coaching: ''
        },
        additional_information: {
          heard_about: '',
          lead_by: '',
          map_leader: '',
          concerns_or_queries: ''
        }
      });
    } catch (error: any) {
      console.error('Error saving counselling record:', error);
      const errorMessage = error.message || error.details || (typeof error === 'string' ? error : 'An unknown error occurred while saving.');
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-supabase-sidebar border border-supabase-border rounded-lg px-4 py-2.5 text-sm text-supabase-text focus:outline-none focus:border-supabase-green transition-all placeholder:text-supabase-muted/50";
  const labelClasses = "text-[10px] font-black text-supabase-muted uppercase tracking-widest mb-1.5 flex items-center gap-2";
  const sectionClasses = "bg-supabase-panel border border-supabase-border rounded-xl p-6 space-y-6 shadow-sm relative overflow-hidden";

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-supabase-text uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-supabase-green/10 rounded-xl flex items-center justify-center text-supabase-green">
              <BookOpen size={24} />
            </div>
            New Counselling
          </h1>
          <p className="text-supabase-muted text-sm mt-1">Capture detailed student enquiry and counselling information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <section className={sectionClasses}>
          <div className="absolute top-0 left-0 w-1 h-full bg-supabase-green" />
          <h2 className="text-sm font-black text-supabase-text uppercase tracking-widest flex items-center gap-2 mb-6">
            <User size={16} className="text-supabase-green" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className={labelClasses}>Student Name</label>
              <input 
                type="text" 
                name="student_name"
                required
                placeholder="Full name of the student"
                value={formData.student_name}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Contact Number</label>
              <input 
                type="tel" 
                name="contact_no"
                required
                placeholder="Student's mobile"
                value={formData.contact_no}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Gender</label>
              <select 
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Date of Birth</label>
              <input 
                type="date" 
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Current Class/Grade</label>
              <input 
                type="text" 
                name="current_class"
                placeholder="e.g. 10th Standard"
                value={formData.current_class}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-supabase-border/50">
            <div className="md:col-span-2">
              <label className={labelClasses}>Parent/Guardian Name</label>
              <input 
                type="text" 
                name="parent_data.parents_name"
                placeholder="Full name of parent"
                value={formData.parent_data.parents_name}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Parent Contact No</label>
              <input 
                type="tel" 
                name="parent_data.parent_contact_no"
                placeholder="Parent's mobile"
                value={formData.parent_data.parent_contact_no}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Parent Occupation</label>
              <input 
                type="text" 
                name="parent_data.occupation"
                placeholder="e.g. Business, Service"
                value={formData.parent_data.occupation}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClasses}><Mail size={12} /> Email Address</label>
              <input 
                type="email" 
                name="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div className="md:col-span-3">
              <label className={labelClasses}><MapPin size={12} /> Residential Address</label>
              <textarea 
                name="address"
                rows={2}
                placeholder="Full address..."
                value={formData.address}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </div>
        </section>

        {/* Course Interest */}
        <section className={sectionClasses}>
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <h2 className="text-sm font-black text-supabase-text uppercase tracking-widest flex items-center gap-2 mb-6">
            <CheckCircle2 size={16} className="text-blue-500" />
            Course Interest & Academic Background
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Current Education Level</label>
              <input 
                type="text" 
                name="course_interest.current_education_level"
                placeholder="e.g. High School"
                value={formData.course_interest.current_education_level}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>School/College Name</label>
              <input 
                type="text" 
                name="course_interest.school_name"
                placeholder="Name of current institution"
                value={formData.course_interest.school_name}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>Percentage/CGPA</label>
                <input 
                  type="text" 
                  name="course_interest.percentage_or_cgpa"
                  placeholder="Last exam score"
                  value={formData.course_interest.percentage_or_cgpa}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Previous Coaching (if any)</label>
                <input 
                  type="text" 
                  name="course_interest.previous_coaching"
                  placeholder="Name of previous institute"
                  value={formData.course_interest.previous_coaching}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>Preferred Course</label>
                <select 
                  name="course_interest.preferred_course"
                  required
                  value={formData.course_interest.preferred_course}
                  onChange={handleChange}
                  className={inputClasses}
                  disabled={loadingCourses}
                >
                  <option value="">{loadingCourses ? 'Loading courses...' : 'Select Preferred Course'}</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>{course.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className={sectionClasses}>
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <h2 className="text-sm font-black text-supabase-text uppercase tracking-widest flex items-center gap-2 mb-6">
            <Info size={16} className="text-purple-500" />
            Additional Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className={labelClasses}>How did you hear about us?</label>
              <select 
                name="additional_information.heard_about"
                value={formData.additional_information.heard_about}
                onChange={handleChange}
                className={inputClasses}
                disabled={loadingLeadSources}
              >
                <option value="">{loadingLeadSources ? 'Loading sources...' : 'Select Source'}</option>
                {leadSources.map((source) => (
                  <option key={source.id} value={source.name} data-id={source.id}>{source.name}</option>
                ))}
              </select>
            </div>
            {/* Conditional Lead Access Dropdown - Triggered if id=1 */}
            {leadSources.find(ls => ls.name === formData.additional_information.heard_about)?.id === '1' && (
              <div>
                <label className={labelClasses}>Lead Access</label>
                <select 
                  name="additional_information.lead_by"
                  value={formData.additional_information.lead_by}
                  onChange={handleChange}
                  className={inputClasses}
                  disabled={loadingLeadBy}
                >
                  <option value="">{loadingLeadBy ? 'Loading...' : 'Select Lead Access'}</option>
                  {leadBy.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Conditional Map Leader Dropdown - Triggered if code=I1 */}
            {leadSources.find(ls => ls.name === formData.additional_information.heard_about)?.code === 'I1' && (
              <div>
                <label className={labelClasses}>Map Leader</label>
                <select 
                  name="additional_information.map_leader"
                  value={formData.additional_information.map_leader}
                  onChange={handleChange}
                  className={inputClasses}
                  disabled={loadingMapLeaders}
                >
                  <option value="">{loadingMapLeaders ? 'Loading leaders...' : 'Select Map Leader'}</option>
                  {mapLeaders.map(leader => (
                    <option key={leader.id} value={leader.name}>{leader.name} ({leader.id})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClasses}>Select Counsellor</label>
              <select 
                name="counsellor"
                value={formData.counsellor}
                onChange={handleChange}
                className={inputClasses}
                disabled={loadingCounsellors}
              >
                <option value="">{loadingCounsellors ? 'Loading counsellors...' : 'Select Counsellor'}</option>
                {/* Ensure current user is an option if they are an admin/superadmin */}
                {user?.name && !counsellors.some(c => c.name.toLowerCase() === user.name.toLowerCase()) && (
                  <option value={user.name}>{user.name} (Current User)</option>
                )}
                {counsellors.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className={labelClasses}>Concerns or Queries</label>
              <textarea 
                name="additional_information.concerns_or_queries"
                rows={3}
                placeholder="Any specific questions or requirements..."
                value={formData.additional_information.concerns_or_queries}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-supabase-green text-black px-10 py-3 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:bg-supabase-greenHover transition-all shadow-lg shadow-supabase-green/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCounsellingView;
