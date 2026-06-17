import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = "https://klaompnbmjufvhjkeeno.supabase.co";
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYW9tcG5ibWp1ZnZoamtlZW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjY5ODEsImV4cCI6MjA5NzE0Mjk4MX0.udKgeFZLsVzXvSU0oqR0F3_J7EDCA1g7MxF00l8LEEc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const bucketsToTest = ['imagenes', 'Imagenes', 'images', 'crops'];
  for (const name of bucketsToTest) {
    const { data, error } = await supabase.storage.getBucket(name);
    console.log(`Bucket ${name}:`, data ? "EXISTS" : error?.message);
  }
}
check();
