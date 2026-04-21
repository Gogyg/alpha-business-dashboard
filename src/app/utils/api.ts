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

interface EventsSnapshot {
  rowId: string | null;
  updatedAt: string | null;
  events: any[];
}

const EVENTS_SINGLETON_KEY = 'global';

const getEventsSnapshot = async (): Promise<EventsSnapshot> => {
  const { data, error } = await supabase
    .from('events')
    .select('id, data, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = data || [];
  const row = rows[0];

  const extractRowEvents = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.events)) return payload.events;
    return [];
  };

  const mergedById = new Map<string, any>();
  rows
    .slice()
    .reverse()
    .forEach((candidateRow) => {
      const rowEvents = extractRowEvents(candidateRow?.data);
      rowEvents.forEach((event, index) => {
        const stringId =
          typeof event?.id === 'string' && event.id.trim().length > 0
            ? event.id.trim()
            : null;
        const numberId =
          typeof event?.id === 'number' && Number.isFinite(event.id)
            ? String(event.id)
            : null;

        // Legacy numeric IDs could collide if old parallel inserts created multiple rows.
        // In that case, promote them to row-scoped keys to preserve both events.
        const eventId =
          stringId ||
          (rows.length > 1 && numberId ? `${candidateRow.id}-${numberId}` : numberId) ||
          `${candidateRow.id}-${index}`;

        mergedById.set(eventId, {
          ...(event || {}),
          id: eventId,
        });
      });
    });

  const events = Array.from(mergedById.values());

  return {
    rowId: row?.id ?? null,
    updatedAt: row?.updated_at ?? null,
    events,
  };
};

