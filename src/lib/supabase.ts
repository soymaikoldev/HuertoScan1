import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://himoehlftyoihvwqecou.supabase.co';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/['"]+/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Wy9UDQ6DCM5iiTs_-fLm0g_qQ38bYis').replace(/['"]+/g, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
