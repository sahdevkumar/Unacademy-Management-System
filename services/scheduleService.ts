import { ClassSession, Teacher } from '../types';
import { supabase } from './supabaseClient';

const DB_KEY_PREFIX = 'supabase-class-schedule-';

// Default data
const DEFAULT_SCHEDULE: ClassSession[] = [
  { id: '1', title: 'Database Systems', instructor: 'Dr. Smith', day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'LH-101', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: '2', title: 'Algorithms', instructor: 'Prof. Johnson', day: 'Monday', startTime: '11:00', endTime: '12:30', room: 'CS-202', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: '3', title: 'Web Development', instructor: 'Mrs. Davis', day: 'Tuesday', startTime: '14:00', endTime: '15:30', room: 'Lab-3', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { id: '4', title: 'Database Systems', instructor: 'Dr. Smith', day: 'Wednesday', startTime: '09:00', endTime: '10:30', room: 'LH-101', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: '5', title: 'System Design', instructor: 'Mr. Wilson', day: 'Tuesday', startTime: '10:00', endTime: '11:30', room: 'CS-204', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: '6', title: 'Algorithms', instructor: 'Prof. Johnson', day: 'Friday', startTime: '11:00', endTime: '12:30', room: 'CS-202', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: '7', title: 'Extra Credit Seminar', instructor: 'Guest Speaker', day: 'Saturday', startTime: '10:00', endTime: '12:00', room: 'Auditorium', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Generate UCS+DDMMYY ID
const generateScheduleId = (): string => {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const y = String(date.getFullYear()).slice(-2);
  return `UCS${d}${m}${y}`;
};

// Helper: Compress Image to under 50KB
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max dimension for avatars (300px is sufficient for UI)
        const MAX_WIDTH = 300; 
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        // Resize logic to maintain aspect ratio
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
        if (!ctx) {
            reject(new Error("Canvas context failed"));
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Recursive compression function to target under 50KB
        const attemptCompression = (quality: number) => {
             canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Compression failed"));
                    return;
                }
                
                // Check if under 50KB (50 * 1024 bytes) or quality is too low (stop at 0.1)
                if (blob.size <= 50 * 1024 || quality <= 0.1) {
                    console.log(`Image compressed. Original: ${(file.size/1024).toFixed(2)}KB, New: ${(blob.size/1024).toFixed(2)}KB, Quality: ${quality.toFixed(1)}`);
                    resolve(blob);
                } else {
                    // Reduce quality by 0.1 and try again
                    attemptCompression(Math.max(0.1, quality - 0.1));
                }
             }, 'image/jpeg', quality);
        };

        // Start with 0.9 quality
        attemptCompression(0.9);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Local Storage Fallbacks
const getLocalData = (classId: string): ClassSession[] => {
  if (!classId) return [];
  try {
    const data = localStorage.getItem(DB_KEY_PREFIX + classId);
    // Return default schedule only for the "Spring 2024" or if it's the very first load
    if (!data && classId === 'Spring 2024') return DEFAULT_SCHEDULE;
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setLocalData = (classId: string, data: ClassSession[]) => {
  if (!classId) return;
  localStorage.setItem(DB_KEY_PREFIX + classId, JSON.stringify(data));
};

export const scheduleService = {
  // --- Class Management ---

  async getClasses(): Promise<string[]> {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('classes')
            .select('name')
            .order('name', { ascending: true });
        
        if (error) {
             console.warn("Error fetching classes from Supabase:", error.message);
             return [];
        }

        if (data && data.length > 0) {
            return data.map((row: any) => row.name);
        }
        return [];
    } catch (e) {
        console.error("Exception fetching classes:", e);
        return [];
    }
  },

  async createClass(className: string): Promise<void> {
     if (supabase) {
        try {
            const { error } = await supabase
                .from('classes')
                .insert([{ name: className }]);
            
            if (error) {
                console.error("Supabase error creating class:", error.message);
            }
        } catch (e) {
            console.warn("Failed to create class in Supabase");
        }
     }
  },

  // --- Subject Management ---
  async getSubjects(): Promise<{id: string, name: string}[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            console.warn("Error fetching subjects from Supabase:", error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error("Exception fetching subjects:", e);
        return [];
    }
  },

  // --- Teacher Management ---
  async getTeachers(): Promise<Teacher[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data as Teacher[];
    } catch (e: any) {
        console.error("Error fetching teachers:", e.message);
        return [];
    }
  },

  async uploadTeacherPhoto(file: File): Promise<{success: boolean, url?: string, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          // 1. Optimize Image
          const compressedBlob = await compressImage(file);

          // 2. Generate path
          // Force .jpg extension because we converted to jpeg
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
          const filePath = `${fileName}`;

          // 3. Upload to Supabase
          const { error: uploadError } = await supabase.storage
              .from('teacher-avatars')
              .upload(filePath, compressedBlob, {
                  contentType: 'image/jpeg',
                  upsert: true
              });

          if (uploadError) throw uploadError;

          // 4. Get Public URL
          const { data } = supabase.storage
              .from('teacher-avatars')
              .getPublicUrl(filePath);

          return { success: true, url: data.publicUrl };
      } catch (e: any) {
          console.error("Error uploading photo:", e.message);
          return { success: false, error: e.message };
      }
  },

  async addTeacher(teacher: Omit<Teacher, 'id' | 'created_at'>): Promise<{success: boolean, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const { error } = await supabase
              .from('teachers')
              .insert([teacher]);
          
          if (error) throw error;
          return { success: true };
      } catch (e: any) {
          console.error("Error adding teacher:", e.message);
          return { success: false, error: e.message };
      }
  },

  async updateTeacher(teacher: Teacher): Promise<{success: boolean, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const { error } = await supabase
              .from('teachers')
              .update({
                  name: teacher.name,
                  email: teacher.email,
                  subjects: teacher.subjects,
                  phone: teacher.phone,
                  profile_photo_url: teacher.profile_photo_url
              })
              .eq('id', teacher.id);

          if (error) throw error;
          return { success: true };
      } catch (e: any) {
           console.error("Error updating teacher:", e.message);
           return { success: false, error: e.message };
      }
  },

  async deleteTeacher(id: string): Promise<{success: boolean, error?: string}> {
      if (!supabase) return { success: false, error: 'No database connection' };
      try {
          const { error } = await supabase
              .from('teachers')
              .delete()
              .eq('id', id);
          
          if (error) throw error;
          return { success: true };
      } catch (e: any) {
           console.error("Error deleting teacher:", e.message);
           return { success: false, error: e.message };
      }
  },

  // --- Schedule Management ---

  // Load schedule based on class name (Drafts / Paused only)
  async getAll(className: string): Promise<ClassSession[]> {
    if (!className) return [];
    
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
            .from('weekly_schedules')
            .select('content')
            .eq('class', className) // Fetch using the 'class' column
            .eq('status', 'false') // Only fetch schedules with status='false' (Draft/Paused)
            .single();
        
        if (!error && data && data.content) {
            return data.content as ClassSession[];
        }

        if (error) {
            // PGRST116: No rows found
            if (error.code === 'PGRST116') {
                if (className === 'Spring 2024') return DEFAULT_SCHEDULE;
                return [];
            }
            if (error.code === '42P01') {
                 console.warn("Table 'weekly_schedules' missing. Falling back to local.");
            } else {
                 console.error("Supabase error fetching schedule:", error.message);
            }
            throw error;
        }
      } catch (e) {
        // Fall through
      }
    }

    // Fallback Logic
    await delay(300);
    return getLocalData(className.replace(/\s+/g, '-').toLowerCase());
  },

  // Get all Published/Active schedules (status='true') for Dashboard
  async getPublished(): Promise<{id: string, class: string, content: ClassSession[], updated_at: string}[]> {
     if (supabase) {
         try {
             const { data, error } = await supabase
                .from('weekly_schedules')
                .select('*')
                .eq('status', 'true')
                .order('updated_at', { ascending: false });
             
             if (error) throw error;
             return data || [];
         } catch (e) {
             console.error("Error fetching published schedules:", e);
             return [];
         }
     }
     return [];
  },

  // Save the schedule using the new schema
  async save(className: string, schedule: ClassSession[]): Promise<void> {
    if (!className) return;

    const scheduleId = generateScheduleId();

    if (supabase) {
      try {
        // Upsert based on the 'class' column. 
        // Fetch current status to preserve it, or default to 'false' if new
        let currentStatus = 'false';
        const { data: current } = await supabase
            .from('weekly_schedules')
            .select('status')
            .eq('class', className)
            .single();
        
        if (current) {
            currentStatus = current.status;
        }

        const { error } = await supabase
            .from('weekly_schedules')
            .upsert({
                class: className,
                schedule_id: scheduleId,
                content: schedule,
                status: currentStatus, // Preserve existing status
                updated_at: new Date().toISOString()
            }, { onConflict: 'class' });

        if (error) {
             if (error.code === '42P01') {
                console.warn("Table 'weekly_schedules' missing. Saving locally.");
             } else {
                console.error('Supabase error saving schedule:', error.message);
             }
             throw error;
        }
        return;
      } catch (e) {
          console.warn('Supabase save failed, falling back to local storage');
      }
    }

    // Fallback
    await delay(400);
    setLocalData(className.replace(/\s+/g, '-').toLowerCase(), schedule);
  }
};