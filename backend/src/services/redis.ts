import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!config.REDIS_URL) {
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redisClient.on('error', (err) => {
      console.error('[redis] connection error:', err.message);
    });
    redisClient.on('connect', () => {
      console.log('[redis] connected');
    });
  }
  return redisClient;
}

export class RedisService {
  private get client(): Redis | null {
    return getRedisClient();
  }

  isAvailable(): boolean {
    return !!config.REDIS_URL;
  }

  async get(key: string): Promise<string | null> {
    const client = this.client;
    if (!client) return null;
    try {
      return await client.get(key);
    } catch (err) {
      console.error('[redis] get error:', err);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    try {
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (err) {
      console.error('[redis] set error:', err);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    try {
      await client.del(key);
      return true;
    } catch (err) {
      console.error('[redis] del error:', err);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    try {
      return (await client.exists(key)) === 1;
    } catch (err) {
      console.error('[redis] exists error:', err);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const client = this.client;
    if (!client) return [];
    try {
      return await client.keys(pattern);
    } catch (err) {
      console.error('[redis] keys error:', err);
      return [];
    }
  }

  async ttl(key: string): Promise<number> {
    const client = this.client;
    if (!client) return -2;
    try {
      return await client.ttl(key);
    } catch (err) {
      console.error('[redis] ttl error:', err);
      return -2;
    }
  }

  async flush(): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    try {
      await client.flushdb();
      return true;
    } catch (err) {
      console.error('[redis] flush error:', err);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  // Queue helpers using Redis lists
  async enqueue(queueName: string, payload: unknown): Promise<boolean> {
    const client = this.client;
    if (!client) return false;
    try {
      await client.rpush(queueName, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('[redis] enqueue error:', err);
      return false;
    }
  }

  async dequeue(queueName: string): Promise<unknown | null> {
    const client = this.client;
    if (!client) return null;
    try {
      const item = await client.lpop(queueName);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error('[redis] dequeue error:', err);
      return null;
    }
  }

  async queueLength(queueName: string): Promise<number> {
    const client = this.client;
    if (!client) return 0;
    try {
      return await client.llen(queueName);
    } catch (err) {
      console.error('[redis] queueLength error:', err);
      return 0;
    }
  }

  async disconnect(): Promise<void> {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
  }
}

export const redisService = new RedisService();
