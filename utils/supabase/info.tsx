// Supabase configuration (self-hosted)
// These will be populated by environment variables
export const supabasePublicUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

if (!supabasePublicUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Please configure environment variables.');
}
