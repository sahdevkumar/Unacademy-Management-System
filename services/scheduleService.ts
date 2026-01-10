import { ClassSession, Teacher } from '../types';
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
  return `UCS${d}${m}${y}`;
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
  async getClasses(): Promise<string[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('classes').select('name').order('name', { ascending: true });
        if (error) return [];
        return data ? data.map((row: any) => row.name) : [];
    } catch { return []; }
  },

  async createClass(className: string): Promise<void> {
     if (supabase) {
        try { await supabase.from('classes').insert([{ name: className }]); } catch {}
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
        const { data, error } = await supabase.from('weekly_schedules').select('content').eq('class', className).order('updated_at', { ascending: false }).limit(1).single();
        if (!error && data && data.content) {
            return (Array.isArray(data.content) ? data.content : []) as ClassSession[];
        }
      } catch {}
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
    const scheduleId = generateScheduleId();

    if (supabase) {
      try {
        const teachers = await this.getTeachers();
        
        const enrichedSchedule = schedule.map(session => {
            const t = teachers.find(teach => teach.name === session.instructor);
            const status = t?.status || 'active';
            const currentShowProfiles = (session as any).show_profiles === true;

            return {
                ...session,
                instructorPhotoUrl: t?.profile_photo_url || session.instructorPhotoUrl,
                instructorStatus: status,
                show_profiles: currentShowProfiles
            };
        });

        // Check the status of the most recent record for this class
        const { data: current, error: fetchError } = await supabase
            .from('weekly_schedules')
            .select('id, status')
            .eq('class', className)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const status = current?.status || 'false';

        if (status === 'true') {
            // IF TRUE: ADD NEW ROW
            // To avoid unique constraint conflicts on the 'class' column (if one exists), 
            // we'll update the old one's class name slightly or handle status.
            // But per request: "add new row". 
            // We assume the schema allows multiple rows per class name or we archive the old one.
            
            // ARCHIVE OLD: Set previous 'true' records for this class to 'recent'
            await supabase
                .from('weekly_schedules')
                .update({ status: 'recent' })
                .eq('class', className)
                .eq('status', 'true');

            // INSERT NEW
            const { error: insertError } = await supabase
                .from('weekly_schedules')
                .insert({
                    class: className,
                    schedule_id: scheduleId,
                    content: enrichedSchedule,
                    status: 'false', // Default new row to draft
                    updated_at: new Date().toISOString()
                });
            if (insertError) throw insertError;
        } else {
            // IF FALSE (OR DOESN'T EXIST): UPDATE OLD (UPSERT)
            const { error: upsertError } = await supabase
                .from('weekly_schedules')
                .upsert({
                    class: className,
                    schedule_id: scheduleId,
                    content: enrichedSchedule,
                    status: 'false',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'class' });
            if (upsertError) throw upsertError;
        }

        return;
      } catch (e) { console.warn('Supabase save failed:', e); }
    }
    await delay(400);
    localStorage.setItem(DB_KEY_PREFIX + className.replace(/\s+/g, '-').toLowerCase(), JSON.stringify(schedule));
  }
};