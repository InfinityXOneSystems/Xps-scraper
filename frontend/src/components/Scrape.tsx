import { useState } from 'react';
import { scrapeUrl, harvestKeys } from '../api';
import type { ScrapeResult } from '../types';

type ResultTab = 'text' | 'links' | 'images' | 'meta' | 'tables';

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[100, 80, 90, 70].map((w, i) => (
        <div
          key={i}
          className="h-4 bg-[#1c2333] rounded"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

function StatusBadge({ code }: { code: number }) {
  const color =
    code < 300 ? 'bg-green-900 text-green-400 border-green-700' :
    code < 400 ? 'bg-yellow-900 text-yellow-400 border-yellow-700' :
                 'bg-red-900 text-red-400 border-red-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${color}`}>
      {code}
    </span>
  );
}

export default function Scrape() {
  const [url, setUrl] = useState('');
  const [extractImages, setExtractImages] = useState(true);
  const [extractLinks, setExtractLinks] = useState(true);
  const [selectorInput, setSelectorInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('text');
  const [harvestMsg, setHarvestMsg] = useState<string | null>(null);

  async function handleScrape() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHarvestMsg(null);

    try {
      let selectors: Record<string, string> | undefined;
      if (selectorInput.trim()) {
        try {
          selectors = JSON.parse(selectorInput);
        } catch {
          setError('Invalid selectors JSON');
          setLoading(false);
          return;
        }
      }
      const data = await scrapeUrl(trimmed, { extractImages, extractLinks, selectors });
      setResult(data);
      setActiveTab('text');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleHarvestKeys() {
    if (!result) return;
    setHarvesting(true);
    setHarvestMsg(null);
    try {
      const res = await harvestKeys(result.url, result.text);
      setHarvestMsg(`✅ Found ${res.count} key(s) — check the Keys tab`);
    } catch (err) {
      setHarvestMsg(`⚠️ ${err instanceof Error ? err.message : 'Harvest failed'}`);
    } finally {
      setHarvesting(false);
    }
  }

  const TABS: { id: ResultTab; label: string }[] = [
    { id: 'text',   label: 'Text' },
    { id: 'links',  label: `Links (${result?.links.length ?? 0})` },
    { id: 'images', label: `Images (${result?.images.length ?? 0})` },
    { id: 'meta',   label: 'Meta' },
    { id: 'tables', label: `Tables (${result?.tables.length ?? 0})` },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Input panel */}
      <div className="flex-shrink-0 p-5 border-b border-[#30363d] space-y-4 bg-[#0f1117]">
        <h2 className="text-base font-semibold flex items-center gap-2">
          🔍 Web Scraper
        </h2>

        {/* URL bar */}
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            placeholder="https://example.com"
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="px-5 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#1c2333] disabled:text-[#484f58] text-white text-sm rounded-lg font-medium transition-all"
          >
            {loading ? 'Scraping…' : 'Scrape'}
          </button>
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-[#8b949e] hover:text-white">
            <input
              type="checkbox"
              checked={extractImages}
              onChange={(e) => setExtractImages(e.target.checked)}
              className="accent-[#1f6feb]"
            />
            Extract images
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[#8b949e] hover:text-white">
            <input
              type="checkbox"
              checked={extractLinks}
              onChange={(e) => setExtractLinks(e.target.checked)}
              className="accent-[#1f6feb]"
            />
            Extract links
          </label>

          <div className="flex items-center gap-2 flex-1 min-w-48">
            <span className="text-[#8b949e] whitespace-nowrap text-xs">CSS Selectors (JSON):</span>
            <input
              type="text"
              value={selectorInput}
              onChange={(e) => setSelectorInput(e.target.value)}
              placeholder='{"price":".product-price"}'
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <Skeleton />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Meta header */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">
                    {result.title || '(no title)'}
                  </h3>
                  {result.description && (
                    <p className="text-sm text-[#8b949e] mt-0.5 line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge code={result.statusCode} />
                  <span className="text-xs text-[#484f58]">{result.responseTime}ms</span>
                </div>
              </div>
              <p className="text-xs text-[#484f58] break-all">{result.url}</p>
              <p className="text-xs text-[#484f58]">
                Scraped at {new Date(result.scrapedAt).toLocaleString()}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleHarvestKeys}
                  disabled={harvesting}
                  className="px-3 py-1.5 bg-[#1c2333] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#8b949e] hover:text-white rounded-lg transition-all disabled:opacity-50"
                >
                  {harvesting ? '🔄 Harvesting…' : '🔑 Harvest Keys'}
                </button>
              </div>
              {harvestMsg && (
                <p className="text-xs text-[#58a6ff]">{harvestMsg}</p>
              )}
            </div>

            {/* Tab switcher */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="flex border-b border-[#30363d] overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === t.id
                        ? 'bg-[#1f6feb] text-white'
                        : 'text-[#8b949e] hover:text-white hover:bg-[#1c2333]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4 overflow-auto max-h-96">
                {activeTab === 'text' && (
                  <pre className="text-xs text-[#8b949e] whitespace-pre-wrap break-words leading-5">
                    {result.text || '(no text extracted)'}
                  </pre>
                )}

                {activeTab === 'links' && (
                  result.links.length === 0
                    ? <p className="text-xs text-[#484f58]">No links found.</p>
                    : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#30363d] text-[#8b949e]">
                            <th className="text-left pb-2 pr-4">Text</th>
                            <th className="text-left pb-2">URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1c2333]">
                          {result.links.map((l, i) => (
                            <tr key={i} className="hover:bg-[#1c2333]">
                              <td className="py-1.5 pr-4 text-[#8b949e] max-w-xs truncate">
                                {l.text || '—'}
                              </td>
                              <td className="py-1.5">
                                <a
                                  href={l.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#58a6ff] hover:underline truncate block max-w-xs"
                                >
                                  {l.href}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                )}

                {activeTab === 'images' && (
                  result.images.length === 0
                    ? <p className="text-xs text-[#484f58]">No images found.</p>
                    : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#30363d] text-[#8b949e]">
                            <th className="text-left pb-2 pr-4">Alt</th>
                            <th className="text-left pb-2">Src</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1c2333]">
                          {result.images.map((img, i) => (
                            <tr key={i} className="hover:bg-[#1c2333]">
                              <td className="py-1.5 pr-4 text-[#8b949e] max-w-xs truncate">
                                {img.alt || '—'}
                              </td>
                              <td className="py-1.5">
                                <a
                                  href={img.src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#58a6ff] hover:underline truncate block max-w-xs"
                                >
                                  {img.src}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                )}

                {activeTab === 'meta' && (
                  Object.keys(result.meta).length === 0
                    ? <p className="text-xs text-[#484f58]">No meta tags found.</p>
                    : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#30363d] text-[#8b949e]">
                            <th className="text-left pb-2 pr-4">Name</th>
                            <th className="text-left pb-2">Content</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1c2333]">
                          {Object.entries(result.meta).map(([k, v]) => (
                            <tr key={k} className="hover:bg-[#1c2333]">
                              <td className="py-1.5 pr-4 text-[#58a6ff]">{k}</td>
                              <td className="py-1.5 text-[#8b949e] break-words">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                )}

                {activeTab === 'tables' && (
                  result.tables.length === 0
                    ? <p className="text-xs text-[#484f58]">No tables found.</p>
                    : result.tables.map((tbl, ti) => (
                      <div key={ti} className="mb-6">
                        <p className="text-xs text-[#484f58] mb-2">Table {ti + 1}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            {tbl.headers.length > 0 && (
                              <thead>
                                <tr className="bg-[#1c2333] border-b border-[#30363d]">
                                  {tbl.headers.map((h, hi) => (
                                    <th key={hi} className="px-3 py-1.5 text-left text-[#8b949e]">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                            )}
                            <tbody className="divide-y divide-[#1c2333]">
                              {tbl.rows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-[#1c2333]">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-1.5 text-[#8b949e]">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 text-[#484f58]">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm">Enter a URL above and click Scrape to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
