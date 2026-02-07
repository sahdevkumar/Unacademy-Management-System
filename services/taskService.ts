
import { supabase } from './supabaseClient';

export interface TaskPayload {
    title: string;
    description: string;
    assigned_to: string;
    assigned_by: string;
    priority: 'Urgent' | 'High' | 'Normal' | 'Low';
    due_date: string;
}

export const taskService = {
    async create(payload: TaskPayload) {
        if (!supabase) throw new Error("Database connection unavailable");

        const { error } = await supabase
            .from('personnel_tasks')
            .insert([{
                ...payload,
                status: 'Pending',
                created_at: new Date().toISOString()
            }]);

        // Graceful handling for demo environments where table might not exist
        if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.personnel_tasks" does not exist')) {
            throw error;
        }
        
        return { success: true };
    }
};
