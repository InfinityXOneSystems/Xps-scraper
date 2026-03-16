import { useState, useRef } from 'react';
import { scrapeUrl } from '../api';
import type { ScrapeResult } from '../types';

type DistillMode = 'summarize' | 'extract_facts' | 'key_insights' | 'q_and_a' | 'compare' | 'sentiment' | 'topics';
type OutputFormat = 'markdown' | 'bullets' | 'json' | 'table';

interface DistillJob {
  id: string;
  url?: string;
  text?: string;
  mode: DistillMode;
  result: string;
  timestamp: string;
  tokens?: number;
}

const MODES: Array<{ id: DistillMode; label: string; icon: string; desc: string; prompt: string }> = [
  {
    id: 'summarize',
    label: 'Summarize',
    icon: '📋',
    desc: 'Condense content to key points',
    prompt: 'Please provide a concise, well-structured summary of the following content. Include: 1) Main topic 2) Key points (3-5 bullets) 3) Important conclusions.',
  },
  {
    id: 'extract_facts',
    label: 'Extract Facts',
    icon: '🔬',
    desc: 'Pull out verifiable facts and data',
    prompt: 'Extract all verifiable facts, statistics, dates, names, and data points from the following content. Format as a numbered list with each fact on its own line.',
  },
  {
    id: 'key_insights',
    label: 'Key Insights',
    icon: '💡',
    desc: 'Distill the most valuable insights',
    prompt: 'Identify and explain the 5 most valuable insights from the following content. For each insight, explain why it matters and what action it suggests.',
  },
  {
    id: 'q_and_a',
    label: 'Q&A Generation',
    icon: '❓',
    desc: 'Generate questions and answers',
    prompt: 'Generate 10 insightful questions and answers based on the following content. Format as Q: [question] A: [answer]',
  },
  {
    id: 'compare',
    label: 'Comparative Analysis',
    icon: '⚖️',
    desc: 'Compare and contrast elements',
    prompt: 'Perform a comparative analysis of the entities, ideas, or approaches mentioned in the following content. Create a structured comparison with pros/cons or similarities/differences.',
  },
  {
    id: 'sentiment',
    label: 'Sentiment Analysis',
    icon: '🎭',
    desc: 'Analyze tone and sentiment',
    prompt: 'Analyze the sentiment and tone of the following content. Identify: 1) Overall sentiment (positive/negative/neutral with score 0-100) 2) Key emotional themes 3) Bias indicators 4) Target audience',
  },
  {
    id: 'topics',
    label: 'Topic Modeling',
    icon: '🗂️',
    desc: 'Identify and cluster topics',
    prompt: 'Identify all major topics and subtopics in the following content. Create a hierarchical topic map with 3-5 main categories and their sub-topics. For each topic, list relevant keywords.',
  },
];

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function distillWithLLM(text: string, mode: DistillMode, format: OutputFormat): Promise<{ result: string; tokens?: number }> {
  const modeConfig = MODES.find((m) => m.id === mode)!;
  const formatInstruction = format === 'json'
    ? ' Return the result as valid JSON.'
    : format === 'table'
    ? ' Format the result as a markdown table where appropriate.'
    : format === 'bullets'
    ? ' Format as bullet points.'
    : ' Use markdown formatting with headers and bullets.';

  const prompt = `${modeConfig.prompt}${formatInstruction}\n\n---CONTENT START---\n${text.substring(0, MAX_DISTILLATION_INPUT_LENGTH)}\n---CONTENT END---`;

  const response = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      conversationId: `distill_${Date.now()}`,
    }),
  });

  if (!response.ok) throw new Error(`LLM request failed: ${response.status}`);
  const data = await response.json() as { reply?: string; message?: string };
  return { result: data.reply ?? data.message ?? 'No response' };
}

const MAX_DISTILLATION_INPUT_LENGTH = 8000;
const SAVED_KEY = 'xps_distillation_history';
function loadHistory(): DistillJob[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); } catch { return []; }
}

