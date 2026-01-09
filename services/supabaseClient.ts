import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables across Vite, Next.js, and standard process.env
const getEnv = (key: string, viteKey?: string) => {
  // Check Vite (import.meta.env)
  // Cast import.meta to any to resolve TypeScript error about 'env' property
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
    if (viteKey && meta.env[viteKey]) return meta.env[viteKey];
    if (meta.env[key]) return meta.env[key];
  }

  // Check Process (Node/CRA/Next)
  // We use a safe check because 'process' might be polyfilled by index.html as an empty object
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key];
  }

  return undefined;
};

// Access environment variables with fallbacks
// 1. Try VITE_ prefixed keys (Standard for Vite/Vercel)
// 2. Try REACT_APP_ or NEXT_PUBLIC_ prefixed keys
// 3. Fallback to the hardcoded demo key for instant deployment
const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL') || 'https://kvmzcuzohdzzjbkfyrav.supabase.co';
const supabaseKey = getEnv('SUPABASE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bXpjdXpvaGR6empia2Z5cmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODM5OTAsImV4cCI6MjA4MTI1OTk5MH0.g2gAFUSFCjhsO7sgbeE56lXk9sIPZmiEnj7VnxREEPA';

// Only create the client if keys are present
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn("Supabase credentials not found. Falling back to local storage.");
}