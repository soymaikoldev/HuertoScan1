import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://himoehlftyoihvwqecou.supabase.co';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/['"]+/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbW9laGxmdHlvaWh2d3FlY291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzOTYxOTIsImV4cCI6MjA5Njk3MjE5Mn0.C8cz1sFGEqJWIpbCw2HNobeAHz_l-2xNiEmMJMpAgNA').replace(/['"]+/g, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
