import { useState, useEffect } from 'react';
import { getConnections, addConnection, testConnection, deleteConnection, getGitHubOAuthUrl } from '../api';
import type { AppConnection, AppConnectorType } from '../types';

interface ConnectorMeta {
  type: AppConnectorType;
  name: string;
  icon: string;
  description: string;
  color: string;
  authType: 'token' | 'oauth' | 'apikey' | 'credentials' | 'multi';
  fields: Array<{ key: string; label: string; placeholder: string; type?: 'password' | 'text' | 'url' }>;
  docsUrl: string;
}

const CONNECTORS: ConnectorMeta[] = [
  {
    type: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Access repos, PRs, Actions, and admin features',
    color: '#333',
    authType: 'oauth',
    fields: [{ key: 'token', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' }],
    docsUrl: 'https://github.com/settings/tokens',
  },
  {
    type: 'vercel',
    name: 'Vercel',
    icon: '▲',
    description: 'Deploy and manage Vercel projects',
    color: '#000',
    authType: 'token',
    fields: [{ key: 'token', label: 'Access Token', placeholder: 'vercel token...', type: 'password' }],
    docsUrl: 'https://vercel.com/account/tokens',
  },
  {
    type: 'railway',
    name: 'Railway',
    icon: '🚂',
    description: 'Manage Railway deployments and services',
    color: '#0B0D0E',
    authType: 'token',
    fields: [{ key: 'token', label: 'API Token', placeholder: 'railway token...', type: 'password' }],
    docsUrl: 'https://railway.app/account/tokens',
  },
  {
    type: 'supabase',
    name: 'Supabase',
    icon: '⚡',
    description: 'PostgreSQL database, auth, and storage',
    color: '#1c1c1c',
    authType: 'credentials',
    fields: [
      { key: 'url', label: 'Project URL', placeholder: 'https://xxx.supabase.co', type: 'url' },
      { key: 'anonKey', label: 'Anon Key', placeholder: 'eyJhbGci...', type: 'password' },
    ],
    docsUrl: 'https://app.supabase.com/project/_/settings/api',
  },
  {
    type: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4, DALL-E, Whisper, and Embeddings',
    color: '#10a37f',
    authType: 'apikey',
    fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'sk-xxxx...', type: 'password' }],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    type: 'anthropic',
    name: 'Anthropic (Claude)',
    icon: '🔮',
    description: 'Claude 3 Opus, Sonnet, and Haiku',
    color: '#d97706',
    authType: 'apikey',
    fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'sk-ant-...', type: 'password' }],
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    type: 'netlify',
    name: 'Netlify',
    icon: '🌐',
    description: 'Deploy and manage Netlify sites',
    color: '#00ad9f',
    authType: 'token',
    fields: [{ key: 'token', label: 'Personal Access Token', placeholder: 'netlify token...', type: 'password' }],
    docsUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
  },
  {
    type: 'google',
    name: 'Google',
    icon: '🔍',
    description: 'Google APIs, Gmail, Drive, and Calendar',
    color: '#4285f4',
    authType: 'credentials',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'xxx.apps.googleusercontent.com' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  {
    type: 'stripe',
    name: 'Stripe',
    icon: '💳',
    description: 'Payment processing, subscriptions, invoices',
    color: '#635bff',
    authType: 'apikey',
    fields: [{ key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_... or sk_test_...', type: 'password' }],
    docsUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    type: 'hubspot',
    name: 'HubSpot',
    icon: '🟠',
    description: 'CRM, marketing, and sales automation',
    color: '#ff7a59',
    authType: 'token',
    fields: [{ key: 'token', label: 'Private App Token', placeholder: 'pat-na1-...', type: 'password' }],
    docsUrl: 'https://developers.hubspot.com/docs/api/private-apps',
  },
  {
    type: 'twilio',
    name: 'Twilio',
    icon: '📱',
    description: 'SMS, voice, and messaging APIs',
    color: '#f22f46',
    authType: 'multi',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxx' },
      { key: 'authToken', label: 'Auth Token', placeholder: 'auth_token...', type: 'password' },
      { key: 'phone', label: 'Phone Number', placeholder: '+1XXXXXXXXXX' },
    ],
    docsUrl: 'https://console.twilio.com/',
  },
  {
    type: 'slack',
    name: 'Slack',
    icon: '💬',
    description: 'Team messaging, notifications, and bots',
    color: '#4a154b',
    authType: 'token',
    fields: [{ key: 'token', label: 'Bot Token', placeholder: 'xoxb-...', type: 'password' }],
    docsUrl: 'https://api.slack.com/apps',
  },
  {
    type: 'notion',
    name: 'Notion',
    icon: '📝',
    description: 'Docs, databases, and project management',
    color: '#000000',
    authType: 'token',
    fields: [{ key: 'token', label: 'Integration Token', placeholder: 'secret_...', type: 'password' }],
    docsUrl: 'https://www.notion.so/my-integrations',
  },
  {
    type: 'airtable',
    name: 'Airtable',
    icon: '🗃️',
    description: 'Spreadsheet-database for structured data',
    color: '#2d7ff9',
    authType: 'token',
    fields: [{ key: 'token', label: 'Personal Access Token', placeholder: 'patxxxxxxxxxxxxxxxx.xxx', type: 'password' }],
    docsUrl: 'https://airtable.com/create/tokens',
  },
  {
    type: 'zapier',
    name: 'Zapier',
    icon: '⚡',
    description: 'Automate workflows with 5000+ apps',
    color: '#ff4a00',
    authType: 'token',
    fields: [{ key: 'token', label: 'API Key', placeholder: 'zapier api key...', type: 'password' }],
    docsUrl: 'https://zapier.com/app/developer',
  },
  {
    type: 'custom',
    name: 'Custom API',
    icon: '🔌',
    description: 'Connect any REST API with a bearer token',
    color: '#555',
    authType: 'credentials',
    fields: [
      { key: 'url', label: 'Base URL', placeholder: 'https://api.example.com', type: 'url' },
      { key: 'token', label: 'API Key / Token', placeholder: 'your token...', type: 'password' },
    ],
    docsUrl: '',
  },
];

function statusDot(status: AppConnection['status']) {
  return status === 'connected'
    ? 'bg-green-500'
    : status === 'error'
    ? 'bg-red-500'
    : 'bg-[#444]';
}

interface ConnectModalProps {
  meta: ConnectorMeta;
  onClose: () => void;
  onSave: (conn: AppConnection) => void;
}

function ConnectModal({ meta, onClose, onSave }: ConnectModalProps) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useGitHubOAuth, setUseGitHubOAuth] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const conn = await addConnection({ name: meta.name, type: meta.type, credentials: fields });
      onSave(conn);
      onClose();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubOAuth() {
    try {
      const { url } = await getGitHubOAuthUrl();
      window.open(url, '_blank', 'noopener,width=800,height=600,scrollbars=yes');
    } catch (e) {
      setError((e as Error).message ?? 'OAuth not configured on server');
    }
  }

  const canSubmit = meta.fields.every((f) => fields[f.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111] border border-[#2a2a2a] hover:border-[#d4af37]/50 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-white">Connect {meta.name}</h3>
            <p className="text-xs text-[#666]">{meta.description}</p>
          </div>
        </div>

        {/* GitHub-specific: offer OAuth button */}
        {meta.type === 'github' && (
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setUseGitHubOAuth(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  useGitHubOAuth ? 'bg-[#1a1a1a] border-[#d4af37] text-white' : 'bg-[#0d1117] border-[#333] text-[#888] hover:border-[#555]'
                }`}
              >
                🐙 Continue with GitHub
              </button>
              <button
                onClick={() => setUseGitHubOAuth(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  !useGitHubOAuth ? 'bg-[#1a1a1a] border-[#d4af37] text-white' : 'bg-[#0d1117] border-[#333] text-[#888] hover:border-[#555]'
                }`}
              >
                🔑 Use Token
              </button>
            </div>
            {useGitHubOAuth && (
              <button
                onClick={handleGitHubOAuth}
                className="w-full gold-button py-2.5 rounded-lg text-sm font-semibold"
              >
                🐙 Authorize via GitHub OAuth
              </button>
            )}
          </div>
        )}

        {/* Credential fields */}
        {(!useGitHubOAuth || meta.type !== 'github') && (
          <div className="space-y-3">
            {meta.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-[#888] mb-1">
                  {f.label}{' '}
                  {meta.docsUrl && (
                    <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[#d4af37] hover:underline">
                      Get it here ↗
                    </a>
                  )}
                </label>
                <input
                  type={f.type ?? 'text'}
                  value={fields[f.key] ?? ''}
                  onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        {!useGitHubOAuth && (
          <div className="flex gap-3 mt-5 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#888] hover:text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Connecting…' : `Connect ${meta.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Connectors() {
  const [connections, setConnections] = useState<AppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConnectorMeta | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    getConnections()
      .then((r) => setConnections(r.connections))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const connectedTypes = new Set(connections.filter((c) => c.status === 'connected').map((c) => c.type));

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const result = await testConnection(id);
      setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, status: result.status as AppConnection['status'], testedAt: result.testedAt } : c)));
    } finally {
      setTesting(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteConnection(id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold gold-text mb-1">App Connectors</h1>
        <p className="text-[#666] text-sm">
          Connect your accounts with 1-2 clicks. {connections.filter((c) => c.status === 'connected').length} apps connected.
        </p>
      </div>

      {/* Connected Apps */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Connected</h2>
          <div className="space-y-2">
            {connections.map((conn) => {
              const meta = CONNECTORS.find((c) => c.type === conn.type);
              return (
                <div key={conn.id} className="flex items-center gap-4 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3">
                  <span className="text-xl">{meta?.icon ?? '🔌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{conn.name}</span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(conn.status)}`} />
                      <span className={`text-xs ${conn.status === 'connected' ? 'text-green-400' : conn.status === 'error' ? 'text-red-400' : 'text-[#666]'}`}>
                        {conn.status}
                      </span>
                    </div>
                    {conn.testedAt && (
                      <div className="text-[10px] text-[#555] mt-0.5">
                        Tested {new Date(conn.testedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(conn.id)}
                      disabled={testing === conn.id}
                      className="text-xs px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#d4af37] rounded-lg transition-all disabled:opacity-50"
                    >
                      {testing === conn.id ? '…' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleDelete(conn.id)}
                      className="text-xs px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] hover:text-red-400 hover:border-red-800 rounded-lg transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All available connectors */}
      <div>
        <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Available Integrations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {CONNECTORS.map((meta) => {
            const isConnected = connectedTypes.has(meta.type);
            return (
              <div
                key={meta.type}
                className={`relative bg-[#111] border rounded-xl p-4 transition-all group cursor-pointer ${
                  isConnected
                    ? 'border-green-700/40 hover:border-green-500/60'
                    : 'border-[#2a2a2a] hover:border-[#d4af37]/50'
                }`}
                onClick={() => !loading && setSelected(meta)}
              >
                {isConnected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Connected
                  </div>
                )}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#ffd700] transition-colors">
                      {meta.name}
                    </h3>
                    <p className="text-xs text-[#555] mt-0.5 leading-relaxed">{meta.description}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(meta); }}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isConnected
                      ? 'bg-green-900/20 border border-green-700/40 text-green-400 hover:bg-green-900/30'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:border-[#d4af37] hover:text-white'
                  }`}
                >
                  {isConnected ? '✓ Connected — Reconnect' : `Connect ${meta.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 text-[#555] text-xs">Loading connections…</div>
      )}

      {selected && (
        <ConnectModal
          meta={selected}
          onClose={() => setSelected(null)}
          onSave={(conn) => {
            setConnections((prev) => [...prev.filter((c) => c.id !== conn.id), conn]);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
