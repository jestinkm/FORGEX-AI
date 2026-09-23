import { createClient } from '@supabase/supabase-js';

// Environment variables or default demo keys for Supabase
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean((import.meta as any).env?.VITE_SUPABASE_URL) &&
    Boolean((import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
  );
};

export const checkSupabaseHealth = async (): Promise<'connected' | 'offline'> => {
  if (!isSupabaseConfigured()) return 'connected'; // Local DB fallback connected
  try {
    const { error } = await supabase.from('events').select('id').limit(1);
    return error ? 'offline' : 'connected';
  } catch {
    return 'offline';
  }
};
