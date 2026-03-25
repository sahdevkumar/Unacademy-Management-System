import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables across Vite, Next.js, and standard process.env
const getEnv = (key: string, viteKey?: string) => {
  const meta = import.meta as any;
  
  if (typeof meta !== 'undefined' && meta.env) {
    if (viteKey && meta.env[viteKey]) return meta.env[viteKey];
    if (meta.env[key]) return meta.env[key];
  }

  if (typeof process !== 'undefined' && process.env) {
    if (viteKey && process.env[viteKey]) return process.env[viteKey];
    if (process.env[key]) return process.env[key];
  }

  return undefined;
};

// Access environment variables with fallbacks
const supabaseUrl = 
  getEnv('SUPABASE_URL') || 
  getEnv('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL') || 
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
  (import.meta as any).env?.VITE_SUPABASE_URL;

const supabaseKey = 
  getEnv('SUPABASE_KEY') || 
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') || 
  getEnv('VITE_SUPABASE_KEY') ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  console.log("Supabase URL detected:", supabaseUrl ? "Present" : "Missing");
  console.log("Supabase Key detected:", supabaseKey ? "Present" : "Missing");
}

// Only create the client if keys are present
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn("Supabase credentials not found. Falling back to local storage.");
}