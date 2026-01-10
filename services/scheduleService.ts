import { ClassSession, Teacher, ClassInfo } from '../types';
import { supabase } from './supabaseClient';

const DB_KEY_PREFIX = 'supabase-class-schedule-';

const DEFAULT_SCHEDULE: ClassSession[] = [
  { id: '1', title: 'Database Systems', instructor: 'Dr. Smith', instructorStatus: 'active', day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'LH-101', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: '2', title: 'Algorithms', instructor: 'Prof. Johnson', instructorStatus: 'active', day: 'Monday', startTime: '11:00', endTime: '12:30', room: 'CS-202', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: '3', title: 'Web Development', instructor: 'Mrs. Davis', instructorStatus: 'active', day: 'Tuesday', startTime: '14:00', endTime: '15:30', room: 'Lab-3', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateScheduleId = (): string => {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `UCS${d}${m}${y}${h}${min}${sec}${ms}`;
};

const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; 
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Canvas context failed")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const attemptCompression = (quality: number) => {
             canvas.toBlob((blob) => {
                if (!blob) { reject(new Error("Compression failed")); return; }
                if (blob.size <= 50 * 1024 || quality <= 0.1) {
                    resolve(blob);
                } else {
                    attemptCompression(Math.max(0.1, quality - 0.1));
                }
             }, 'image/jpeg', quality);
        };
        attemptCompression(0.9);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const scheduleService = {
  async getClasses(): Promise<ClassInfo[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('classes').select('id, name, section, room_no').order('name', { ascending: true });
        if (error) return [];
        return (data || []) as ClassInfo[];
    } catch { return []; }
  },

  async createClass(className: string, section: string = 'A', roomNo: string = '0'): Promise<void> {
     if (supabase) {
        try { await supabase.from('classes').insert([{ name: className, section, room_no: roomNo }]); } catch {}
     }
  },

  async getSubjects(): Promise<{id: string, name: string}[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('subjects').select('id, name').order('name', { ascending: true });
        if (error) return [];
        return data || [];
    } catch { return []; }
  },

  async getTeachers(): Promise<Teacher[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('teachers').select('*').order('name', { ascending: true });
        if (error) throw error;
        return data as Teacher[];
    } catch { return []; }
  },

  async uploadTeacherPhoto(file: File): Promise<{success: boolean, url?: string, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const compressedBlob = await compressImage(file);
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
          const filePath = `${fileName}`;
          const { error: uploadError } = await supabase.storage.from('teacher-avatars').upload(filePath, compressedBlob, { contentType: 'image/jpeg', upsert: true });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('teacher-avatars').getPublicUrl(filePath);
          return { success: true, url: data.publicUrl };
      } catch (e: any) { return { success: false, error: e.message }; }
  },

  async addTeacher(teacher: Omit<Teacher, 'id' | 'created_at'>): Promise<{success: boolean, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const { error } = await supabase.from('teachers').insert([{ ...teacher, status: 'active' }]);
          if (error) throw error;
          return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
  },

  async updateTeacher(teacher: Teacher): Promise<{success: boolean, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const { error } = await supabase.from('teachers').update({
              name: teacher.name,
              email: teacher.email,
              subjects: teacher.subjects,
              phone: teacher.phone,
              profile_photo_url: teacher.profile_photo_url,
              status: teacher.status
          }).eq('id', teacher.id);
          if (error) throw error;
          return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
  },

  async deleteTeacher(id: string): Promise<{success: boolean, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const { error } = await supabase.from('teachers').delete().eq('id', id);
          if (error) throw error;
          return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
  },

  async getAll(className: string): Promise<ClassSession[]> {
    if (!className) return [];
    if (supabase) {
      try {
        const { data, error } = await supabase
            .from('weekly_schedules')
            .select('content')
            .eq('class', className)
            .eq('status', 'false') 
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!error && data && data.content) {
            return (Array.isArray(data.content) ? data.content : []) as ClassSession[];
        }
        return [];
      } catch {
        return [];
      }
    }
    await delay(300);
    const local = localStorage.getItem(DB_KEY_PREFIX + className.replace(/\s+/g, '-').toLowerCase());
    if (!local && className === 'Spring 2024') return DEFAULT_SCHEDULE;
    try {
        const parsed = local ? JSON.parse(local) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  },

  async getPublished(): Promise<{id: string, class: string, content: ClassSession[], updated_at: string}[]> {
     if (supabase) {
         try {
             const { data, error } = await supabase.from('weekly_schedules').select('*').eq('status', 'true').order('updated_at', { ascending: false });
             if (error) throw error;
             return (data || []).map(item => ({
                 ...item,
                 content: Array.isArray(item.content) ? item.content : []
             }));
         } catch { return []; }
     }
     return [];
  },

  async save(className: string, schedule: ClassSession[]): Promise<void> {
    if (!className || !Array.isArray(schedule)) return;
    
    if (supabase) {
      try {
        const teachers = await this.getTeachers();
        
        const { data: classMeta } = await supabase
            .from('classes')
            .select('room_no')
            .eq('name', className)
            .maybeSingle();

        const enrichedSchedule = schedule.map(session => {
            const t = teachers.find(teach => teach.name === session.instructor);
            // Priority: session.room (override) -> classMeta.room_no (default) -> 'N/A'
            const finalRoom = session.room || classMeta?.room_no || 'N/A';
            
            return {
                ...session,
                instructorPhotoUrl: t?.profile_photo_url || session.instructorPhotoUrl,
                instructorStatus: t?.status || 'active',
                room: finalRoom,
                show_profiles: (session as any).show_profiles !== false
            };
        });

        const { data: existingRows } = await supabase
            .from('weekly_schedules')
            .select('id, status')
            .eq('class', className);

        if (existingRows && existingRows.length > 0) {
            const targetId = existingRows.find(r => r.status === 'true')?.id || existingRows[0].id;

            const { error: updateError } = await supabase
                .from('weekly_schedules')
                .update({
                    content: enrichedSchedule,
                    updated_at: new Date().toISOString()
                })
                .eq('id', targetId);
            
            if (updateError) throw updateError;
        } else {
            const newScheduleId = generateScheduleId();
            const { error: insertError } = await supabase
                .from('weekly_schedules')
                .insert({
                    class: className,
                    schedule_id: newScheduleId,
                    content: enrichedSchedule,
                    status: 'false',
                    updated_at: new Date().toISOString()
                });
            
            if (insertError) throw insertError;
        }
      } catch (e) { 
        console.warn('Supabase save failed:', e); 
        throw e;
      }
    }
  }
};