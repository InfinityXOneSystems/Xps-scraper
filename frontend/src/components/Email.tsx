import { useState, useEffect } from 'react';
import {
  getEmailTemplates,
  createEmailTemplate,
  getCampaigns,
  createCampaign,
} from '../api';
import type { EmailTemplate, Campaign, CampaignStatus } from '../types';

const PRESET_TEMPLATES = [
  {
    name: 'Cold Outreach - SaaS',
    subject: "Quick question about {{company}}'s {{pain_point}} challenges",
    body: `Hi {{first_name}},

I noticed {{company}} is growing quickly in the {{industry}} space — congrats on the recent {{achievement}}.

I help companies like yours solve {{pain_point}} by {{solution}}. We've helped {{similar_company}} achieve {{result}} in just {{timeframe}}.

Would it make sense to connect for a quick 15-minute call this week or next? Here's my calendar: {{calendar_link}}

Best,
{{sender_name}}
{{signature}}

P.S. If you're not the right person, who should I reach out to?`,
    category: 'Cold Outreach',
    tone: 'Professional',
  },
  {
    name: 'Follow-Up #1 (3 days after)',
    subject: 'Re: {{original_subject}} — Checking in',
    body: `Hi {{first_name}},

Just wanted to follow up on my previous email. I know inboxes get busy!

I'd love to learn more about {{company}}'s goals around {{topic}} and share how we've helped similar teams.

Are you free for a 15-minute call? Here are a few times that work for me:
• {{time_option_1}}
• {{time_option_2}}
• {{time_option_3}}

Or feel free to grab a time directly: {{calendar_link}}

Best,
{{sender_name}}`,
    category: 'Follow-Up',
    tone: 'Friendly',
  },
  {
    name: 'Follow-Up #2 (7 days after)',
    subject: 'Last follow-up — {{company}} + {{your_company}}',
    body: `Hi {{first_name}},

I'll keep this brief — I've sent a couple of notes and haven't heard back. I don't want to bother you if the timing isn't right.

Before I close your file, I wanted to share one thing: {{key_value_proposition}}.

If you're open to it, I'd love 10 minutes of your time. If not, totally understand — just reply "not interested" and I won't reach out again.

Thanks either way,
{{sender_name}}`,
    category: 'Follow-Up',
    tone: 'Direct',
  },
  {
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}, {{first_name}}! 🎉',
    body: `Hi {{first_name}},

Welcome aboard! We're thrilled to have you join {{company_name}}.

Here's what happens next:

1️⃣ Set up your profile at {{profile_url}}
2️⃣ Explore our getting started guide: {{guide_url}}
3️⃣ Join our community: {{community_url}}

Your account is: {{account_email}}

If you have any questions, just reply to this email or reach out to {{support_email}}.

Excited to have you with us!

{{sender_name}}
{{title}}, {{company_name}}`,
    category: 'Onboarding',
    tone: 'Warm',
  },
  {
    name: 'Re-Engagement Campaign',
    subject: 'We miss you, {{first_name}} 👋',
    body: `Hi {{first_name}},

It's been a while since we've seen you in {{product_name}}, and we wanted to check in.

Since you last visited, we've added:
✨ {{new_feature_1}}
🚀 {{new_feature_2}}
🔒 {{new_feature_3}}

Come see what's new: {{cta_url}}

If there's something we can do better, or if you have any questions, just reply to this email — we read every response.

{{sender_name}}
{{company_name}}

---
If you no longer want to receive these emails, {{unsubscribe_link}}.`,
    category: 'Re-Engagement',
    tone: 'Personal',
  },
  {
    name: 'Product Demo Request Response',
    subject: 'Demo Confirmed — {{date}} at {{time}}',
    body: `Hi {{first_name}},

Great news — your demo with {{company_name}} is confirmed!

📅 Date: {{date}}
⏰ Time: {{time}} {{timezone}}
🔗 Join link: {{meeting_link}}

To make the most of our time, it would help to know:
1. What's your biggest challenge with {{pain_point}}?
2. Who else will be joining the call?
3. Any specific features you'd like to see?

Feel free to reply with your answers before the call.

See you soon!
{{sender_name}}
{{title}}, {{company_name}}
📞 {{phone}}`,
    category: 'Sales',
    tone: 'Professional',
  },
  {
    name: 'Invoice / Payment Confirmation',
    subject: 'Payment Received — Invoice #{{invoice_number}}',
    body: `Hi {{first_name}},

Thank you for your payment! Here's your receipt:

Invoice #: {{invoice_number}}
Amount: {{amount}}
Date: {{payment_date}}
Method: {{payment_method}}

Access your account: {{account_url}}
Download invoice: {{invoice_url}}

Your subscription is active through {{renewal_date}}.

Questions? Reply to this email or contact {{support_email}}.

Thank you for your business!

{{company_name}} Team`,
    category: 'Billing',
    tone: 'Professional',
  },
  {
    name: 'Customer Success Check-In',
    subject: '30-day check-in — How is {{product_name}} working for you?',
    body: `Hi {{first_name}},

It's been 30 days since you joined {{company_name}} — time flies!

I wanted to personally check in and make sure you're getting the most out of {{product_name}}.

A few questions:
• Are you achieving your goal of {{stated_goal}}?
• Is there anything that's been confusing or frustrating?
• What would make {{product_name}} 10x more valuable for you?

I'm here to help. Even if everything is going great, I'd love to hear how you're using it.

Talk soon,
{{sender_name}}
Customer Success, {{company_name}}`,
    category: 'Customer Success',
    tone: 'Personal',
  },
];

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
  const [activeView, setActiveView] = useState<'templates' | 'campaigns' | 'library'>('templates');
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
        {(['templates', 'campaigns', 'library'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`text-sm pb-2 border-b-2 transition-all capitalize ${
              activeView === v ? 'border-[#d4af37] text-[#ffd700]' : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            {v === 'library' ? '📚 Library' : v === 'templates' ? `Templates (${templates.length})` : `Campaigns (${campaigns.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#555]">Loading…</div>
        ) : activeView === 'library' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_TEMPLATES.map((t, idx) => (
              <div key={idx} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">{t.category}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a2a2a] text-[#666]">{t.tone}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTemplateForm({ name: t.name, subject: t.subject, body: t.body });
                      setShowTemplateForm(true);
                    }}
                    className="text-xs gold-button px-3 py-1.5 rounded-lg flex-shrink-0 ml-3"
                  >
                    Use Template
                  </button>
                </div>
                <div className="text-xs text-[#d4af37] truncate mb-1">Subject: {t.subject}</div>
                <div className="text-xs text-[#555] line-clamp-3 whitespace-pre-wrap">{t.body}</div>
              </div>
            ))}
          </div>
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
