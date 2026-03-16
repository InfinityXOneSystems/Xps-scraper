import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        [key: string]: unknown;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract token from Authorization header or X-API-Key header
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

  const providedKey = bearerToken ?? (typeof apiKeyHeader === 'string' ? apiKeyHeader : undefined);

  // Development passthrough when no auth is configured
  if (!config.API_KEY && !config.JWT_SECRET) {
    if (config.NODE_ENV !== 'production') {
      console.warn(
        '[auth] WARNING: No API_KEY or JWT_SECRET configured — allowing all requests (development mode)',
      );
    }
    req.user = { id: 'anonymous', role: 'dev' };
    next();
    return;
  }

  if (!providedKey) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing authentication token' });
    return;
  }

  // Validate plain API key
  if (config.API_KEY && providedKey === config.API_KEY) {
    req.user = { id: 'api-key-user', role: 'admin' };
    next();
    return;
  }

  // Validate JWT
  if (config.JWT_SECRET) {
    try {
      const decoded = jwt.verify(providedKey, config.JWT_SECRET) as Record<string, unknown>;
      req.user = {
        id: typeof decoded['sub'] === 'string' ? decoded['sub'] : 'jwt-user',
        role: typeof decoded['role'] === 'string' ? decoded['role'] : 'user',
        ...decoded,
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }
  }

  res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
}