export default function Distillation() {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState<DistillMode>('key_insights');
  const [format, setFormat] = useState<OutputFormat>('markdown');
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<DistillJob[]>(loadHistory);
  const [activeView, setActiveView] = useState<'distill' | 'history'>('distill');
  const [scrapedTitle, setScrapedTitle] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function handleScrapeAndDistill() {
    if (!url) return;
    setScraping(true);
    setError('');
    setResult('');
    try {
      const scraped: ScrapeResult = await scrapeUrl(url);
      setScrapedTitle(scraped.title ?? url);
      const text = scraped.text ?? '';
      if (!text) { setError('No text content found at that URL'); return; }
      await doDistill(text, url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScraping(false);
    }
  }

  async function doDistill(text: string, sourceUrl?: string) {
    setLoading(true);
    setError('');
    abortRef.current = new AbortController();
    try {
      const { result: res } = await distillWithLLM(text, mode, format);
      setResult(res);
      const job: DistillJob = {
        id: crypto.randomUUID(),
        url: sourceUrl,
        text: text.substring(0, 200) + '…',
        mode,
        result: res,
        timestamp: new Date().toISOString(),
      };
      const updated = [job, ...history].slice(0, 50);
      setHistory(updated);
      localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">Knowledge Distillation</h2>
          <p className="text-[#666] text-xs mt-0.5">AI-powered content extraction, summarization & analysis</p>
        </div>
        <div className="flex gap-2">
          {(['distill', 'history'] as const).map((v) => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all capitalize ${activeView === v ? 'gold-button border-transparent' : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:text-white'}`}>
              {v === 'history' ? `History (${history.length})` : '🧪 Distill'}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'distill' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-5">

            {/* Input */}
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex gap-2 mb-4">
                <button onClick={() => setInputMode('url')}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${inputMode === 'url' ? 'gold-button border-transparent' : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888]'}`}>
                  🌐 From URL
                </button>
                <button onClick={() => setInputMode('text')}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${inputMode === 'text' ? 'gold-button border-transparent' : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888]'}`}>
                  📝 Paste Text
                </button>
              </div>

              {inputMode === 'url' ? (
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    onKeyDown={(e) => e.key === 'Enter' && handleScrapeAndDistill()}
                    className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]"
                  />
                  <button onClick={handleScrapeAndDistill} disabled={scraping || loading || !url}
                    className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">
                    {scraping ? '🔄 Scraping…' : loading ? '⚡ Distilling…' : '🚀 Scrape & Distill'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={6}
                    placeholder="Paste your text content here…"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#555]">{textInput.length} chars</span>
                    <button onClick={() => doDistill(textInput)} disabled={loading || !textInput}
                      className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                      {loading ? '⚡ Distilling…' : '⚡ Distill Text'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mode & Format selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                <div className="text-xs text-[#888] font-semibold uppercase tracking-wider mb-3">Distillation Mode</div>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map((m) => (
                    <button key={m.id} onClick={() => setMode(m.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${mode === m.id ? 'gold-card text-[#ffd700]' : 'bg-[#0a0a0a] border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#555]'}`}>
                      <span className="text-base">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                <div className="text-xs text-[#888] font-semibold uppercase tracking-wider mb-3">Output Format</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['markdown', 'bullets', 'json', 'table'] as OutputFormat[]).map((f) => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all uppercase ${format === f ? 'gold-button' : 'bg-[#0a0a0a] border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#555]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-xs text-[#555] bg-[#0a0a0a] p-3 rounded-lg border border-[#1a1a1a]">
                  <span className="text-[#d4af37]">{currentMode.icon} {currentMode.label}:</span> {currentMode.desc}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 text-sm text-red-400">
                ❌ {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <span>{currentMode.icon}</span>
                    <span className="text-sm font-semibold text-white">{currentMode.label}</span>
                    {scrapedTitle && <span className="text-xs text-[#555]">— {scrapedTitle}</span>}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg hover:border-[#555] transition-all">
                    📋 Copy
                  </button>
                </div>
                <div className="p-5">
                  <pre className="text-sm text-[#ccc] whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
                </div>
              </div>
            )}

            {(scraping || loading) && !result && (
              <div className="flex flex-col items-center justify-center py-12 text-[#555]">
                <div className="text-4xl mb-3 animate-spin">⚡</div>
                <div className="text-sm">{scraping ? 'Scraping page content…' : 'Running distillation…'}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-[#555] py-16">No distillation history yet</div>
            ) : history.map((job) => {
              const m = MODES.find((md) => md.id === job.mode);
              return (
                <div key={job.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] cursor-pointer"
                    onClick={() => { setResult(job.result); setMode(job.mode); setActiveView('distill'); }}>
                    <div className="flex items-center gap-2">
                      <span>{m?.icon}</span>
                      <div>
                        <span className="text-xs font-medium text-white">{m?.label}</span>
                        {job.url && <span className="ml-2 text-xs text-[#555] font-mono truncate max-w-xs inline-block">{job.url}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#444]">{new Date(job.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-3">
                    <pre className="text-xs text-[#666] whitespace-pre-wrap line-clamp-3">{job.result}</pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
