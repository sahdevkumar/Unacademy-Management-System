
import { supabase } from './supabaseClient';
import { CounsellingRecord } from '../types';

export const counsellingService = {
  async addRecord(record: Omit<CounsellingRecord, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('counselling_records')
      .insert([record])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getRecords() {
    const { data, error } = await supabase
      .from('counselling_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data as CounsellingRecord[];
  },

  async deleteRecord(id: string) {
    const { error } = await supabase
      .from('counselling_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateRecord(id: string, updates: Partial<CounsellingRecord>) {
    const { data, error } = await supabase
      .from('counselling_records')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as CounsellingRecord;
  }
};
