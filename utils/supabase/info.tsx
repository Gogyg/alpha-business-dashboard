// Supabase configuration
// These will be populated by environment variables in production
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'knjzftumsmzqlxmntaxl';
export const supabasePublicUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';
