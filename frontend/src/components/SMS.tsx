import { useState, useEffect } from 'react';
import { sendSms, sendBulkSms, getSmsStatus } from '../api';

interface SmsRecord {
  id: string;
  to: string;
  message: string;
  status: 'sent' | 'failed';
  timestamp: string;
}

export default function SMS() {
  const [configured, setConfigured] = useState(false);
  const [fromNumber, setFromNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'single' | 'bulk' | 'history'>('single');
  const [form, setForm] = useState({ to: '', message: '' });
  const [bulkForm, setBulkForm] = useState({ recipients: '', message: '' });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SmsRecord[]>([]);
  const [result, setResult] = useState<{ success?: boolean; sid?: string; sent?: number; failed?: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSmsStatus()
      .then((s) => { setConfigured(s.configured); setFromNumber(s.from); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!form.to || !form.message) return;
    setSending(true); setError(''); setResult(null);
    try {
      const r = await sendSms(form.to, form.message);
      setResult(r);
      setHistory((p) => [{
        id: r.sid ?? crypto.randomUUID(),
        to: form.to,
        message: form.message,
        status: r.success ? 'sent' : 'failed',
        timestamp: new Date().toISOString(),
      }, ...p]);
      if (r.success) setForm((f) => ({ ...f, message: '' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleBulk() {
    const recipients = bulkForm.recipients.split(/[\n,]/).map((r) => r.trim()).filter((r) => r.startsWith('+') || r.includes('@') || /^\d/.test(r));
    if (!recipients.length || !bulkForm.message) return;
    setSending(true); setError(''); setResult(null);
    try {
      const r = await sendBulkSms(recipients, bulkForm.message);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const templates = [
    { label: 'Follow-up', text: 'Hi {{name}}, just following up on our conversation. Would you like to schedule a call? Reply STOP to opt out.' },
    { label: 'Appointment Reminder', text: 'Reminder: Your appointment is tomorrow at {{time}}. Reply YES to confirm or CANCEL to reschedule.' },
    { label: 'Welcome', text: "Welcome to {{company}}, {{name}}! We're excited to have you. Reply HELP for assistance or STOP to opt out." },
    { label: 'Promo', text: '🎉 Special offer for {{name}}! Get 20% off with code {{code}}. Valid until {{date}}. Reply STOP to opt out.' },
  ];

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-[#0a0a0a] text-[#555] animate-pulse">Loading SMS system…</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">Twilio SMS</h2>
          <p className="text-[#666] text-xs mt-0.5">
            {configured ? `From: ${fromNumber ?? 'configured'}` : 'Not configured — add TWILIO_* to .env'}
          </p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${configured ? 'bg-green-900/20 text-green-400 border border-green-700/30' : 'bg-red-900/20 text-red-400 border border-red-700/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-green-400' : 'bg-red-400'}`} />
          {configured ? 'Connected' : 'Not configured'}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-2 border-b border-[#2a2a2a] flex gap-4 flex-shrink-0">
        {(['single', 'bulk', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm pb-2 border-b-2 transition-all capitalize ${tab === t ? 'border-[#d4af37] text-[#ffd700]' : 'border-transparent text-[#666] hover:text-white'}`}>
            {t === 'history' ? `History (${history.length})` : t === 'bulk' ? 'Bulk Send' : 'Single SMS'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!configured && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4 text-sm text-yellow-400">
            ⚠️ Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file.{' '}
            <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="underline">Get credentials ↗</a>
          </div>
        )}

        {tab === 'single' && (
          <div className="max-w-lg space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1">To (phone number)</label>
              <input type="tel" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                placeholder="+1XXXXXXXXXX" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">Message ({form.message.length}/160)</label>
              <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={4} maxLength={1600} placeholder="Enter your message…"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37] resize-none" />
            </div>

            {/* Templates */}
            <div>
              <label className="block text-xs text-[#888] mb-2">Quick Templates</label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <button key={t.label} onClick={() => setForm((f) => ({ ...f, message: t.text }))}
                    className="text-left px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#d4af37] transition-all">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}
            {result?.success && <p className="text-green-400 text-xs">✅ SMS sent! SID: {result.sid}</p>}

            <button onClick={handleSend} disabled={sending || !form.to || !form.message}
              className="gold-button px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 w-full">
              {sending ? 'Sending…' : 'Send SMS'}
            </button>
          </div>
        )}

        {tab === 'bulk' && (
          <div className="max-w-lg space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1">Recipients (one per line or comma-separated)</label>
              <textarea value={bulkForm.recipients} onChange={(e) => setBulkForm((f) => ({ ...f, recipients: e.target.value }))}
                rows={5} placeholder={'+1XXXXXXXXXX\n+1XXXXXXXXXX\n+1XXXXXXXXXX'}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37] resize-none" />
              <p className="text-[10px] text-[#555] mt-1">
                {bulkForm.recipients.split(/[\n,]/).filter((r) => r.trim()).length} recipients · max 50
              </p>
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">Message</label>
              <textarea value={bulkForm.message} onChange={(e) => setBulkForm((f) => ({ ...f, message: e.target.value }))}
                rows={4} maxLength={1600} placeholder="Message to send to all recipients…"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37] resize-none" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {result?.sent !== undefined && (
              <p className="text-green-400 text-xs">✅ Sent: {result.sent} · Failed: {result.failed}</p>
            )}
            <button onClick={handleBulk} disabled={sending || !bulkForm.recipients || !bulkForm.message}
              className="gold-button px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 w-full">
              {sending ? 'Sending…' : 'Send Bulk SMS'}
            </button>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-[#555] py-12">No messages sent yet in this session</div>
            ) : (
              history.map((msg) => (
                <div key={msg.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">{msg.to}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${msg.status === 'sent' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] line-clamp-2">{msg.message}</p>
                  <p className="text-[10px] text-[#444] mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
