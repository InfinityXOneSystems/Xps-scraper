import { useState, useEffect, useCallback } from 'react';
import Chat from './components/Chat';
import Scrape from './components/Scrape';
import Keys from './components/Keys';
import { healthCheck } from './api';
import type { Tab } from './types';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'chat',  label: 'Chat',  icon: '💬' },
  { id: 'scrape', label: 'Scrape', icon: '🔍' },
  { id: 'keys',  label: 'Keys',  icon: '🔑' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(
    () => localStorage.getItem('xps_api_key') ?? '',
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      await healthCheck();
      setHealthy(true);
    } catch {
      setHealthy(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30_000);
    return () => clearInterval(id);
  }, [checkHealth]);

  function saveApiKey() {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('xps_api_key', trimmed);
    } else {
      localStorage.removeItem('xps_api_key');
    }
    setShowSettings(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117] text-[#e6edf3]">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col bg-[#161b22] border-r border-[#30363d] transition-all duration-200 ${
          sidebarOpen ? 'w-56' : 'w-14'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-[#30363d]">
          <span className="text-2xl flex-shrink-0">🕷️</span>
          {sidebarOpen && (
            <span className="text-sm font-bold text-[#58a6ff] truncate">
              XPS Shadow
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="ml-auto text-[#8b949e] hover:text-white transition-colors"
            title="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Nav tabs */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1f6feb] text-white'
                  : 'text-[#8b949e] hover:bg-[#1c2333] hover:text-white'
              }`}
              title={tab.label}
            >
              <span className="text-lg flex-shrink-0">{tab.icon}</span>
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Settings button */}
        <div className="p-2 border-t border-[#30363d]">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#8b949e] hover:bg-[#1c2333] hover:text-white transition-all w-full"
            title="API Key Settings"
          >
            <span className="text-lg flex-shrink-0">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#e6edf3]">
              XPS Shadow Scraper
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Health indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  healthy === null
                    ? 'bg-yellow-500'
                    : healthy
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              />
              <span>
                {healthy === null ? 'Connecting…' : healthy ? 'Connected' : 'Offline'}
              </span>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2333] hover:bg-[#30363d] rounded-lg text-xs text-[#8b949e] hover:text-white transition-all border border-[#30363d]"
            >
              <span>🔐</span>
              <span>API Key</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'chat'  && <Chat />}
          {activeTab === 'scrape' && <Scrape />}
          {activeTab === 'keys'  && <Keys />}
        </main>
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <span>⚙️</span> Settings
            </h2>
            <p className="text-[#8b949e] text-sm mb-5">
              Enter your API key to authenticate with the backend. Leave blank for
              development mode (no auth required).
            </p>

            <label className="block text-sm text-[#8b949e] mb-1">
              API Key / Bearer Token
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              placeholder="sk-… or your API key"
              className="w-full bg-[#0f1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] mb-5"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-[#8b949e] hover:text-white bg-transparent hover:bg-[#1c2333] rounded-lg border border-[#30363d] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                className="px-4 py-2 text-sm text-white bg-[#1f6feb] hover:bg-[#388bfd] rounded-lg transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
