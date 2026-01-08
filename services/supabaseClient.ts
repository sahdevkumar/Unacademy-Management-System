import { createClient } from '@supabase/supabase-js';

// Access environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kvmzcuzohdzzjbkfyrav.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bXpjdXpvaGR6empia2Z5cmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODM5OTAsImV4cCI6MjA4MTI1OTk5MH0.g2gAFUSFCjhsO7sgbeE56lXk9sIPZmiEnj7VnxREEPA';

// Only create the client if keys are present
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn("Supabase credentials not found. Falling back to local storage.");
}