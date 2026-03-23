import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables across Vite, Next.js, and standard process.env
const getEnv = (key: string, viteKey?: string) => {
  const meta = import.meta as any;
  console.log(`Checking for ${key} / ${viteKey}...`);
  
  if (typeof meta !== 'undefined' && meta.env) {
    console.log("Available in import.meta.env:", Object.keys(meta.env).filter(k => k.startsWith('VITE_')));
    if (viteKey && meta.env[viteKey]) {
      console.log(`Found ${viteKey} in import.meta.env`);
      return meta.env[viteKey];
    }
    if (meta.env[key]) {
      console.log(`Found ${key} in import.meta.env`);
      return meta.env[key];
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    console.log("Available in process.env:", Object.keys(process.env).filter(k => k.startsWith('VITE_')));
    if (viteKey && process.env[viteKey]) {
      console.log(`Found ${viteKey} in process.env`);
      return process.env[viteKey];
    }
    if (process.env[key]) {
      console.log(`Found ${key} in process.env`);
      return process.env[key];
    }
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

console.log("Supabase URL found:", supabaseUrl ? "Yes (starts with " + supabaseUrl.substring(0, 10) + "...)" : "No");
console.log("Supabase Key found:", supabaseKey ? "Yes" : "No");

// Only create the client if keys are present
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn("Supabase credentials not found. Falling back to local storage.");
}