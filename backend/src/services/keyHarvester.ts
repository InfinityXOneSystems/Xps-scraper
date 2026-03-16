import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import type { ScrapeResult } from './scraper';

export type KeyType =
  | 'api_key'
  | 'bearer_token'
  | 'jwt'
  | 'aws'
  | 'stripe'
  | 'github'
  | 'oauth'
  | 'generic_secret'
  | 'unknown';

export interface HarvestedKey {
  id: string;
  type: KeyType;
  value: string;
  rawValue: string;
  context: string;
  source: string;
  confidence: number;
  harvestedAt: string;
}

interface PatternDef {
  type: KeyType;
  pattern: RegExp;
  confidence: number;
  /** If true, use match[1] (first capture group) as the key value instead of the full match */
  useGroup?: boolean;
}

const PATTERNS: PatternDef[] = [
  {
    type: 'jwt',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    confidence: 0.95,
  },
  {
    type: 'aws',
    pattern: /AKIA[0-9A-Z]{16}/g,
    confidence: 0.98,
  },
  {
    type: 'aws',
    pattern: /aws_secret_access_key\s*=\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    confidence: 0.97,
    useGroup: true,
  },
  {
    type: 'stripe',
    pattern: /(sk|pk)_(test|live)_[a-zA-Z0-9]{20,}/g,
    confidence: 0.99,
  },
  {
    type: 'github',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    confidence: 0.98,
  },
  {
    type: 'oauth',
    pattern: /ya29\.[a-zA-Z0-9_-]+/g,
    confidence: 0.95,
  },
  {
    type: 'bearer_token',
    pattern: /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/g,
    confidence: 0.85,
    useGroup: true,
  },
  {
    type: 'generic_secret',
    pattern: /secret[_-]?key[_-]?\s*=\s*['"]([^'"]{16,})['"]/gi,
    confidence: 0.8,
    useGroup: true,
  },
  {
    type: 'generic_secret',
    pattern: /api[_-]?key[_-]?\s*[=:]\s*['"]?([a-zA-Z0-9\-._]{20,})['"]?/gi,
    confidence: 0.75,
    useGroup: true,
  },
  {
    type: 'api_key',
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    confidence: 0.9,
  },
  {
    type: 'api_key',
    pattern: /pk_[a-z]+_[a-zA-Z0-9]{20,}/g,
    confidence: 0.88,
  },
];

function maskValue(raw: string): string {
  if (raw.length <= 8) return '*'.repeat(raw.length);
  return raw.slice(0, 4) + '*'.repeat(raw.length - 8) + raw.slice(-4);
}

function getContext(content: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + matchLength + 50);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

export class KeyHarvesterService {
  private readonly store = new Map<string, HarvestedKey>();

  harvest(content: string | ScrapeResult, source = 'inline'): HarvestedKey[] {
    const text =
      typeof content === 'string'
        ? content
        : [
            content.text,
            content.title,
            JSON.stringify(content.meta),
            ...content.links.map((l) => l.href),
          ].join('\n');

    const harvested: HarvestedKey[] = [];
    const seen = new Set<string>();

    for (const def of PATTERNS) {
      const regex = new RegExp(def.pattern.source, def.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        // Use capture group if the pattern specifically marks it for extraction; else use full match
        const matchedText = def.useGroup && match[1] != null ? match[1] : match[0];
        const rawValue = matchedText.trim();

        if (!rawValue || rawValue.length < 8) continue;
        // Deduplicate by value
        if (seen.has(rawValue)) continue;
        seen.add(rawValue);

        const id = uuidv4();
        const key: HarvestedKey = {
          id,
          type: def.type,
          value: maskValue(rawValue),
          rawValue,
          context: getContext(text, match.index, match[0].length),
          source: typeof content === 'string' ? source : content.url,
          confidence: def.confidence,
          harvestedAt: new Date().toISOString(),
        };

        this.store.set(id, key);
        harvested.push(key);
      }
    }

    return harvested;
  }

  async harvestFromUrl(url: string): Promise<HarvestedKey[]> {
    const response = await axios.get<string>(url, {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      validateStatus: () => true,
    });

    const content = typeof response.data === 'string' ? response.data : String(response.data);
    return this.harvest(content, url);
  }

  getAll(): Omit<HarvestedKey, 'rawValue'>[] {
    return Array.from(this.store.values()).map(({ rawValue: _raw, ...rest }) => rest);
  }

  getById(id: string): HarvestedKey | undefined {
    return this.store.get(id);
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }

  export(format: 'json' | 'csv'): string {
    const keys = this.getAll();

    if (format === 'csv') {
      const header = 'id,type,value,source,confidence,harvestedAt';
      const rows = keys.map(
        (k) =>
          `${k.id},${k.type},"${k.value}","${k.source}",${k.confidence},${k.harvestedAt}`,
      );
      return [header, ...rows].join('\n');
    }

    return JSON.stringify(keys, null, 2);
  }
}

export const keyHarvesterService = new KeyHarvesterService();
