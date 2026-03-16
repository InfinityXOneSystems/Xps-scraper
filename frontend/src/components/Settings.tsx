import { useState } from 'react';

type Section =
  | 'api-keys'
  | 'llm'
  | 'scraper'
  | 'database'
  | 'connectors'
  | 'pages'
  | 'appearance'
  | 'onboarding'
  | 'prompts'
  | 'templates'
  | 'bootstrap';

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'api-keys', label: 'API Keys & Auth', icon: '🔐' },
  { id: 'llm', label: 'LLM Configuration', icon: '🤖' },
  { id: 'scraper', label: 'Scraper Settings', icon: '🔍' },
  { id: 'database', label: 'Database', icon: '🗄️' },
  { id: 'connectors', label: 'Connectors', icon: '🔌' },
  { id: 'pages', label: 'GitHub Pages', icon: '📄' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'onboarding', label: 'Onboarding', icon: '🚀' },
  { id: 'prompts', label: 'Prompt Library', icon: '💬' },
  { id: 'templates', label: 'Template Library', icon: '📋' },
  { id: 'bootstrap', label: 'Bootstrap Library', icon: '⚡' },
];

function useLocalSetting(key: string, defaultVal: string) {
  const [val, setValState] = useState(() => localStorage.getItem(key) ?? defaultVal);
  function setVal(v: string) {
    setValState(v);
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  }
  return [val, setVal] as const;
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="py-3 border-b border-[#1a1a1a] last:border-0">
      <label className="block text-sm text-white mb-1">{label}</label>
      {hint && <p className="text-xs text-[#555] mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] max-w-lg"
    />
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('api-keys');
  const [saved, setSaved] = useState(false);

  // API Keys
  const [groqKey, setGroqKey] = useLocalSetting('xps_groq_key', '');
  const [githubToken, setGithubToken] = useLocalSetting('xps_github_token', '');
  const [railwayToken, setRailwayToken] = useLocalSetting('xps_railway_token', '');
  const [supabaseUrl, setSupabaseUrl] = useLocalSetting('xps_supabase_url', '');
  const [supabaseKey, setSupabaseKey] = useLocalSetting('xps_supabase_key', '');
  const [apiKey, setApiKey] = useLocalSetting('xps_api_key', '');

  // LLM
  const [llmProvider, setLlmProvider] = useLocalSetting('xps_llm_provider', 'groq');
  const [llmModel, setLlmModel] = useLocalSetting('xps_llm_model', 'llama-3.3-70b-versatile');
  const [llmTemp, setLlmTemp] = useLocalSetting('xps_llm_temp', '0.3');
  const [llmMaxTokens, setLlmMaxTokens] = useLocalSetting('xps_llm_max_tokens', '1024');

  // Scraper
  const [scraperEngine, setScraperEngine] = useLocalSetting('xps_scraper_engine', 'cheerio');
  const [scraperTimeout, setScraperTimeout] = useLocalSetting('xps_scraper_timeout', '10000');
  const [scraperParallel, setScraperParallel] = useLocalSetting('xps_scraper_parallel', '3');
  const [userAgent, setUserAgent] = useLocalSetting('xps_user_agent', 'XPSShadowScraper/2.0');

  // Database
  const [dbUrl, setDbUrl] = useLocalSetting('xps_db_url', '');
  const [redisUrl, setRedisUrl] = useLocalSetting('xps_redis_url', '');

  // GitHub Pages
  const [pagesRepo, setPagesRepo] = useLocalSetting('xps_pages_repo', '');
  const [pagesBranch, setPagesBranch] = useLocalSetting('xps_pages_branch', 'gh-pages');
  const [pagesDomain, setPagesDomain] = useLocalSetting('xps_pages_domain', '');

  // Prompts
  const [prompts, setPromptsState] = useState<Array<{ id: string; name: string; content: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('xps_prompts') ?? '[]'); } catch { return []; }
  });
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  function saveAll() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addPrompt() {
    if (!newPromptName || !newPromptContent) return;
    const updated = [...prompts, { id: Math.random().toString(36).slice(2), name: newPromptName, content: newPromptContent }];
    setPromptsState(updated);
    localStorage.setItem('xps_prompts', JSON.stringify(updated));
    setNewPromptName('');
    setNewPromptContent('');
  }

  function removePrompt(id: string) {
    const updated = prompts.filter((p) => p.id !== id);
    setPromptsState(updated);
    localStorage.setItem('xps_prompts', JSON.stringify(updated));
  }

  const GROQ_MODELS = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'llama3-70b-8192'];
  const OLLAMA_MODELS = ['llama3.2', 'mistral', 'codellama', 'llama2'];

  return (
    <div className="h-full flex overflow-hidden bg-[#0a0a0a]">
      {/* Section sidebar */}
      <div className="w-52 border-r border-[#2a2a2a] flex flex-col bg-[#0d0d0d] flex-shrink-0">
        <div className="px-3 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-base font-bold gold-text">Settings</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                activeSection === s.id
                  ? 'gold-card text-[#ffd700]'
                  : 'text-[#666] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <span className="text-base flex-shrink-0">{s.icon}</span>
              <span className="truncate text-xs">{s.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 max-w-2xl">
          {/* Save button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">{SECTIONS.find((s) => s.id === activeSection)?.icon} {SECTIONS.find((s) => s.id === activeSection)?.label}</h3>
            </div>
            <button onClick={saveAll} className={`px-4 py-2 rounded-lg text-sm transition-all ${saved ? 'bg-green-700 text-white' : 'gold-button'}`}>
              {saved ? '✅ Saved!' : '💾 Save Changes'}
            </button>
          </div>

          {activeSection === 'api-keys' && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-2">
              <FieldRow label="XPS Backend API Key" hint="Sent as X-API-Key header to the backend">
                <TextInput value={apiKey} onChange={setApiKey} placeholder="sk-…" type="password" />
              </FieldRow>
              <FieldRow label="Groq API Key" hint="Used for Groq LLM provider">
                <TextInput value={groqKey} onChange={setGroqKey} placeholder="gsk_…" type="password" />
              </FieldRow>
              <FieldRow label="GitHub Token" hint="For Sandbox and GitHub Repos features (repo scope required)">
                <TextInput value={githubToken} onChange={setGithubToken} placeholder="ghp_…" type="password" />
              </FieldRow>
              <FieldRow label="Railway Token" hint="For Railway deployments">
                <TextInput value={railwayToken} onChange={setRailwayToken} placeholder="railway_…" type="password" />
              </FieldRow>
              <FieldRow label="Supabase URL">
                <TextInput value={supabaseUrl} onChange={setSupabaseUrl} placeholder="https://xxx.supabase.co" />
              </FieldRow>
              <FieldRow label="Supabase Anon Key" hint="Public anon key for Supabase client">
                <TextInput value={supabaseKey} onChange={setSupabaseKey} placeholder="eyJhbGci…" type="password" />
              </FieldRow>
            </div>
          )}

          {activeSection === 'llm' && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-2">
              <FieldRow label="Provider">
                <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37] max-w-lg w-full">
                  <option value="groq">Groq</option>
                  <option value="ollama">Ollama (local)</option>
                  <option value="openai">OpenAI</option>
                </select>
              </FieldRow>
              <FieldRow label="Model">
                <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37] max-w-lg w-full">
                  {(llmProvider === 'ollama' ? OLLAMA_MODELS : GROQ_MODELS).map((m) => <option key={m}>{m}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Temperature (0.0 – 1.0)" hint="Lower = more deterministic, higher = more creative">
                <div className="flex items-center gap-3 max-w-lg">
                  <input type="range" min="0" max="1" step="0.05" value={llmTemp} onChange={(e) => setLlmTemp(e.target.value)} className="flex-1 accent-yellow-500" />
                  <span className="text-sm text-white w-10 text-right">{llmTemp}</span>
                </div>
              </FieldRow>
              <FieldRow label="Max Tokens">
                <TextInput value={llmMaxTokens} onChange={setLlmMaxTokens} placeholder="1024" type="number" />
              </FieldRow>
            </div>
          )}

          {activeSection === 'scraper' && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-2">
              <FieldRow label="Default Engine">
                <select value={scraperEngine} onChange={(e) => setScraperEngine(e.target.value)} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37] max-w-lg w-full">
                  <option value="cheerio">Cheerio (fast, static HTML)</option>
                  <option value="playwright">Playwright (JS-rendered)</option>
                  <option value="selenium">Selenium</option>
                  <option value="steel">Steel Browser</option>
                </select>
              </FieldRow>
              <FieldRow label="Timeout (ms)" hint="Request timeout in milliseconds">
                <TextInput value={scraperTimeout} onChange={setScraperTimeout} placeholder="10000" type="number" />
              </FieldRow>
              <FieldRow label="Parallel Instances" hint="Number of concurrent scrape requests">
                <TextInput value={scraperParallel} onChange={setScraperParallel} placeholder="3" type="number" />
              </FieldRow>
              <FieldRow label="User Agent">
                <TextInput value={userAgent} onChange={setUserAgent} placeholder="Mozilla/5.0…" />
              </FieldRow>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-2">
              <FieldRow label="PostgreSQL URL" hint="DATABASE_URL for Railway/Supabase Postgres">
                <TextInput value={dbUrl} onChange={setDbUrl} placeholder="postgresql://user:pass@host/db" type="password" />
              </FieldRow>
              <FieldRow label="Redis URL" hint="REDIS_URL for caching">
                <TextInput value={redisUrl} onChange={setRedisUrl} placeholder="redis://localhost:6379" />
              </FieldRow>
            </div>
          )}

          {activeSection === 'connectors' && (
            <div className="space-y-4">
              {[
                { name: 'GitHub OAuth', icon: '🐙', desc: 'Connect GitHub account for Sandbox and Repos features', connected: !!githubToken },
                { name: 'Railway', icon: '🚂', desc: 'Deploy backend and frontend to Railway', connected: !!railwayToken },
                { name: 'Supabase', icon: '⚡', desc: 'Connect Supabase for persistent storage', connected: !!supabaseUrl },
              ].map((c) => (
                <div key={c.name} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{c.name}</div>
                      <div className="text-xs text-[#666]">{c.desc}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.connected ? 'bg-green-900/40 text-green-400' : 'bg-[#222] text-[#555]'}`}>
                    {c.connected ? '✅ Connected' : 'Not connected'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-[#555]">Set tokens in API Keys section to connect these services.</p>
            </div>
          )}

          {activeSection === 'pages' && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-2">
              <FieldRow label="Repository (owner/repo)" hint="GitHub repository for Pages deployment">
                <TextInput value={pagesRepo} onChange={setPagesRepo} placeholder="username/xps-scraper" />
              </FieldRow>
              <FieldRow label="Deploy Branch">
                <TextInput value={pagesBranch} onChange={setPagesBranch} placeholder="gh-pages" />
              </FieldRow>
              <FieldRow label="Custom Domain (optional)">
                <TextInput value={pagesDomain} onChange={setPagesDomain} placeholder="scraper.example.com" />
              </FieldRow>
              <div className="py-3">
                <div className="text-xs text-[#555]">GitHub Pages workflow is at <code className="text-[#d4af37]">.github/workflows/pages.yml</code>. Push to main to deploy.</div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-2">
              <FieldRow label="Theme" hint="Dark mode is primary">
                <div className="flex gap-3">
                  {['Dark (Black)', 'Dark (Midnight)', 'Light'].map((t) => (
                    <button key={t} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${t === 'Dark (Black)' ? 'border-[#d4af37] text-[#ffd700]' : 'border-[#2a2a2a] text-[#666] hover:text-white'}`}>{t}</button>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Accent Color">
                <div className="flex gap-2">
                  {['#d4af37', '#58a6ff', '#22c55e', '#ec4899', '#8b5cf6'].map((c) => (
                    <button key={c} className="w-7 h-7 rounded-full border-2 border-[#2a2a2a] hover:border-white transition-all" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Font">
                <select className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37] max-w-lg w-full">
                  <option>System Default</option>
                  <option>Inter</option>
                  <option>JetBrains Mono</option>
                  <option>Fira Code</option>
                </select>
              </FieldRow>
            </div>
          )}

          {activeSection === 'onboarding' && (
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[#d4af37] mb-3">🖥️ Local Development Setup</h4>
                <div className="space-y-2 text-xs text-[#888]">
                  {[
                    'Clone the repository: git clone <repo-url>',
                    'Install backend: cd backend && npm install',
                    'Install frontend: cd frontend && npm install',
                    'Copy .env.example to .env and fill in values',
                    'Start backend: cd backend && npm run dev',
                    'Start frontend: cd frontend && npm run dev',
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[#d4af37] font-bold flex-shrink-0">{i + 1}.</span>
                      <code className="text-[#aaa]">{step}</code>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[#d4af37] mb-3">🚂 Railway Deployment</h4>
                <div className="space-y-2 text-xs text-[#888]">
                  {[
                    'Install Railway CLI: npm i -g @railway/cli',
                    'Login: railway login',
                    'Create project: railway init',
                    'Set environment variables in Railway dashboard',
                    'Deploy: railway up',
                    'Copy backend URL to VITE_API_URL in frontend env',
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[#d4af37] font-bold flex-shrink-0">{i + 1}.</span>
                      <code className="text-[#aaa]">{step}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'prompts' && (
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-medium text-white">Add New Prompt</h4>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Prompt Name</label>
                  <input type="text" value={newPromptName} onChange={(e) => setNewPromptName(e.target.value)} placeholder="e.g. Web Scraper Agent" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Prompt Content</label>
                  <textarea value={newPromptContent} onChange={(e) => setNewPromptContent(e.target.value)} rows={4} placeholder="You are a…" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] resize-none" />
                </div>
                <button onClick={addPrompt} disabled={!newPromptName || !newPromptContent} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">Add Prompt</button>
              </div>
              {prompts.map((p) => (
                <div key={p.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium text-[#ffd700]">{p.name}</div>
                    <button onClick={() => removePrompt(p.id)} className="text-[#444] hover:text-red-400 text-sm">🗑️</button>
                  </div>
                  <pre className="text-xs text-[#666] mt-2 whitespace-pre-wrap line-clamp-3">{p.content}</pre>
                </div>
              ))}
            </div>
          )}

          {(activeSection === 'templates' || activeSection === 'bootstrap') && (
            <div className="space-y-4">
              {[
                { name: 'Lead Generation Pipeline', desc: 'Scrape → Filter → Save to CRM → Send Email', icon: '🎯' },
                { name: 'API Key Harvester', desc: 'Scrape URL → Harvest Keys → Export', icon: '🔑' },
                { name: 'GitHub Repo Analyzer', desc: 'Search Repos → LLM Analysis → Save Results', icon: '🐙' },
                { name: 'Email Outreach Campaign', desc: 'Import Contacts → Generate Emails → Schedule Send', icon: '📧' },
              ].map((t) => (
                <div key={t.name} className="gold-card rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs text-[#666]">{t.desc}</div>
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-[#ffd700] hover:border-[#d4af37] rounded-lg transition-all">
                    Use
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
