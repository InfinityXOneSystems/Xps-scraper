import { useState, useEffect, useCallback, useRef } from 'react';
import { getKeys, deleteKey, clearKeys, exportKeys, harvestKeys } from '../api';
import type { HarvestedKey } from '../types';

const TYPE_COLORS: Record<string, string> = {
  jwt:            'bg-blue-900 text-blue-300 border-blue-700',
  bearer_token:   'bg-blue-900 text-blue-300 border-blue-700',
  api_key:        'bg-green-900 text-green-300 border-green-700',
  aws:            'bg-orange-900 text-orange-300 border-orange-700',
  stripe:         'bg-purple-900 text-purple-300 border-purple-700',
  github:         'bg-slate-700 text-slate-200 border-slate-500',
  oauth:          'bg-teal-900 text-teal-300 border-teal-700',
  generic_secret: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  unknown:        'bg-gray-800 text-gray-400 border-gray-600',
};

function typeBadgeClass(type: string) {
  return TYPE_COLORS[type.toLowerCase()] ?? TYPE_COLORS.unknown;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f97316' : '#eab308';
  return (
    <div className="flex items-center gap-2">
      <div className="confidence-bar flex-1 max-w-20">
        <div
          className="confidence-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-[#8b949e]">{pct}%</span>
    </div>
  );
}

export default function Keys() {
  const [keys, setKeys] = useState<HarvestedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [harvestUrl, setHarvestUrl] = useState('');
  const [harvesting, setHarvesting] = useState(false);
  const [harvestMsg, setHarvestMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await getKeys();
      setKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
    pollingRef.current = setInterval(fetchKeys, 30_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchKeys]);

  async function handleHarvest() {
    const trimmed = harvestUrl.trim();
    if (!trimmed) return;
    setHarvesting(true);
    setHarvestMsg(null);
    try {
      const res = await harvestKeys(trimmed);
      setHarvestMsg(`✅ Harvested ${res.count} key(s) from ${trimmed}`);
      setHarvestUrl('');
      await fetchKeys();
    } catch (err) {
      setHarvestMsg(`⚠️ ${err instanceof Error ? err.message : 'Harvest failed'}`);
    } finally {
      setHarvesting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

  async function handleClear() {
    if (!window.confirm('Delete all harvested keys?')) return;
    setClearing(true);
    try {
      await clearKeys();
      setKeys([]);
    } catch {
      /* ignore */
    } finally {
      setClearing(false);
    }
  }

  async function handleExport(format: 'json' | 'csv') {
    try {
      const data = await exportKeys(format);
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xps-keys-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`✅ Exported as ${format.toUpperCase()}`);
      setTimeout(() => setExportMsg(null), 3000);
    } catch (err) {
      setExportMsg(`⚠️ ${err instanceof Error ? err.message : 'Export failed'}`);
    }
  }

  // Stats
  const typeCounts = keys.reduce<Record<string, number>>((acc, k) => {
    acc[k.type] = (acc[k.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 p-5 border-b border-[#30363d] space-y-4 bg-[#0f1117]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            🔑 Harvested Keys
            <span className="ml-1 px-2 py-0.5 bg-[#1c2333] border border-[#30363d] rounded-full text-xs text-[#8b949e]">
              {keys.length}
            </span>
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleExport('json')}
              disabled={keys.length === 0}
              className="px-3 py-1.5 text-xs bg-[#1c2333] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-white rounded-lg transition-all disabled:opacity-40"
            >
              ↓ JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={keys.length === 0}
              className="px-3 py-1.5 text-xs bg-[#1c2333] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-white rounded-lg transition-all disabled:opacity-40"
            >
              ↓ CSV
            </button>
            <button
              onClick={handleClear}
              disabled={clearing || keys.length === 0}
              className="px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/60 border border-red-700/50 text-red-400 hover:text-red-300 rounded-lg transition-all disabled:opacity-40"
            >
              {clearing ? 'Clearing…' : '🗑 Clear All'}
            </button>
          </div>
        </div>

        {exportMsg && (
          <p className="text-xs text-[#58a6ff]">{exportMsg}</p>
        )}

        {/* Harvest from URL */}
        <div className="flex gap-2">
          <input
            type="url"
            value={harvestUrl}
            onChange={(e) => setHarvestUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleHarvest()}
            placeholder="https://example.com/config.js — harvest keys from this URL"
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            onClick={handleHarvest}
            disabled={harvesting || !harvestUrl.trim()}
            className="px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#1c2333] disabled:text-[#484f58] text-white text-sm rounded-lg font-medium transition-all"
          >
            {harvesting ? 'Harvesting…' : 'Harvest'}
          </button>
        </div>
        {harvestMsg && (
          <p className="text-xs text-[#58a6ff]">{harvestMsg}</p>
        )}
      </div>

      {/* Stats pills */}
      {keys.length > 0 && (
        <div className="flex-shrink-0 px-5 py-3 flex gap-2 flex-wrap border-b border-[#30363d] bg-[#0f1117]">
          {Object.entries(typeCounts).map(([type, count]) => (
            <span
              key={type}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${typeBadgeClass(type)}`}
            >
              {type.replace(/_/g, ' ')} <span className="font-bold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20 text-[#484f58] text-sm">
            Loading…
          </div>
        )}

        {error && !loading && (
          <div className="m-5 bg-red-900/30 border border-red-700/50 text-red-400 text-sm px-4 py-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 text-[#484f58]">
            <span className="text-5xl mb-4">🔑</span>
            <p className="text-sm font-medium text-[#8b949e] mb-1">No keys harvested yet</p>
            <p className="text-xs">
              Use the Scrape tab or enter a URL above to extract API keys
            </p>
          </div>
        )}

        {!loading && keys.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#161b22] border-b border-[#30363d]">
              <tr>
                {['Type', 'Masked Value', 'Source', 'Confidence', 'Date', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[#8b949e] font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2333]">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-[#161b22] group">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${typeBadgeClass(
                        key.type,
                      )}`}
                    >
                      {key.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-[#f0883e] bg-[#161b22] px-1.5 py-0.5 rounded">
                      {key.value}
                    </code>
                    {key.context && (
                      <p
                        className="text-[#484f58] mt-0.5 truncate max-w-xs"
                        title={key.context}
                      >
                        {key.context}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={key.source !== 'inline' ? key.source : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`truncate block max-w-xs ${
                        key.source !== 'inline'
                          ? 'text-[#58a6ff] hover:underline'
                          : 'text-[#484f58]'
                      }`}
                    >
                      {key.source}
                    </a>
                  </td>
                  <td className="px-4 py-3 min-w-[100px]">
                    <ConfidenceBar value={key.confidence} />
                  </td>
                  <td className="px-4 py-3 text-[#484f58] whitespace-nowrap">
                    {new Date(key.harvestedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(key.id)}
                      disabled={deleting === key.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 text-sm px-2 py-0.5 rounded hover:bg-red-900/30"
                      title="Delete key"
                    >
                      {deleting === key.id ? '…' : '✕'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex-shrink-0 px-5 py-2 border-t border-[#30363d] text-[10px] text-[#484f58]">
        Auto-refreshes every 30s · {keys.length} key{keys.length !== 1 ? 's' : ''} stored
      </div>
    </div>
  );
}
