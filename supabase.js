// Configuración de Supabase para AIPLAN 2025
const supabaseUrl = 'https://tycaexhgfpzqjsojtnqd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Y2FleGhnZnB6cWpzb2p0bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODIxMjAsImV4cCI6MjA3OTk1ODEyMH0.3-pz7I7fRgNRfS2M_Cx-TUQMxplvGlXIY1n-Nmo_LLo';

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
