import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    console.log('[supabase] client initialized');
  }
  return supabaseClient;
}

export interface SupabaseInsertResult<T> {
  data: T[] | null;
  error: string | null;
}

export interface SupabaseSelectResult<T> {
  data: T[] | null;
  error: string | null;
  count: number | null;
}

export class SupabaseService {
  isAvailable(): boolean {
    return !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  }

  getClient(): SupabaseClient {
    const client = getSupabaseClient();
    if (!client) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured');
    return client;
  }

  async select<T = Record<string, unknown>>(
    table: string,
    options?: { columns?: string; filter?: Record<string, unknown>; limit?: number; offset?: number },
  ): Promise<SupabaseSelectResult<T>> {
    const client = this.getClient();
    let query = client.from(table).select(options?.columns ?? '*', { count: 'exact' });

    if (options?.filter) {
      for (const [col, val] of Object.entries(options.filter)) {
        query = query.eq(col, val as string | number | boolean);
      }
    }
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);

    const { data, error, count } = await query;
    return { data: data as T[] | null, error: error?.message ?? null, count };
  }

  async insert<T = Record<string, unknown>>(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
  ): Promise<SupabaseInsertResult<T>> {
    const client = this.getClient();
    const payload = Array.isArray(rows) ? rows : [rows];
    const { data, error } = await client.from(table).insert(payload).select();
    return { data: data as T[] | null, error: error?.message ?? null };
  }

  async update<T = Record<string, unknown>>(
    table: string,
    filter: Record<string, unknown>,
    updates: Record<string, unknown>,
  ): Promise<SupabaseInsertResult<T>> {
    const client = this.getClient();
    let query = client.from(table).update(updates);
    for (const [col, val] of Object.entries(filter)) {
      query = query.eq(col, val as string | number | boolean);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (query as any).select();
    return { data: data as T[] | null, error: error?.message ?? null };
  }

  async remove(table: string, filter: Record<string, unknown>): Promise<{ error: string | null }> {
    const client = this.getClient();
    let query = client.from(table).delete();
    for (const [col, val] of Object.entries(filter)) {
      query = query.eq(col, val as string | number | boolean);
    }
    const { error } = await query;
    return { error: error?.message ?? null };
  }

  async upsert<T = Record<string, unknown>>(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    onConflict?: string,
  ): Promise<SupabaseInsertResult<T>> {
    const client = this.getClient();
    const payload = Array.isArray(rows) ? rows : [rows];
    const { data, error } = await client
      .from(table)
      .upsert(payload, onConflict ? { onConflict } : undefined)
      .select();
    return { data: data as T[] | null, error: error?.message ?? null };
  }

  async ping(): Promise<boolean> {
    try {
      const client = this.getClient();
      const { error } = await client.from('_health_check_nonexistent_').select('*').limit(1);
      // PGRST301 = table not found — server is reachable and responded
      return !error || error?.code === 'PGRST301';
    } catch {
      return false;
    }
  }

  async uploadFile(
    bucket: string,
    path: string,
    data: Buffer | Blob,
    contentType: string,
  ): Promise<{ url: string | null; error: string | null }> {
    const client = this.getClient();
    const { error } = await client.storage.from(bucket).upload(path, data, {
      contentType,
      upsert: true,
    });
    if (error) return { url: null, error: error.message };
    const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl, error: null };
  }
}

export const supabaseService = new SupabaseService();
