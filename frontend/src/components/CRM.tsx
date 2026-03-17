import { useState, useEffect } from 'react';
import { getContacts, createContact, updateContact, deleteContact, syncContactToHubSpot } from '../api';
import type { Contact, ContactStatus } from '../types';

const STATUS_OPTIONS: ContactStatus[] = ['Lead', 'Prospect', 'Customer', 'Inactive'];

function statusClass(s: ContactStatus) {
  const map: Record<ContactStatus, string> = {
    Lead: 'badge-lead',
    Prospect: 'badge-prospect',
    Customer: 'badge-customer',
    Inactive: 'badge-inactive',
  };
  return `text-xs px-2 py-0.5 rounded-full font-medium ${map[s]}`;
}

const EMPTY: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', email: '', company: '', status: 'Lead', phone: '', notes: '',
};

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleHubSpotSync(c: Contact) {
    setSyncingId(c.id);
    try {
      await syncContactToHubSpot({ name: c.name, email: c.email, company: c.company, phone: c.phone });
      showToast(`${c.name} synced to HubSpot`, true);
    } catch {
      showToast('HubSpot sync failed', false);
    } finally {
      setSyncingId(null);
    }
  }

  async function load() {
    try {
      setLoading(true);
      const data = await getContacts();
      setContacts(data);
    } catch {
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = contacts.filter((c) => {
    const matchSearch = !search || [c.name, c.email, c.company].some((f) =>
      f.toLowerCase().includes(search.toLowerCase()),
    );
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, email: c.email, company: c.company, status: c.status, phone: c.phone ?? '', notes: c.notes ?? '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateContact(editing.id, form);
        setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      } else {
        const created = await createContact(form);
        setContacts((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch {
      setError('Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return;
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete contact');
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.ok ? 'bg-green-900/80 text-green-300 border border-green-700' : 'bg-red-900/80 text-red-300 border border-red-700'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">CRM Contacts</h2>
          <p className="text-[#666] text-xs mt-0.5">{contacts.length} total contacts</p>
        </div>
        <button onClick={openNew} className="gold-button px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <span>+</span> Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center gap-3 flex-shrink-0 flex-wrap">
        <input
          type="text"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] w-56"
        />
        <div className="flex gap-2">
          {(['All', ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-[#d4af37] text-black'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/40 text-red-400 rounded-lg text-sm">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#555]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#555]">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-sm">No contacts found</div>
            <button onClick={openNew} className="mt-3 text-xs text-[#d4af37] hover:underline">Add your first contact</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Name', 'Email', 'Company', 'Status', 'Last Contact', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-[#666] font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                  <td className="py-3 px-3 font-medium text-white">{c.name}</td>
                  <td className="py-3 px-3 text-[#888]">{c.email}</td>
                  <td className="py-3 px-3 text-[#888]">{c.company || '—'}</td>
                  <td className="py-3 px-3">
                    <span className={statusClass(c.status)}>{c.status}</span>
                  </td>
                  <td className="py-3 px-3 text-[#555] text-xs">
                    {c.lastContact ? new Date(c.lastContact).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs text-[#888] hover:text-[#ffd700] transition-colors">✏️</button>
                      <button onClick={() => handleHubSpotSync(c)} disabled={syncingId === c.id} className="text-xs text-[#888] hover:text-orange-400 transition-colors disabled:opacity-50" title="Sync to HubSpot">
                        {syncingId === c.id ? '⏳' : '🟠'}
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-[#888] hover:text-red-400 transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 gold-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold gold-text mb-4">{editing ? 'Edit Contact' : 'New Contact'}</h3>

            <div className="space-y-3">
              {[
                { key: 'name', label: 'Name *', type: 'text', placeholder: 'Full name' },
                { key: 'email', label: 'Email *', type: 'email', placeholder: 'email@example.com' },
                { key: 'company', label: 'Company', type: 'text', placeholder: 'Company name' },
                { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 555-0100' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-[#888] mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-[#888] mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContactStatus }))}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Additional notes…"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#888] hover:text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
