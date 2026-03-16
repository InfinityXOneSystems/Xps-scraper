import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { healthCheck } from '../api';
import type { Tab } from '../types';

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'chat', label: 'Chat Agent', icon: '💬' },
  { id: 'scrape', label: 'Scraper', icon: '🔍' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'leads', label: 'Leads', icon: '🎯' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'workflows', label: 'Workflows', icon: '🔄' },
  { id: 'repos', label: 'GitHub Repos', icon: '🐙' },
  { id: 'sandbox', label: 'Sandbox', icon: '🧪' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState(3);
  const [darkMode] = useState(true);

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

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''} bg-[#0a0a0a] text-white`}>
      {/* ── Left Sidebar ── */}
      <aside
        className={`flex flex-col bg-[#111111] border-r border-[#2a2a2a] sidebar-transition flex-shrink-0 z-20 ${
          sidebarOpen ? 'w-60' : 'w-[60px]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-[#2a2a2a] flex-shrink-0">
          <span className="text-2xl flex-shrink-0">🕷️</span>
          {sidebarOpen && (
            <span className="text-sm font-bold gold-text truncate">XPS Shadow</span>
          )}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="ml-auto text-[#666] hover:text-white transition-colors text-xs"
            title="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'gold-card text-[#ffd700]'
                  : 'text-[#888] hover:bg-[#1a1a1a] hover:text-white'
              }`}
              title={item.label}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#2a2a2a] flex-shrink-0">
          {sidebarOpen ? (
            <div className="text-xs text-[#555] text-center">XPS Shadow v2.0</div>
          ) : (
            <div className="text-xs text-[#555] text-center">v2</div>
          )}
        </div>
      </aside>

      {/* ── Center area (header + content) ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top NavBar */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-[#111111] border-b border-[#2a2a2a] flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#888]">
              {currentNav?.icon} <span className="text-white font-medium">{currentNav?.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Health indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[#666] px-2">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  healthy === null ? 'bg-yellow-500' : healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="hidden sm:inline">
                {healthy === null ? 'Connecting…' : healthy ? 'Online' : 'Offline'}
              </span>
            </div>

            <button
              onClick={() => onTabChange('settings')}
              className="p-2 text-[#888] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* ── Right Toolbar ── */}
      <div className="flex flex-col items-center gap-2 w-[52px] bg-[#111111] border-l border-[#2a2a2a] py-3 flex-shrink-0">
        <button
          onClick={() => onTabChange('scrape')}
          className="p-2.5 text-[#666] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
          title="Search / Scrape"
        >
          🔍
        </button>
        <button
          className="p-2.5 text-[#666] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
          title="Analytics"
        >
          📊
        </button>
        <button
          className="p-2.5 text-[#666] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
          title="Theme"
        >
          🌙
        </button>
        <button
          onClick={() => setNotifications(0)}
          className="relative p-2.5 text-[#666] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
          title="Notifications"
        >
          🔔
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-[#d4af37] text-black text-[8px] font-bold rounded-full flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onTabChange('settings')}
          className="p-2.5 text-[#666] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
          title="Profile"
        >
          👤
        </button>
        <button
          className="p-2.5 text-[#666] hover:text-[#ffd700] hover:bg-[#1a1a1a] rounded-lg transition-all"
          title="Help"
        >
          ❓
        </button>
      </div>
    </div>
  );
}
