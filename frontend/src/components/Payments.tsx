import { useState, useEffect } from 'react';
import { getPaymentsStatus, createStripePaymentIntent, getStripePaymentIntents, getStripeCustomers } from '../api';

interface PayStatus {
  stripe: { configured: boolean; publishableKey: string | null };
  square: { configured: boolean; applicationId: string | null; locationId: string | null; environment: string };
}

export default function Payments() {
  const [status, setStatus] = useState<PayStatus | null>(null);
  const [activeProcessor, setActiveProcessor] = useState<'stripe' | 'square'>('stripe');
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<unknown[]>([]);
  const [customers, setCustomers] = useState<unknown[]>([]);
  const [intentForm, setIntentForm] = useState({ amount: '', currency: 'usd', description: '' });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await getPaymentsStatus();
        setStatus(s as PayStatus);
        if (s.stripe.configured) {
          const [pi, cust] = await Promise.allSettled([getStripePaymentIntents(), getStripeCustomers()]);
          if (pi.status === 'fulfilled') setRecentPayments((pi.value as { data: unknown[] }).data ?? []);
          if (cust.status === 'fulfilled') setCustomers((cust.value as { data: unknown[] }).data ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateIntent() {
    if (!intentForm.amount) return;
    setCreating(true);
    setError('');
    setCreated(null);
    try {
      const amt = Math.round(parseFloat(intentForm.amount) * 100);
      const result = await createStripePaymentIntent(amt, intentForm.currency, intentForm.description || undefined);
      setCreated(result as Record<string, unknown>);
      setIntentForm({ amount: '', currency: 'usd', description: '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-[#555] animate-pulse">Loading payment systems…</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold gold-text mb-1">Payment Systems</h1>
        <p className="text-[#666] text-sm">Stripe &amp; Square payment processing</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div
          className={`gold-card rounded-xl p-4 cursor-pointer ${activeProcessor === 'stripe' ? 'ring-1 ring-[#d4af37]' : ''}`}
          onClick={() => setActiveProcessor('stripe')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <span className="font-semibold text-white">Stripe</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status?.stripe.configured ? 'bg-green-900/30 text-green-400' : 'bg-[#222] text-[#555]'}`}>
              {status?.stripe.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="text-xs text-[#666]">Payment intents, subscriptions, invoices &amp; more</p>
        </div>
        <div
          className={`gold-card rounded-xl p-4 cursor-pointer ${activeProcessor === 'square' ? 'ring-1 ring-[#d4af37]' : ''}`}
          onClick={() => setActiveProcessor('square')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⬜</span>
              <span className="font-semibold text-white">Square</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status?.square.configured ? 'bg-green-900/30 text-green-400' : 'bg-[#222] text-[#555]'}`}>
              {status?.square.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="text-xs text-[#666]">Point-of-sale, online payments &amp; {status?.square.environment ?? 'sandbox'} mode</p>
        </div>
      </div>

      {/* Stripe Panel */}
      {activeProcessor === 'stripe' && (
        <div className="space-y-6">
          {!status?.stripe.configured ? (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">💳</div>
              <h3 className="text-white font-semibold mb-1">Stripe not configured</h3>
              <p className="text-[#555] text-sm mb-3">Add STRIPE_SECRET_KEY to your .env file</p>
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
                 className="text-[#d4af37] text-xs hover:underline">Get your API keys ↗</a>
            </div>
          ) : (
            <>
              {/* Create Payment Intent */}
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Create Payment Intent</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Amount (USD)</label>
                    <input
                      type="number"
                      value={intentForm.amount}
                      onChange={(e) => setIntentForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="99.99"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Currency</label>
                    <select
                      value={intentForm.currency}
                      onChange={(e) => setIntentForm((p) => ({ ...p, currency: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                      <option value="cad">CAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Description</label>
                    <input
                      type="text"
                      value={intentForm.description}
                      onChange={(e) => setIntentForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                {created && (
                  <div className="mt-3 bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-xs text-green-400">
                    ✅ Payment intent created: <span className="font-mono">{created.id as string}</span> — Status: {created.status as string}
                  </div>
                )}
                <button
                  onClick={handleCreateIntent}
                  disabled={creating || !intentForm.amount}
                  className="mt-3 gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create Payment Intent'}
                </button>
              </div>

              {/* Recent payment intents */}
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#2a2a2a]">
                  <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Recent Payment Intents</h2>
                </div>
                {recentPayments.length === 0 ? (
                  <div className="p-6 text-center text-[#555] text-sm">No payment intents yet</div>
                ) : (
                  <div className="divide-y divide-[#1a1a1a]">
                    {(recentPayments as Array<Record<string, unknown>>).map((pi) => (
                      <div key={pi.id as string} className="flex items-center justify-between px-5 py-3 text-sm">
                        <div>
                          <span className="font-mono text-xs text-[#888]">{pi.id as string}</span>
                          {pi.description != null && <span className="ml-2 text-[#666] text-xs">{String(pi.description)}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">
                            {((pi.amount as number) / 100).toFixed(2)} {String(pi.currency).toUpperCase()}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pi.status === 'succeeded' ? 'bg-green-900/30 text-green-400' :
                            pi.status === 'requires_payment_method' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-[#222] text-[#555]'
                          }`}>
                            {pi.status as string}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customers */}
              {customers.length > 0 && (
                <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#2a2a2a]">
                    <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Stripe Customers ({customers.length})</h2>
                  </div>
                  <div className="divide-y divide-[#1a1a1a]">
                    {(customers as Array<Record<string, unknown>>).map((c) => (
                      <div key={c.id as string} className="flex items-center justify-between px-5 py-3 text-sm">
                        <div>
                          <div className="text-white">{(c.name as string) || '(No name)'}</div>
                          <div className="text-xs text-[#666]">{c.email as string}</div>
                        </div>
                        <span className="font-mono text-xs text-[#555]">{c.id as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Square Panel */}
      {activeProcessor === 'square' && (
        <div>
          {!status?.square.configured ? (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">⬜</div>
              <h3 className="text-white font-semibold mb-1">Square not configured</h3>
              <p className="text-[#555] text-sm mb-3">Add SQUARE_ACCESS_TOKEN to your .env file</p>
              <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer"
                 className="text-[#d4af37] text-xs hover:underline">Get your credentials ↗</a>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-400">Square connected</span>
                <span className="text-xs text-[#555] ml-2">• {status.square.environment} mode</span>
              </div>
              <p className="text-xs text-[#666]">Location ID: <span className="text-[#888] font-mono">{status.square.locationId ?? 'Not set'}</span></p>
              <p className="text-xs text-[#666] mt-1">Application ID: <span className="text-[#888] font-mono">{status.square.applicationId ?? 'Not set'}</span></p>
              <div className="mt-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-xs text-[#666]">
                To process Square payments, integrate the Square Web Payments SDK in your frontend using the Application ID above.
                The backend supports <code className="text-[#f0883e]">POST /api/payments/square/payment</code> for server-side payment creation.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
