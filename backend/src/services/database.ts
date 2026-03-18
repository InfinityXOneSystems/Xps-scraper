import { Pool, PoolClient, QueryResultRow } from 'pg';
import { config } from '../config';

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!config.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('[postgres] pool error:', err.message);
    });
    pool.on('connect', () => {
      console.log('[postgres] client connected');
    });
  }
  return pool;
}

export class DatabaseService {
  isAvailable(): boolean {
    return !!config.DATABASE_URL;
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const pg = getPool();
    if (!pg) throw new Error('DATABASE_URL not configured');
    const result = await pg.query<T>(sql, params);
    return result.rows;
  }

  async queryOne<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const pg = getPool();
    if (!pg) throw new Error('DATABASE_URL not configured');
    const client = await pg.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async runMigrations(): Promise<void> {
    if (!this.isAvailable()) return;
    await this.query(`
      CREATE TABLE IF NOT EXISTS scrape_jobs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url         TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending',
        result      JSONB,
        error       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT,
        email       TEXT,
        phone       TEXT,
        company     TEXT,
        source_url  TEXT,
        metadata    JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id   TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending',
        payload       JSONB,
        result        JSONB,
        started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at  TIMESTAMPTZ
      )
    `);
    console.log('[postgres] migrations applied');
  }

  async disconnect(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
}

export const databaseService = new DatabaseService();
