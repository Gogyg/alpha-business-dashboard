import { createClient } from '@supabase/supabase-js';
import { publicAnonKey, supabasePublicUrl } from '/utils/supabase/info';

const supabaseUrl = supabasePublicUrl;

if (!publicAnonKey || publicAnonKey === 'your-anon-key-here') {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY. Please configure environment variables.');
}

const anonKey = publicAnonKey;

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

// Dashboard API (Red Cap)
export const dashboardAPI = {
  get: (quarter: string) => dbGet('voc_metrics', quarter), // Reusing voc_metrics or we can rename it
  save: (quarter: string, data: any) => dbSave('voc_metrics', quarter, data),
};

// VOC API (If separate is needed, but we can bundle it)
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

// Events API
export const eventsAPI = {
  get: () => dbGet('events'),
  save: (data: any) => dbSave('events', null, data),
};

// Menu config API
export const menuAPI = {
  get: () => dbGet('menu_config'),
  save: (data: any) => dbSave('menu_config', null, data),
};

// KSH CDPO API
export const kshCdpoAPI = {
  getDashboards: async () => {
    const { data, error } = await supabase.from('ksh_cdpo_dashboards').select('*').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  },
  getWidgets: async (dashboardId: string) => {
    const { data, error } = await supabase
      .from('ksh_cdpo_widgets')
      .select('widgets')
      .eq('dashboard_id', dashboardId)
      .limit(1);
    if (error) throw new Error(error.message);
    return data?.[0]?.widgets || null;
  },
  createDashboard: async (title: string, description: string) => {
    const { error } = await supabase
      .from('ksh_cdpo_dashboards')
      .insert({
        id: crypto.randomUUID(),
        title,
        description,
      });
    if (error) throw new Error(error.message);
    return { success: true };
  },
  deleteDashboard: async (id: string) => {
    // Delete associated widgets first
    await supabase.from('ksh_cdpo_widgets').delete().eq('dashboard_id', id);
    // Delete the dashboard itself
    const { error } = await supabase
      .from('ksh_cdpo_dashboards')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  updateDashboard: async (id: string, title: string, description: string) => {
    const { error } = await supabase
      .from('ksh_cdpo_dashboards')
      .update({ title, description })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  saveWidgets: async (dashboardId: string, widgets: any) => {
    const { data: existing } = await supabase
      .from('ksh_cdpo_widgets')
      .select('id')
      .eq('dashboard_id', dashboardId)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('ksh_cdpo_widgets')
        .update({ widgets, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('ksh_cdpo_widgets')
        .insert({ dashboard_id: dashboardId, widgets });
      if (error) throw new Error(error.message);
    }
    return { success: true };
  }
};
