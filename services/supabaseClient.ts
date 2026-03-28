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

// Access environment variables with fallbacks and trim them
const supabaseUrl = (
  getEnv('VITE_SUPABASE_URL') || 
  getEnv('SUPABASE_URL') || 
  getEnv('NEXT_PUBLIC_SUPABASE_URL') || 
  (typeof window !== 'undefined' && (window as any).env?.VITE_SUPABASE_URL)
)?.trim();

const supabaseKey = (
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  getEnv('SUPABASE_KEY') || 
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
  getEnv('VITE_SUPABASE_KEY') ||
  (typeof window !== 'undefined' && (window as any).env?.VITE_SUPABASE_ANON_KEY)
)?.trim();

// Detailed logging for production debugging
if (typeof window !== 'undefined' && (window as any).env) {
  console.log("Runtime window.env detected:", {
    VITE_SUPABASE_URL: (window as any).env.VITE_SUPABASE_URL ? "Present" : "Missing",
    VITE_SUPABASE_ANON_KEY: (window as any).env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing"
  });
}

if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'production' || process.env.DEBUG === 'true')) {
  console.log("Supabase URL detected:", supabaseUrl ? `Present (${supabaseUrl.substring(0, 10)}...)` : "Missing");
  console.log("Supabase Key detected:", supabaseKey ? `Present (${supabaseKey.substring(0, 5)}...)` : "Missing");
}

// Singleton instance to prevent Web Locks API contention
let supabaseInstance: any = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

// Only create the client if keys are present
export let supabase: any = null;

// Function to manually re-initialize the client if needed
export const reinitializeSupabase = (url?: string, key?: string) => {
  const finalUrl = url?.trim() || supabaseUrl;
  const finalKey = key?.trim() || supabaseKey;
  
  if (finalUrl && finalKey) {
    // Return existing instance if URL and Key haven't changed
    if (supabaseInstance && currentUrl === finalUrl && currentKey === finalKey) {
      return supabaseInstance;
    }

    currentUrl = finalUrl;
    currentKey = finalKey;
    supabaseInstance = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public'
      }
    });
    
    supabase = supabaseInstance;
    return supabaseInstance;
  }
  return null;
};

// Initialize immediately if keys are present
if (supabaseUrl && supabaseKey) {
  reinitializeSupabase(supabaseUrl, supabaseKey);
}

if (!supabase) {
  console.warn("Supabase credentials not found. Falling back to local storage.");
}