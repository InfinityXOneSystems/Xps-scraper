import { useState, useEffect } from 'react';
import { getHubSpotStatus, getHubSpotContacts, createHubSpotContact, getHubSpotDeals } from '../api';

interface HsContact {
  id: string;
  properties: Record<string, string | null>;
}

interface HsDeal {
  id: string;
  properties: Record<string, string | null>;
}

export default function HubSpot() {
  const [configured, setConfigured] = useState(false);
  const [portalId, setPortalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'contacts' | 'deals'>('contacts');
  const [contacts, setContacts] = useState<HsContact[]>([]);
  const [deals, setDeals] = useState<HsDeal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', firstname: '', lastname: '', phone: '', company: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await getHubSpotStatus();
        setConfigured(s.configured);
        setPortalId(s.portalId);
        if (s.configured) {
          const [c, d] = await Promise.allSettled([getHubSpotContacts(), getHubSpotDeals()]);
          if (c.status === 'fulfilled') setContacts((c.value as { results: HsContact[] }).results ?? []);
          if (d.status === 'fulfilled') setDeals((d.value as { results: HsDeal[] }).results ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateContact() {
    if (!form.email) return;
    setSaving(true); setError('');
    try {
      const c = await createHubSpotContact(form) as HsContact;
      setContacts((p) => [c, ...p]);
      setShowForm(false);
      setForm({ email: '', firstname: '', lastname: '', phone: '', company: '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-[#0a0a0a] text-[#555] animate-pulse">Loading HubSpot…</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">HubSpot CRM</h2>
          {portalId && <p className="text-[#666] text-xs mt-0.5">Portal ID: {portalId}</p>}
        </div>
        <div className="flex items-center gap-3">
          {configured && (
            <button onClick={() => setShowForm(true)}
              className="gold-button px-3 py-1.5 text-xs rounded-lg">
              + Contact
            </button>
          )}
          <span className={`text-xs px-3 py-1.5 rounded-full ${configured ? 'bg-orange-900/20 text-orange-400 border border-orange-700/30' : 'bg-[#222] text-[#555] border border-[#333]'}`}>
            {configured ? '🟠 HubSpot' : 'Not configured'}
          </span>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-[#2a2a2a] flex gap-4 flex-shrink-0">
        {(['contacts', 'deals'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm pb-2 border-b-2 transition-all capitalize ${tab === t ? 'border-[#d4af37] text-[#ffd700]' : 'border-transparent text-[#666] hover:text-white'}`}>
            {t} ({t === 'contacts' ? contacts.length : deals.length})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!configured ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-4xl mb-3">🟠</div>
            <h3 className="text-white font-semibold mb-1">HubSpot not configured</h3>
            <p className="text-[#555] text-sm mb-3">Add HUBSPOT_ACCESS_TOKEN to your .env file</p>
            <a href="https://developers.hubspot.com/docs/api/private-apps" target="_blank" rel="noopener noreferrer"
               className="text-[#d4af37] text-xs hover:underline">Create a private app ↗</a>
          </div>
        ) : tab === 'contacts' ? (
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <div className="text-center text-[#555] py-12">No contacts found in HubSpot</div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-orange-900/30 border border-orange-700/30 flex items-center justify-center text-sm font-bold text-orange-400 flex-shrink-0">
                    {(c.properties.firstname ?? c.properties.email ?? '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {[c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || '(No name)'}
                    </div>
                    <div className="text-xs text-[#666]">{c.properties.email ?? 'No email'}</div>
                    {c.properties.company && <div className="text-xs text-[#555]">{c.properties.company}</div>}
                  </div>
                  {c.properties.phone && (
                    <span className="text-xs text-[#888] font-mono">{c.properties.phone}</span>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {deals.length === 0 ? (
              <div className="text-center text-[#555] py-12">No deals found in HubSpot</div>
            ) : (
              deals.map((d) => (
                <div key={d.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{d.properties.dealname ?? '(Unnamed deal)'}</div>
                      <div className="text-xs text-[#666] mt-0.5">{d.properties.dealstage ?? 'Unknown stage'}</div>
                    </div>
                    {d.properties.amount && (
                      <div className="text-white font-semibold">${parseFloat(d.properties.amount).toLocaleString()}</div>
                    )}
                  </div>
                  {d.properties.closedate && (
                    <div className="text-[10px] text-[#555] mt-1">Closes: {new Date(d.properties.closedate).toLocaleDateString()}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold gold-text mb-4">New HubSpot Contact</h3>
            <div className="space-y-3">
              {[
                { key: 'email', label: 'Email *', placeholder: 'contact@example.com' },
                { key: 'firstname', label: 'First Name', placeholder: 'John' },
                { key: 'lastname', label: 'Last Name', placeholder: 'Doe' },
                { key: 'phone', label: 'Phone', placeholder: '+1XXXXXXXXXX' },
                { key: 'company', label: 'Company', placeholder: 'ACME Corp' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-[#888] mb-1">{f.label}</label>
                  <input type={f.key === 'email' ? 'email' : 'text'}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]" />
                </div>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#888] bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">Cancel</button>
              <button onClick={handleCreateContact} disabled={saving || !form.email} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Creating…' : 'Create in HubSpot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
