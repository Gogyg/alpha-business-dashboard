import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Use the publishable key provided by the user if the environment variable is not set correctly
const anonKey = publicAnonKey && publicAnonKey !== 'your-anon-key-here' 
  ? publicAnonKey 
  : 'sb_publishable_bIcF4s7vI-47M0foSVBnqQ_HTGOeCFe';

export const supabase = createClient(supabaseUrl, anonKey);

// Auth helper
export const getAuthToken = () => localStorage.getItem('auth_token');
export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('auth_token');

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('current_user');
  return userStr ? JSON.parse(userStr) : null;
};
export const setCurrentUser = (user: any) => localStorage.setItem('current_user', JSON.stringify(user));
export const removeCurrentUser = () => localStorage.removeItem('current_user');

// Auth API
export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    
    if (data.session) {
      setAuthToken(data.session.access_token);
      setCurrentUser(data.user);
    }
    
    return data;
  },

  logout: async () => {
    await supabase.auth.signOut();
    removeAuthToken();
    removeCurrentUser();
  },
  
  sendPasswordResetEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

// Generic DB helper
const dbGet = async (table: string, quarter?: string) => {
  let query = supabase.from(table).select('*');
  if (quarter) {
    query = query.eq('quarter', quarter);
  }
  query = query.order('updated_at', { ascending: false }).limit(1);
  
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  return data?.[0]?.data || null;
};

const dbSave = async (table: string, quarter: string | null, rowData: any) => {
  let query = supabase.from(table).select('id');
  if (quarter) query = query.eq('quarter', quarter);
  
  const { data: existing } = await query.limit(1);
  
  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from(table)
      .update({ data: rowData, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    if (error) throw new Error(error.message);
  } else {
    const insertObj: any = { data: rowData };
    if (quarter) insertObj.quarter = quarter;
    const { error } = await supabase.from(table).insert(insertObj);
    if (error) throw new Error(error.message);
  }
  return { success: true };
};

// VOC API
export const vocAPI = {
  get: (quarter: string) => dbGet('voc_metrics', quarter),
  save: (quarter: string, data: any) => dbSave('voc_metrics', quarter, data),
};

// Metrics API
export const metricsAPI = {
  get: (quarter: string) => dbGet('important_metrics', quarter),
  save: (quarter: string, data: any) => dbSave('important_metrics', quarter, data),
};

// Goals API
export const goalsAPI = {
  get: (quarter: string) => dbGet('goals', quarter),
  save: (quarter: string, data: any) => dbSave('goals', quarter, data),
};

// Team API
export const teamAPI = {
  get: () => dbGet('team_data'),
  save: (data: any) => dbSave('team_data', null, data),
};
