import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://himoehlftyoihvwqecou.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Wy9UDQ6DCM5iiTs_-fLm0g_qQ38bYis';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
