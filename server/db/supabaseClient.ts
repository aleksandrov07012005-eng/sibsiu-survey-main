import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

let supabase: SupabaseClient | null = null;

if (url && key) {
  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  console.log('Supabase client initialized');
} else {
  console.log('Supabase not configured (SUPABASE_URL or SUPABASE_KEY missing). Falling back to pg.');
}

export { supabase };
