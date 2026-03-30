import { createClient } from '@supabase/supabase-js';

// Singleton instance
export let supabase: any = null;

// Function to manually re-initialize the client if needed
export const reinitializeSupabase = (url?: string, key?: string) => {
  // Check runtime injected env vars first (for deployed environments)
  const windowEnvUrl = typeof window !== 'undefined' && (window as any).env ? (window as any).env.VITE_SUPABASE_URL : undefined;
  const windowEnvKey = typeof window !== 'undefined' && (window as any).env ? (window as any).env.VITE_SUPABASE_ANON_KEY : undefined;

  // Use Vite's statically replaced process.env (defined in vite.config.ts)
  // or import.meta.env as a fallback
  const buildEnvUrl = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
  const buildEnvKey = process.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const finalUrl = url?.trim() || windowEnvUrl?.trim() || buildEnvUrl?.trim();
  const finalKey = key?.trim() || windowEnvKey?.trim() || buildEnvKey?.trim();
  
  if (finalUrl && finalKey) {
    if (!finalUrl.startsWith('http')) {
      console.warn("Supabase URL must start with http/https. Current URL:", finalUrl);
      return null;
    }
    supabase = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public'
      }
    });
    return supabase;
  }
  
  console.warn("Cannot initialize Supabase: URL or Key is missing.");
  return null;
};

// Initialize immediately
supabase = reinitializeSupabase();