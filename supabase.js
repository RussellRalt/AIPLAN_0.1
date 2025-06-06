const supabaseUrl = process.env.SUPABASE_URL || 'https://lxhfwnmhuhdhiosvdflw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aGZ3bm1odWhkaGlvc3ZkZmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTIwMzYsImV4cCI6MjA2NDYyODAzNn0.J1Lw2OfNpdCQsvmvD40hcnlHmUVBxQCob0J6AsgU6ow';

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
