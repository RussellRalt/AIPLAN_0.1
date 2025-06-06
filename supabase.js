// Las credenciales de Supabase
const supabaseUrl = 'https://lxhfwnmhuhdhiosvdflw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aGZ3bm1odWhkaGlvc3ZkZmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTIwMzYsImV4cCI6MjA2NDYyODAzNn0.J1Lw2OfNpdCQsvmvD40hcnlHmUVBxQCob0J6AsgU6ow';

// Crear el cliente de Supabase
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
