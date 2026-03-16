import { useState } from 'react';

interface CommitResult {
  success: boolean;
  message: string;
  url?: string;
}

export default function Sandbox() {
  const [token, setToken] = useState(() => localStorage.getItem('xps_github_token') ?? '');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBranch, setPrBranch] = useState('');
  const [prBase, setPrBase] = useState('main');
  const [fileName, setFileName] = useState('README.md');
  const [fileContent, setFileContent] = useState('# My Project\n\nCreated with XPS Shadow Scraper Sandbox');
  const [commitMsg, setCommitMsg] = useState('feat: initial commit via XPS Shadow');
  const [targetRepo, setTargetRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [activeAction, setActiveAction] = useState<'repo' | 'pr' | 'commit'>('repo');

  function saveToken() {
    const t = token.trim();
    if (t) localStorage.setItem('xps_github_token', t);
    else localStorage.removeItem('xps_github_token');
  }

  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function createRepo() {
    if (!newRepoName || !token) {
      setResult({ success: false, message: 'GitHub token and repo name are required' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: newRepoName,
          description: newRepoDesc,
          private: newRepoPrivate,
          auto_init: true,
        }),
      });
      const data = await res.json() as { html_url?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? 'Failed to create repo');
      setResult({ success: true, message: `Repository created: ${data.html_url}`, url: data.html_url });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error' });
    } finally {
      setLoading(false);
    }
  }

  async function createPR() {
    if (!targetRepo || !prTitle || !prBranch || !token) {
      setResult({ success: false, message: 'GitHub token, repo, title, and branch are required' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${targetRepo}/pulls`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title: prTitle, body: prBody, head: prBranch, base: prBase }),
      });
      const data = await res.json() as { html_url?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? 'Failed to create PR');
      setResult({ success: true, message: `PR created: ${data.html_url}`, url: data.html_url });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error' });
    } finally {
      setLoading(false);
    }
  }

  async function commitFile() {
    if (!targetRepo || !fileName || !fileContent || !token) {
      setResult({ success: false, message: 'GitHub token, repo, filename, and content are required' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Check if file exists (get its SHA)
      let sha: string | undefined;
      const checkRes = await fetch(`https://api.github.com/repos/${targetRepo}/contents/${fileName}`, {
        headers: getHeaders(),
      });
      if (checkRes.ok) {
        const existing = await checkRes.json() as { sha?: string };
        sha = existing.sha;
      }

      const content = btoa(unescape(encodeURIComponent(fileContent)));
      const res = await fetch(`https://api.github.com/repos/${targetRepo}/contents/${fileName}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ message: commitMsg, content, ...(sha ? { sha } : {}) }),
      });
      const data = await res.json() as { content?: { html_url?: string }; message?: string };
      if (!res.ok) throw new Error(data.message ?? 'Failed to commit');
      setResult({ success: true, message: `File committed to ${targetRepo}/${fileName}`, url: data.content?.html_url });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex-shrink-0">
        <h2 className="text-xl font-bold gold-text">GitHub Sandbox</h2>
        <p className="text-[#666] text-xs mt-0.5">Create repos, commit files, open pull requests</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        {/* GitHub Token */}
        <div className="mb-6 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <span>🔑</span> GitHub Token
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]"
            />
            <button onClick={saveToken} className="gold-button px-3 py-2 rounded-lg text-sm">Save</button>
          </div>
          <p className="text-[10px] text-[#555] mt-1">Token stored in localStorage. Needs repo scope.</p>
        </div>

        {/* Action tabs */}
        <div className="flex gap-2 mb-4">
          {(['repo', 'pr', 'commit'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setActiveAction(a)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-all ${
                activeAction === a ? 'bg-[#d4af37] text-black font-semibold' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white'
              }`}
            >
              {a === 'repo' ? '📁 Create Repo' : a === 'pr' ? '🔀 Open PR' : '📝 Commit File'}
            </button>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
            result.success ? 'bg-green-900/20 border border-green-700/40 text-green-400' : 'bg-red-900/20 border border-red-700/40 text-red-400'
          }`}>
            <span>{result.success ? '✅' : '❌'}</span>
            <div>
              <div>{result.message}</div>
              {result.url && (
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-[#58a6ff] hover:underline text-xs mt-1 block">
                  {result.url}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Create Repo */}
        {activeAction === 'repo' && (
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs text-[#888] mb-1">Repository Name *</label>
              <input type="text" value={newRepoName} onChange={(e) => setNewRepoName(e.target.value)} placeholder="my-awesome-project" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">Description</label>
              <input type="text" value={newRepoDesc} onChange={(e) => setNewRepoDesc(e.target.value)} placeholder="Brief description" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#888] cursor-pointer">
              <input type="checkbox" checked={newRepoPrivate} onChange={(e) => setNewRepoPrivate(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              Private repository
            </label>
            <button onClick={createRepo} disabled={loading || !newRepoName || !token} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50 w-full">
              {loading ? 'Creating…' : '📁 Create Repository'}
            </button>
          </div>
        )}

        {/* Open PR */}
        {activeAction === 'pr' && (
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs text-[#888] mb-1">Repository (owner/repo) *</label>
              <input type="text" value={targetRepo} onChange={(e) => setTargetRepo(e.target.value)} placeholder="octocat/Hello-World" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">Head Branch *</label>
                <input type="text" value={prBranch} onChange={(e) => setPrBranch(e.target.value)} placeholder="feature/my-branch" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Base Branch</label>
                <input type="text" value={prBase} onChange={(e) => setPrBase(e.target.value)} placeholder="main" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">PR Title *</label>
              <input type="text" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="feat: my new feature" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">PR Body</label>
              <textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} rows={3} placeholder="Describe your changes…" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] resize-none" />
            </div>
            <button onClick={createPR} disabled={loading || !targetRepo || !prTitle || !prBranch || !token} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50 w-full">
              {loading ? 'Creating PR…' : '🔀 Open Pull Request'}
            </button>
          </div>
        )}

        {/* Commit File */}
        {activeAction === 'commit' && (
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs text-[#888] mb-1">Repository (owner/repo) *</label>
              <input type="text" value={targetRepo} onChange={(e) => setTargetRepo(e.target.value)} placeholder="octocat/Hello-World" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">File Path *</label>
              <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="src/index.ts" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">File Content *</label>
              <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)} rows={8} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-[#d4af37] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">Commit Message *</label>
              <input type="text" value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} placeholder="feat: update file" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]" />
            </div>
            <button onClick={commitFile} disabled={loading || !targetRepo || !fileName || !fileContent || !token} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50 w-full">
              {loading ? 'Committing…' : '📝 Commit File'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
