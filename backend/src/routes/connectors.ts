import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const router = Router();

// In-memory connection store (each connection has name, type, credentials, status)
interface AppConnection {
  id: string;
  name: string;
  type: string;
  credentials: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
  testedAt?: string;
  createdAt: string;
}

const connections = new Map<string, AppConnection>();

// Seed from environment if tokens configured
function seedFromEnv() {
  const seeds: Array<{ type: string; name: string; tokenKey: string }> = [
    { type: 'vercel', name: 'Vercel', tokenKey: 'VERCEL_TOKEN' },
    { type: 'railway', name: 'Railway', tokenKey: 'RAILWAY_API_TOKEN' },
    { type: 'github', name: 'GitHub', tokenKey: 'GITHUB_APP_ID' },
  ];
  seeds.forEach(({ type, name, tokenKey }) => {
    const val = process.env[tokenKey];
    if (val && !Array.from(connections.values()).some((c) => c.type === type)) {
      const conn: AppConnection = {
        id: uuidv4(),
        name,
        type,
        credentials: { token: val },
        status: 'connected',
        testedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      connections.set(conn.id, conn);
    }
  });
}
seedFromEnv();

const ConnectionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  credentials: z.record(z.string()),
});

// GET /api/connectors
router.get('/', (_req: Request, res: Response) => {
  const list = Array.from(connections.values()).map(({ credentials: _c, ...rest }) => rest);
  res.json({ connections: list, count: list.length });
});

// POST /api/connectors - add a new connection
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = ConnectionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() }); return; }
    const now = new Date().toISOString();
    const conn: AppConnection = {
      id: uuidv4(),
      ...parsed.data,
      status: 'disconnected',
      createdAt: now,
    };
    // Try to test the connection
    conn.status = await testConnection(conn.type, conn.credentials) ? 'connected' : 'error';
    conn.testedAt = new Date().toISOString();
    connections.set(conn.id, conn);
    const { credentials: _cred, ...safe } = conn;
    res.status(201).json(safe);
  } catch (err) { next(err); }
});

// POST /api/connectors/:id/test
router.post('/:id/test', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conn = connections.get(req.params['id'] as string);
    if (!conn) { res.status(404).json({ error: 'Connection not found' }); return; }
    const ok = await testConnection(conn.type, conn.credentials);
    conn.status = ok ? 'connected' : 'error';
    conn.testedAt = new Date().toISOString();
    res.json({ status: conn.status, testedAt: conn.testedAt });
  } catch (err) { next(err); }
});

// DELETE /api/connectors/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const id = req.params['id'] as string;
  if (!connections.has(id)) { res.status(404).json({ error: 'Connection not found' }); return; }
  connections.delete(id);
  res.status(204).send();
});

// GET /api/connectors/oauth/github - initiate GitHub OAuth flow
router.get('/oauth/github', (_req: Request, res: Response) => {
  if (!config.GITHUB_CLIENT_ID) {
    res.status(503).json({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env' });
    return;
  }
  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    scope: 'repo,user,read:org,admin:org',
    state: uuidv4(),
  });
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
});

// POST /api/connectors/oauth/github/callback
router.post('/oauth/github/callback', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) { res.status(400).json({ error: 'code required' }); return; }
    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
      res.status(503).json({ error: 'GitHub OAuth not configured' });
      return;
    }
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.GITHUB_CLIENT_ID, client_secret: config.GITHUB_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      res.status(400).json({ error: tokenData.error ?? 'GitHub OAuth failed' });
      return;
    }
    // Fetch user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'XPS-Shadow' },
    });
    const user = await userRes.json() as { login?: string; name?: string; avatar_url?: string };
    const now = new Date().toISOString();
    const conn: AppConnection = {
      id: uuidv4(),
      name: `GitHub: ${user.login ?? 'unknown'}`,
      type: 'github',
      credentials: { token: tokenData.access_token },
      status: 'connected',
      testedAt: now,
      createdAt: now,
    };
    connections.set(conn.id, conn);
    const { credentials: _cred, ...safe } = conn;
    res.json({ ...safe, user });
  } catch (err) { next(err); }
});

async function testConnection(type: string, credentials: Record<string, string>): Promise<boolean> {
  try {
    switch (type) {
      case 'github': {
        const r = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${credentials.token ?? credentials.pat ?? ''}`, 'User-Agent': 'XPS-Shadow' },
        });
        return r.ok;
      }
      case 'vercel': {
        const r = await fetch('https://api.vercel.com/v2/user', {
          headers: { Authorization: `Bearer ${credentials.token ?? ''}` },
        });
        return r.ok;
      }
      case 'railway': {
        const r = await fetch('https://backboard.railway.app/graphql/v2', {
          method: 'POST',
          headers: { Authorization: `Bearer ${credentials.token ?? ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ me { id name } }' }),
        });
        return r.ok;
      }
      case 'openai': {
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${credentials.apiKey ?? credentials.token ?? ''}` },
        });
        return r.ok;
      }
      case 'anthropic': {
        const r = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': credentials.apiKey ?? credentials.token ?? '', 'anthropic-version': '2023-06-01' },
        });
        return r.ok;
      }
      case 'supabase': {
        const url = credentials.url ?? '';
        const key = credentials.anonKey ?? credentials.token ?? '';
        if (!url) return false;
        const r = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        return r.status < 500;
      }
      case 'netlify': {
        const r = await fetch('https://api.netlify.com/api/v1/user', {
          headers: { Authorization: `Bearer ${credentials.token ?? ''}` },
        });
        return r.ok;
      }
      default:
        return true;
    }
  } catch {
    return false;
  }
}

export { router as connectorsRouter };
