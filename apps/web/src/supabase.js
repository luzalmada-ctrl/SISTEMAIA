import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Revisa apps/web/.env');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
