
import { supabase } from './supabaseClient';

export interface PreferredCourse {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  valid_until?: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export const academicService = {
  // Preferred Courses (Stored in system_config table as jsonb)
  async getCourses() {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'preferred_courses')
      .maybeSingle();
    
    if (error) throw error;
    return (data?.value as PreferredCourse[]) || [];
  },

  async addCourse(course: Omit<PreferredCourse, 'id' | 'created_at'>) {
    const currentCourses = await this.getCourses();
    const newCourse: PreferredCourse = {
      ...course,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    
    const updatedCourses = [...currentCourses, newCourse];
    
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key: 'preferred_courses', 
        value: updatedCourses,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (error) throw error;
    return newCourse;
  },

  async deleteCourse(id: string) {
    const currentCourses = await this.getCourses();
    const updatedCourses = currentCourses.filter(c => c.id !== id);
    
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key: 'preferred_courses', 
        value: updatedCourses,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (error) throw error;
  },

  // Offers (Stored in system_config table as jsonb)
  async getOffers() {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'academic_offers')
      .maybeSingle();
    
    if (error) throw error;
    return (data?.value as Offer[]) || [];
  },

  async addOffer(offer: Omit<Offer, 'id' | 'created_at'>) {
    const currentOffers = await this.getOffers();
    const newOffer: Offer = {
      ...offer,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    
    const updatedOffers = [...currentOffers, newOffer];
    
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key: 'academic_offers', 
        value: updatedOffers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (error) throw error;
    return newOffer;
  },

  async deleteOffer(id: string) {
    const currentOffers = await this.getOffers();
    const updatedOffers = currentOffers.filter(o => o.id !== id);
    
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key: 'academic_offers', 
        value: updatedOffers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (error) throw error;
  }
};
