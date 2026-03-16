import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { getLeads, createLead, updateLead, deleteLead, syncContactToHubSpot, sendSms } from '../api';
import type { Lead, LeadStage } from '../types';

const STAGES: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

const STAGE_COLORS: Record<LeadStage, string> = {
  New: '#3b82f6',
  Contacted: '#8b5cf6',
  Qualified: '#f59e0b',
  Proposal: '#ec4899',
  Won: '#22c55e',
  Lost: '#6b7280',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="confidence-bar w-full mt-1">
      <div className="confidence-fill" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

function LeadCard({ lead, onEdit, onHubSpotSync, onSms }: { lead: Lead; onEdit: (l: Lead) => void; onHubSpotSync: (l: Lead) => void; onSms: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-30' : 'hover:border-[#d4af37]/40'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="text-sm font-medium text-white truncate flex-1">{lead.name}</div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onEdit(lead)}
          className="text-[#555] hover:text-[#ffd700] ml-2 flex-shrink-0"
        >✏️</button>
      </div>
      <div className="text-xs text-[#666] truncate">{lead.company}</div>
      <div className="text-xs text-[#555] truncate">{lead.email}</div>
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-[#555] mb-0.5">
          <span>Score</span>
          <span>{lead.score}%</span>
        </div>
        <ScoreBar score={lead.score} />
      </div>
      {lead.value !== undefined && (
        <div className="mt-1.5 text-xs text-[#d4af37] font-medium">${lead.value.toLocaleString()}</div>
      )}
      <div className="mt-2 flex gap-1">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onHubSpotSync(lead)}
          className="text-[10px] px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-[#2a2a2a] text-[#888] hover:text-orange-400 hover:border-orange-800 transition-all"
          title="Sync to HubSpot"
        >🟠 HubSpot</button>
        {lead.phone && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSms(lead)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-[#2a2a2a] text-[#888] hover:text-blue-400 hover:border-blue-800 transition-all"
            title="Send SMS"
          >📱 SMS</button>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  onEdit,
  onHubSpotSync,
  onSms,
}: {
  stage: LeadStage;
  leads: Lead[];
  onEdit: (l: Lead) => void;
  onHubSpotSync: (l: Lead) => void;
  onSms: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex flex-col min-w-[200px] w-52 flex-shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: STAGE_COLORS[stage] }}
          />
          <span className="text-xs font-semibold text-[#aaa]">{stage}</span>
        </div>
        <span className="text-xs text-[#555]">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-xl p-2 space-y-2 kanban-col transition-all ${
          isOver ? 'bg-[#d4af37]/5 border border-[#d4af37]/30' : 'bg-[#111] border border-[#1a1a1a]'
        }`}
      >
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} onEdit={onEdit} onHubSpotSync={onHubSpotSync} onSms={onSms} />
        ))}
      </div>
    </div>
  );
}

const EMPTY_LEAD: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', email: '', company: '', stage: 'New', score: 50,
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [smsTarget, setSmsTarget] = useState<Lead | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleHubSpotSync(lead: Lead) {
    try {
      await syncContactToHubSpot({ name: lead.name, email: lead.email, company: lead.company, phone: lead.phone });
      showToast(`${lead.name} synced to HubSpot`, true);
    } catch {
      showToast('HubSpot sync failed', false);
    }
  }

  async function handleSendSms() {
    if (!smsTarget?.phone || !smsMessage) return;
    setSmsSending(true);
    try {
      await sendSms(smsTarget.phone, smsMessage);
      showToast(`SMS sent to ${smsTarget.name}`, true);
      setSmsTarget(null);
      setSmsMessage('');
    } catch {
      showToast('SMS send failed', false);
    } finally {
      setSmsSending(false);
    }
  }
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...EMPTY_LEAD });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    try {
      const data = await getLeads();
      setLeads(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const leadId = active.id as string;
    const newStage = over.id as LeadStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    try {
      await updateLead(leadId, { stage: newStage });
    } catch {
      load();
    }
  }

  const activeLead = leads.find((l) => l.id === activeId);

  function openNew() {
    setEditingLead(null);
    setForm({ ...EMPTY_LEAD });
    setShowForm(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setForm({ name: lead.name, email: lead.email, company: lead.company, stage: lead.stage, score: lead.score, value: lead.value, phone: lead.phone, notes: lead.notes, source: lead.source });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      if (editingLead) {
        const updated = await updateLead(editingLead.id, form);
        setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
      } else {
        const created = await createLead(form);
        setLeads((prev) => [...prev, created]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lead?')) return;
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#555]">Loading leads…</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.ok ? 'bg-green-900/80 text-green-300 border border-green-700' : 'bg-red-900/80 text-red-300 border border-red-700'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">Leads Pipeline</h2>
          <p className="text-[#666] text-xs mt-0.5">{leads.length} leads · Drag cards between columns</p>
        </div>
        <button onClick={openNew} className="gold-button px-4 py-2 rounded-lg text-sm">+ Add Lead</button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full pb-2">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={leads.filter((l) => l.stage === stage)}
                onEdit={openEdit}
                onHubSpotSync={handleHubSpotSync}
                onSms={(l) => { setSmsTarget(l); setSmsMessage(''); }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="bg-[#1a1a1a] border border-[#d4af37]/50 rounded-lg p-3 w-48 shadow-2xl opacity-95">
                <div className="text-sm font-medium text-white">{activeLead.name}</div>
                <div className="text-xs text-[#666]">{activeLead.company}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-[#111] border gold-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold gold-text mb-4">{editingLead ? 'Edit Lead' : 'New Lead'}</h3>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Name *', type: 'text', placeholder: 'Lead name' },
                { key: 'email', label: 'Email *', type: 'email', placeholder: 'email@example.com' },
                { key: 'company', label: 'Company', type: 'text', placeholder: 'Company name' },
                { key: 'phone', label: 'Phone', type: 'text', placeholder: '+1 555-0100' },
                { key: 'source', label: 'Source', type: 'text', placeholder: 'e.g. LinkedIn, web scrape' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-[#888] mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form[key as keyof typeof form] as string) ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as LeadStage }))}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    {STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.score}
                    onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Deal Value ($)</label>
                <input
                  type="number"
                  min={0}
                  value={form.value ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="0"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]"
                />
              </div>
              {editingLead && (
                <button onClick={() => { setShowForm(false); handleDelete(editingLead.id); }} className="text-xs text-red-400 hover:text-red-300">Delete lead</button>
              )}
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#888] hover:text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {smsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSmsTarget(null)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 gold-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold gold-text mb-1">Send SMS</h3>
            <p className="text-xs text-[#555] mb-4">To: {smsTarget.name} ({smsTarget.phone})</p>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              rows={4}
              placeholder="Type your message…"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] resize-none"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setSmsTarget(null)} className="px-4 py-2 text-sm text-[#888] hover:text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">Cancel</button>
              <button onClick={handleSendSms} disabled={smsSending || !smsMessage} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {smsSending ? 'Sending…' : '📱 Send SMS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
