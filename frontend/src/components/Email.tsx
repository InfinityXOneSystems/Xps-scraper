import { useState, useEffect } from 'react';
import {
  getEmailTemplates,
  createEmailTemplate,
  getCampaigns,
  createCampaign,
} from '../api';
import type { EmailTemplate, Campaign, CampaignStatus } from '../types';

function statusBadge(s: CampaignStatus) {
  const map: Record<CampaignStatus, string> = {
    draft: 'bg-[#333] text-[#999]',
    scheduled: 'bg-blue-900/40 text-blue-400',
    running: 'bg-yellow-900/40 text-yellow-400',
    completed: 'bg-green-900/40 text-green-400',
    paused: 'bg-orange-900/40 text-orange-400',
  };
  return `text-xs px-2 py-0.5 rounded-full font-medium ${map[s]}`;
}

export default function Email() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeView, setActiveView] = useState<'templates' | 'campaigns'>('templates');
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '' });
  const [campaignForm, setCampaignForm] = useState({ name: '', templateId: '', recipients: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [tmpl, camp] = await Promise.allSettled([getEmailTemplates(), getCampaigns()]);
      if (tmpl.status === 'fulfilled') setTemplates(tmpl.value);
      if (camp.status === 'fulfilled') setCampaigns(camp.value);
      setLoading(false);
    }
    load();
  }, []);

  async function saveTemplate() {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) return;
    setSaving(true);
    try {
      const t = await createEmailTemplate(templateForm);
      setTemplates((p) => [...p, t]);
      setShowTemplateForm(false);
      setTemplateForm({ name: '', subject: '', body: '' });
    } finally {
      setSaving(false);
    }
  }

  async function saveCampaign() {
    if (!campaignForm.name || !campaignForm.templateId) return;
    setSaving(true);
    try {
      const recipients = campaignForm.recipients
        .split(/[\n,]/)
        .map((r) => r.trim())
        .filter((r) => r.includes('@'));
      const c = await createCampaign({ name: campaignForm.name, templateId: campaignForm.templateId, recipients });
      setCampaigns((p) => [...p, c]);
      setShowCampaignForm(false);
      setCampaignForm({ name: '', templateId: '', recipients: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">Email Follow-up</h2>
          <p className="text-[#666] text-xs mt-0.5">{templates.length} templates · {campaigns.length} campaigns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplateForm(true)} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#d4af37] rounded-lg transition-all">
            + Template
          </button>
          <button onClick={() => setShowCampaignForm(true)} className="gold-button px-3 py-1.5 text-xs rounded-lg">
            + Campaign
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="px-6 py-2 border-b border-[#2a2a2a] flex gap-4 flex-shrink-0">
        {(['templates', 'campaigns'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`text-sm pb-2 border-b-2 transition-all capitalize ${
              activeView === v ? 'border-[#d4af37] text-[#ffd700]' : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            {v} ({v === 'templates' ? templates.length : campaigns.length})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#555]">Loading…</div>
        ) : activeView === 'templates' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-40 text-[#555]">
                <div className="text-3xl mb-2">📧</div>
                <div className="text-sm">No templates yet</div>
                <button onClick={() => setShowTemplateForm(true)} className="mt-3 text-xs text-[#d4af37] hover:underline">Create your first template</button>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="gold-card rounded-xl p-4">
                  <div className="text-sm font-semibold text-white mb-1">{t.name}</div>
                  <div className="text-xs text-[#d4af37] mb-2 truncate">Subject: {t.subject}</div>
                  <div className="text-xs text-[#666] line-clamp-3 whitespace-pre-wrap">{t.body}</div>
                  <div className="mt-3 text-[10px] text-[#444]">
                    Created {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-[#555]">
                <div className="text-3xl mb-2">📨</div>
                <div className="text-sm">No campaigns yet</div>
                <button onClick={() => setShowCampaignForm(true)} className="mt-3 text-xs text-[#d4af37] hover:underline">Create your first campaign</button>
              </div>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-white">{c.name}</div>
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center mt-3">
                    {[
                      { label: 'Recipients', value: c.recipients.length },
                      { label: 'Sent', value: c.sentCount },
                      { label: 'Opens', value: c.openCount },
                      { label: 'Replies', value: c.replyCount },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="text-lg font-bold text-white">{s.value}</div>
                        <div className="text-[10px] text-[#555]">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowTemplateForm(false)}>
          <div className="bg-[#111] border gold-border rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold gold-text mb-4">New Email Template</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">Template Name *</label>
                <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Initial Outreach" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Subject *</label>
                <input type="text" value={templateForm.subject} onChange={(e) => setTemplateForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Email subject line" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Body *</label>
                <textarea value={templateForm.body} onChange={(e) => setTemplateForm((f) => ({ ...f, body: e.target.value }))} rows={6} placeholder="Email body. Use {{name}}, {{company}} as variables." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowTemplateForm(false)} className="px-4 py-2 text-sm text-[#888] hover:text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">Cancel</button>
              <button onClick={saveTemplate} disabled={saving || !templateForm.name || !templateForm.subject || !templateForm.body} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Form Modal */}
      {showCampaignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCampaignForm(false)}>
          <div className="bg-[#111] border gold-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold gold-text mb-4">New Campaign</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">Campaign Name *</label>
                <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))} placeholder="Campaign name" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Template *</label>
                <select value={campaignForm.templateId} onChange={(e) => setCampaignForm((f) => ({ ...f, templateId: e.target.value }))} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]">
                  <option value="">Select template…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Recipients (comma or line separated emails)</label>
                <textarea value={campaignForm.recipients} onChange={(e) => setCampaignForm((f) => ({ ...f, recipients: e.target.value }))} rows={4} placeholder="email1@example.com&#10;email2@example.com" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowCampaignForm(false)} className="px-4 py-2 text-sm text-[#888] hover:text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">Cancel</button>
              <button onClick={saveCampaign} disabled={saving || !campaignForm.name || !campaignForm.templateId} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
