import { useState, useEffect } from 'react';
import { getContacts, getLeads, getKeys, healthCheck, getServicesHealth } from '../api';
import type { ServicesHealthResponse } from '../api';
import type { Tab } from '../types';

interface DashboardProps {
  onTabChange: (tab: Tab) => void;
}

interface Metric {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

interface ActivityItem {
  id: number;
  icon: string;
  text: string;
  time: string;
}

export default function Dashboard({ onTabChange }: DashboardProps) {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'Active Workflows', value: '—', icon: '🔄' },
    { label: 'Scraped Today', value: '—', icon: '🔍' },
    { label: 'Leads in CRM', value: '—', icon: '🎯' },
    { label: 'API Keys Harvested', value: '—', icon: '🔑' },
  ]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [health, setHealth] = useState<'ok' | 'error' | 'loading'>('loading');
  const [services, setServices] = useState<ServicesHealthResponse['services'] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await healthCheck();
        setHealth('ok');
      } catch {
        setHealth('error');
      }

      // Load live service statuses
      try {
        const svcHealth = await getServicesHealth();
        setServices(svcHealth.services);
      } catch {
        // Services health non-critical; leave as null
      }

      const results = await Promise.allSettled([
        getLeads(),
        getContacts(),
        getKeys(),
      ]);

      const leadsCount = results[0].status === 'fulfilled' ? results[0].value.length : 0;
      const contactsCount = results[1].status === 'fulfilled' ? results[1].value.length : 0;
      const keysCount = results[2].status === 'fulfilled' ? results[2].value.length : 0;

      setMetrics([
        { label: 'Active Workflows', value: 0, icon: '🔄', trend: '+0 today', trendUp: true },
        { label: 'Scraped Today', value: 0, icon: '🔍', trend: '0 pages', trendUp: true },
        { label: 'Total Leads', value: leadsCount, icon: '🎯', trend: `${contactsCount} contacts`, trendUp: true },
        { label: 'API Keys Harvested', value: keysCount, icon: '🔑', trend: 'all time', trendUp: false },
      ]);

      setActivity([
        { id: 1, icon: '✅', text: 'Backend API connected successfully', time: 'just now' },
        { id: 2, icon: '🕷️', text: 'XPS Shadow Scraper initialized', time: '1m ago' },
        { id: 3, icon: '🔑', text: `${keysCount} API keys in store`, time: '1m ago' },
        { id: 4, icon: '👥', text: `${contactsCount} contacts in CRM`, time: '1m ago' },
      ]);
    }
    load();
  }, []);

  const quickActions: Array<{ label: string; icon: string; tab: Tab; desc: string }> = [
    { label: 'New Scrape', icon: '🔍', tab: 'scrape', desc: 'Start scraping a URL' },
    { label: 'Chat Agent', icon: '💬', tab: 'chat', desc: 'Talk to AI agent' },
    { label: 'Add Lead', icon: '🎯', tab: 'leads', desc: 'Add a new lead' },
    { label: 'Build Workflow', icon: '🔄', tab: 'workflows', desc: 'Create automation' },
    { label: 'Browse Repos', icon: '🐙', tab: 'repos', desc: 'Find GitHub repos' },
    { label: 'Settings', icon: '⚙️', tab: 'settings', desc: 'Configure platform' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#0a0a0a]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold gold-text mb-1">XPS Shadow Dashboard</h1>
        <p className="text-[#666] text-sm">Enterprise-grade scraping & lead intelligence platform</p>
      </div>

      {/* Health Banner */}
      <div className={`mb-6 px-4 py-3 rounded-lg border text-sm flex items-center gap-2 ${
        health === 'ok'
          ? 'bg-green-900/20 border-green-700/40 text-green-400'
          : health === 'error'
          ? 'bg-red-900/20 border-red-700/40 text-red-400'
          : 'bg-yellow-900/20 border-yellow-700/40 text-yellow-400'
      }`}>
        <span>{health === 'ok' ? '✅' : health === 'error' ? '❌' : '⏳'}</span>
        <span>
          {health === 'ok'
            ? 'All systems operational — Backend connected'
            : health === 'error'
            ? 'Backend offline — Running in disconnected mode'
            : 'Connecting to backend…'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={i} className="gold-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{m.icon}</span>
              {m.trend && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  m.trendUp ? 'bg-green-900/30 text-green-400' : 'bg-[#222] text-[#666]'
                }`}>
                  {m.trend}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{m.value}</div>
            <div className="text-[#888] text-xs">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.tab}
                onClick={() => onTabChange(a.tab)}
                className="flex items-start gap-3 p-4 bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#d4af37] rounded-xl text-left transition-all group"
              >
                <span className="text-xl mt-0.5">{a.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-[#ffd700] transition-colors">
                    {a.label}
                  </div>
                  <div className="text-xs text-[#666] mt-0.5">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Recent Activity</h2>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
            {activity.length === 0 ? (
              <div className="p-6 text-center text-[#555] text-sm">No recent activity</div>
            ) : (
              activity.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm ${
                    i < activity.length - 1 ? 'border-b border-[#1a1a1a]' : ''
                  }`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#ccc] truncate">{item.text}</div>
                    <div className="text-[#555] text-xs mt-0.5">{item.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-6 bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">System Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'API Backend', status: health === 'ok', loading: health === 'loading' },
            { name: 'LLM Service', status: !!services?.llm?.configured, loading: !services },
            { name: 'Scraper Engine', status: health === 'ok', loading: health === 'loading' },
            { name: 'Database', status: !!services?.database?.connected, loading: !services },
            { name: 'Redis Cache', status: !!services?.redis?.connected, loading: !services },
            { name: 'Firecrawl', status: !!services?.firecrawl?.configured, loading: !services },
            { name: 'Twilio SMS', status: !!services?.twilio?.configured, loading: !services },
            { name: 'Stripe Payments', status: !!services?.stripe?.configured, loading: !services },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                s.loading ? 'bg-yellow-600 animate-pulse' : s.status ? 'bg-green-500' : 'bg-[#333]'
              }`} />
              <span className="text-xs text-[#888]">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
