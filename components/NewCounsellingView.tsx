
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Phone, Mail, MapPin, BookOpen, Clock, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { counsellingService } from '../services/counsellingService';
import { academicService, PreferredCourse } from '../services/academicService';

const NewCounsellingView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState<PreferredCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    student_name: '',
    contact_no: '',
    gender: '',
    date_of_birth: '',
    current_class: '',
    parents_name: '',
    email: '',
    address: '',
    parent_contact_no: '',
    occupation: '',
    course_interest: {
      current_education_level: '',
      school_name: '',
      preferred_course: '',
      percentage_or_cgpa: '',
      preferred_batch_timing: ''
    },
    additional_information: {
      previous_coaching: '',
      heard_about: '',
      concerns_or_queries: ''
    }
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await academicService.getCourses();
        setCourses(data.filter(c => c.status === 'active'));
      } catch (error: any) {
        showToast('Failed to load courses', 'error');
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as any),
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const creator = user?.name || 'Unknown';
      await counsellingService.addRecord({
        ...formData,
        created_by: creator,
        activity_log: [
          {
            action: 'created',
            user: creator,
            timestamp: new Date().toISOString()
          }
        ]
      });
      showToast('Counselling record saved successfully', 'success');
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        student_name: '',
        contact_no: '',
        gender: '',
        date_of_birth: '',
        current_class: '',
        parents_name: '',
        email: '',
        address: '',
        parent_contact_no: '',
        occupation: '',
        course_interest: {
          current_education_level: '',
          school_name: '',
          preferred_course: '',
          percentage_or_cgpa: '',
          preferred_batch_timing: ''
        },
        additional_information: {
          previous_coaching: '',
          heard_about: '',
          concerns_or_queries: ''
        }
      });
    } catch (error: any) {
      showToast(error.message || 'Failed to save record', 'error');
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
                name="parents_name"
                placeholder="Full name of parent"
                value={formData.parents_name}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Parent Contact No</label>
              <input 
                type="tel" 
                name="parent_contact_no"
                placeholder="Parent's mobile"
                value={formData.parent_contact_no}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Parent Occupation</label>
              <input 
                type="text" 
                name="occupation"
                placeholder="e.g. Business, Service"
                value={formData.occupation}
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
            <div className="grid grid-cols-2 gap-4">
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
                <label className={labelClasses}><Clock size={12} /> Batch Timing</label>
                <input 
                  type="text" 
                  name="course_interest.preferred_batch_timing"
                  placeholder="e.g. Evening"
                  value={formData.course_interest.preferred_batch_timing}
                  onChange={handleChange}
                  className={inputClasses}
                />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Previous Coaching (if any)</label>
              <input 
                type="text" 
                name="additional_information.previous_coaching"
                placeholder="Name of previous institute"
                value={formData.additional_information.previous_coaching}
                onChange={handleChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>How did you hear about us?</label>
              <select 
                name="additional_information.heard_about"
                value={formData.additional_information.heard_about}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">Select Source</option>
                <option value="Social Media">Social Media</option>
                <option value="Friends/Family">Friends/Family</option>
                <option value="Newspaper">Newspaper</option>
                <option value="Website">Website</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
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
