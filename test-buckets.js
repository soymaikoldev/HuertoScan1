import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://klaompnbmjufvhjkeeno.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYW9tcG5ibWp1ZnZoamtlZW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjY5ODEsImV4cCI6MjA5NzE0Mjk4MX0.udKgeFZLsVzXvSU0oqR0F3_J7EDCA1g7MxF00l8LEEc"
);

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log("Buckets:", data?.map(b => b.name), error);
}
check();