// Events API
export const eventsAPI = {
  get: async () => {
    const snapshot = await getEventsSnapshot();
    return snapshot.events;
  },
  getSnapshot: () => getEventsSnapshot(),
  saveWithSnapshot: async (
    events: any[],
    snapshot: Pick<EventsSnapshot, 'rowId' | 'updatedAt'>,
  ): Promise<{ conflict: boolean; rowId: string | null; updatedAt: string | null }> => {
    const nowIso = new Date().toISOString();

    if (!snapshot.rowId) {
      const insertWithSingleton = async () =>
        supabase
          .from('events')
          .insert({ singleton_key: EVENTS_SINGLETON_KEY, data: events, updated_at: nowIso })
          .select('id, updated_at')
          .limit(1);

      const insertLegacy = async () =>
        supabase
          .from('events')
          .insert({ data: events, updated_at: nowIso })
          .select('id, updated_at')
          .limit(1);

      let response = await insertWithSingleton();

      if (response.error && (response.error as any)?.code === '42703') {
        response = await insertLegacy();
      }

      if (response.error) {
        if ((response.error as any)?.code === '23505') {
          return {
            conflict: true,
            rowId: snapshot.rowId,
            updatedAt: snapshot.updatedAt,
          };
        }
        throw new Error(response.error.message);
      }

      return {
        conflict: false,
        rowId: response.data?.[0]?.id ?? null,
        updatedAt: response.data?.[0]?.updated_at ?? nowIso,
      };
    }

    let query = supabase
      .from('events')
      .update({ data: events, updated_at: nowIso })
      .eq('id', snapshot.rowId);

    if (snapshot.updatedAt) {
      query = query.eq('updated_at', snapshot.updatedAt);
    }

    const { data, error } = await query.select('id, updated_at').limit(1);
    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      return {
        conflict: true,
        rowId: snapshot.rowId,
        updatedAt: snapshot.updatedAt,
      };
    }

    return {
      conflict: false,
      rowId: data[0].id ?? snapshot.rowId,
      updatedAt: data[0].updated_at ?? nowIso,
    };
  },
  subscribe: (onChange: () => void) => {
    const channel = supabase
      .channel(`events-sync-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        onChange();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
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

export interface PresentationPagePayload {
  id: string;
  fileName: string;
  htmlContent: string;
}

export interface PresentationAssetPayload {
  id: string;
  fileName: string;
  mimeType: string;
  encoding: 'base64' | 'text';
  content: string;
}

export interface PresentationPackagePayload {
  id: string;
  title: string;
  eventDate: string | null;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  pages: PresentationPagePayload[];
  assets: PresentationAssetPayload[];
}

interface PresentationStoredFileMeta {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  encoding: 'base64' | 'text';
}

interface PresentationStoredData {
  pages?: PresentationStoredFileMeta[];
  assets?: PresentationStoredFileMeta[];
}

interface PresentationRow {
  id: string;
  title: string;
  event_date: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
  data: PresentationStoredData | null;
}

const PRESENTATIONS_TABLE = 'presentations_packages';
const PRESENTATIONS_BUCKET = 'presentations';

const normalizeStoredFileName = (fileName: string) => {
  const normalized = String(fileName || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')
    .trim();
  const chunks = normalized.split('/').filter(Boolean);
  const safeChunks = chunks.filter((chunk) => chunk !== '.' && chunk !== '..');
  return safeChunks.join('/') || 'file';
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const buildStoragePath = (
  packageId: string,
  kind: 'pages' | 'assets',
  fileId: string,
  fileName: string,
) => {
  const safeName = normalizeStoredFileName(fileName);
  return `${packageId}/${kind}/${fileId}/${safeName}`;
};

const mapRowToPresentationSummary = (row: PresentationRow): PresentationPackagePayload => {
  const pagesMeta = Array.isArray(row.data?.pages) ? row.data!.pages! : [];
  const assetsMeta = Array.isArray(row.data?.assets) ? row.data!.assets! : [];

  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    isRecurring: row.is_recurring,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pages: pagesMeta.map((page) => ({
      id: page.id,
      fileName: page.fileName,
      htmlContent: '',
    })),
    assets: assetsMeta.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      encoding: asset.encoding,
      content: '',
    })),
  };
};

const uploadPresentationPage = async (
  packageId: string,
  page: PresentationPagePayload,
): Promise<PresentationStoredFileMeta> => {
  const storagePath = buildStoragePath(packageId, 'pages', page.id, page.fileName);
  const blob = new Blob([page.htmlContent], { type: 'text/html;charset=utf-8' });

  const { error } = await supabase.storage.from(PRESENTATIONS_BUCKET).upload(storagePath, blob, {
    upsert: true,
    contentType: 'text/html; charset=utf-8',
  });
  if (error) throw new Error(error.message);

  return {
    id: page.id,
    fileName: page.fileName,
    storagePath,
    mimeType: 'text/html',
    encoding: 'text',
  };
};

const uploadPresentationAsset = async (
  packageId: string,
  asset: PresentationAssetPayload,
): Promise<PresentationStoredFileMeta> => {
  const storagePath = buildStoragePath(packageId, 'assets', asset.id, asset.fileName);
  const mimeType = asset.mimeType || 'application/octet-stream';
  const body =
    asset.encoding === 'text'
      ? new Blob([asset.content], { type: mimeType })
      : new Blob([base64ToUint8Array(asset.content)], { type: mimeType });

  const { error } = await supabase.storage.from(PRESENTATIONS_BUCKET).upload(storagePath, body, {
    upsert: true,
    contentType: mimeType,
  });
  if (error) throw new Error(error.message);

  return {
    id: asset.id,
    fileName: asset.fileName,
    storagePath,
    mimeType,
    encoding: asset.encoding,
  };
};

const downloadPresentationPage = async (meta: PresentationStoredFileMeta): Promise<PresentationPagePayload> => {
  const { data, error } = await supabase.storage.from(PRESENTATIONS_BUCKET).download(meta.storagePath);
  if (error) throw new Error(error.message);

  const htmlContent = await data.text();
  return {
    id: meta.id,
    fileName: meta.fileName,
    htmlContent,
  };
};

const downloadPresentationAsset = async (meta: PresentationStoredFileMeta): Promise<PresentationAssetPayload> => {
  const { data, error } = await supabase.storage.from(PRESENTATIONS_BUCKET).download(meta.storagePath);
  if (error) throw new Error(error.message);

  let content = '';
  if (meta.encoding === 'text') {
    content = await data.text();
  } else {
    const buffer = await data.arrayBuffer();
    content = arrayBufferToBase64(buffer);
  }

  return {
    id: meta.id,
    fileName: meta.fileName,
    mimeType: meta.mimeType || 'application/octet-stream',
    encoding: meta.encoding,
    content,
  };
};

const removeStoragePaths = async (paths: string[]) => {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRESENTATIONS_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
};

const getPresentationRowById = async (id: string): Promise<PresentationRow | null> => {
  const { data, error } = await supabase
    .from(PRESENTATIONS_TABLE)
    .select('id, title, event_date, is_recurring, created_at, updated_at, data')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PresentationRow | null) || null;
};

export const presentationsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from(PRESENTATIONS_TABLE)
      .select('id, title, event_date, is_recurring, created_at, updated_at, data')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((row) => mapRowToPresentationSummary(row as PresentationRow));
  },
  getById: async (id: string) => {
    const row = await getPresentationRowById(id);
    if (!row) return null;

    const pagesMeta = Array.isArray(row.data?.pages) ? row.data!.pages! : [];
    const assetsMeta = Array.isArray(row.data?.assets) ? row.data!.assets! : [];

    const [pages, assets] = await Promise.all([
      Promise.all(pagesMeta.map((meta) => downloadPresentationPage(meta))),
      Promise.all(assetsMeta.map((meta) => downloadPresentationAsset(meta))),
    ]);

    return {
      id: row.id,
      title: row.title,
      eventDate: row.event_date,
      isRecurring: row.is_recurring,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pages,
      assets,
    } satisfies PresentationPackagePayload;
  },
  create: async (payload: {
    title: string;
    eventDate: string | null;
    isRecurring: boolean;
    pages: PresentationPagePayload[];
    assets: PresentationAssetPayload[];
  }) => {
    const packageId = crypto.randomUUID();

    const { error: insertError } = await supabase.from(PRESENTATIONS_TABLE).insert({
      id: packageId,
      title: payload.title,
      event_date: payload.eventDate,
      is_recurring: payload.isRecurring,
      data: { pages: [], assets: [] },
    });
    if (insertError) throw new Error(insertError.message);

    try {
      const [pagesMeta, assetsMeta] = await Promise.all([
        Promise.all(payload.pages.map((page) => uploadPresentationPage(packageId, page))),
        Promise.all(payload.assets.map((asset) => uploadPresentationAsset(packageId, asset))),
      ]);

      const { error: updateError } = await supabase
        .from(PRESENTATIONS_TABLE)
        .update({
          data: { pages: pagesMeta, assets: assetsMeta },
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId);
      if (updateError) throw new Error(updateError.message);
    } catch (err) {
      await supabase.from(PRESENTATIONS_TABLE).delete().eq('id', packageId);
      throw err;
    }

    const created = await presentationsAPI.getById(packageId);
    if (!created) {
      throw new Error('Failed to read created presentation package');
    }
    return created;
  },
  updateTitle: async (id: string, title: string) => {
    const row = await getPresentationRowById(id);
    if (!row) throw new Error('Presentation package not found');
    return presentationsAPI.updateMeta(id, {
      title,
      eventDate: row.event_date,
      isRecurring: row.is_recurring,
    });
  },
  updateMeta: async (id: string, payload: { title: string; eventDate: string | null; isRecurring: boolean }) => {
    const { error } = await supabase
      .from(PRESENTATIONS_TABLE)
      .update({
        title: payload.title,
        event_date: payload.eventDate,
        is_recurring: payload.isRecurring,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  delete: async (id: string) => {
    const row = await getPresentationRowById(id);
    if (row) {
      const pagesMeta = Array.isArray(row.data?.pages) ? row.data!.pages! : [];
      const assetsMeta = Array.isArray(row.data?.assets) ? row.data!.assets! : [];
      const allPaths = [...pagesMeta, ...assetsMeta].map((meta) => meta.storagePath);
      await removeStoragePaths(allPaths);
    }

    const { error } = await supabase.from(PRESENTATIONS_TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  updatePagesOrder: async (id: string, orderedPageIds: string[]) => {
    const row = await getPresentationRowById(id);
    if (!row) throw new Error('Presentation package not found');

    const pagesMeta = Array.isArray(row.data?.pages) ? row.data!.pages! : [];
    const assetsMeta = Array.isArray(row.data?.assets) ? row.data!.assets! : [];

    const pagesById = new Map(pagesMeta.map((page) => [page.id, page]));
    const nextPages = orderedPageIds
      .map((pageId) => pagesById.get(pageId))
      .filter((page): page is PresentationStoredFileMeta => Boolean(page));

    const existingIds = new Set(nextPages.map((page) => page.id));
    const tail = pagesMeta.filter((page) => !existingIds.has(page.id));

    const { error } = await supabase
      .from(PRESENTATIONS_TABLE)
      .update({
        data: { pages: [...nextPages, ...tail], assets: assetsMeta },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    return { success: true };
  },
  updatePackageContent: async (
    id: string,
    payload: { pages: PresentationPagePayload[]; assets: PresentationAssetPayload[] },
  ) => {
    const row = await getPresentationRowById(id);
    if (!row) throw new Error('Presentation package not found');

    const prevPagesMeta = Array.isArray(row.data?.pages) ? row.data!.pages! : [];
    const prevAssetsMeta = Array.isArray(row.data?.assets) ? row.data!.assets! : [];
    const prevPaths = new Set([...prevPagesMeta, ...prevAssetsMeta].map((item) => item.storagePath));

    const [nextPagesMeta, nextAssetsMeta] = await Promise.all([
      Promise.all(payload.pages.map((page) => uploadPresentationPage(id, page))),
      Promise.all(payload.assets.map((asset) => uploadPresentationAsset(id, asset))),
    ]);

    const nextPaths = new Set([...nextPagesMeta, ...nextAssetsMeta].map((item) => item.storagePath));
    const stalePaths = Array.from(prevPaths).filter((path) => !nextPaths.has(path));
    await removeStoragePaths(stalePaths);

    const { error } = await supabase
      .from(PRESENTATIONS_TABLE)
      .update({
        data: { pages: nextPagesMeta, assets: nextAssetsMeta },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    return { success: true };
  },
};
