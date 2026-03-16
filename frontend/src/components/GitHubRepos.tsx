import { useState, useCallback } from 'react';
import type { GitHubRepo } from '../types';

const CATEGORIES = [
  { id: 'ai-ml', label: 'AI / ML', query: 'machine learning artificial intelligence' },
  { id: 'scraping', label: 'Web Scraping', query: 'web scraper scraping playwright puppeteer' },
  { id: 'data-science', label: 'Data Science', query: 'data science pandas jupyter notebook' },
  { id: 'devops', label: 'DevOps', query: 'docker kubernetes ci cd devops' },
  { id: 'apis', label: 'APIs', query: 'rest api graphql openapi' },
  { id: 'fullstack', label: 'Full Stack', query: 'fullstack react nodejs express typescript' },
  { id: 'security', label: 'Security', query: 'security pentest vulnerability hacking' },
  { id: 'llm', label: 'LLM Tools', query: 'llm openai langchain large language model' },
];

const RATINGS_KEY = 'xps_repo_ratings';

function getRatings(): Record<number, number> {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}'); } catch { return {}; }
}

function setRating(id: number, r: number) {
  const ratings = getRatings();
  ratings[id] = r;
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

function formatStars(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function LanguageDot({ lang }: { lang: string | null }) {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
    Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d',
    Ruby: '#701516', PHP: '#4F5D95', Shell: '#89e051',
  };
  if (!lang) return null;
  const color = colors[lang] ?? '#888';
  return (
    <span className="flex items-center gap-1 text-xs text-[#888]">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {lang}
    </span>
  );
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  const [userRating, setUserRating] = useState(() => getRatings()[repo.id] ?? 0);

  function rate(r: number) {
    setRating(repo.id, r);
    setUserRating(r);
  }

  return (
    <div className="bg-[#111] border border-[#2a2a2a] hover:border-[#d4af37]/40 rounded-xl p-4 transition-all flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#58a6ff] hover:text-[#ffd700] transition-colors truncate block">
            {repo.full_name}
          </a>
          <div className="text-xs text-[#666] mt-0.5 line-clamp-2">{repo.description ?? 'No description'}</div>
        </div>
      </div>

      {repo.topics && repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-[#888] rounded-full border border-[#2a2a2a]">{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-[#888]">⭐ {formatStars(repo.stargazers_count)}</span>
          <span className="flex items-center gap-1 text-xs text-[#888]">🍴 {formatStars(repo.forks_count)}</span>
          <LanguageDot lang={repo.language} />
        </div>
        <a
          href={`${repo.html_url}/fork`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:border-[#d4af37] hover:text-[#ffd700] rounded-lg transition-all"
        >
          🍴 Fork
        </a>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#555] mr-1">Rate:</span>
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            onClick={() => rate(r)}
            className={`text-sm transition-colors ${r <= userRating ? 'text-[#ffd700]' : 'text-[#333] hover:text-[#888]'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GitHubRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const search = useCallback(async (query: string, pageNum = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.github.com/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=24&page=${pageNum}`;
      const headers: HeadersInit = { Accept: 'application/vnd.github+json' };
      const token = localStorage.getItem('xps_github_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const data = await res.json() as { items: GitHubRepo[] };
      setRepos(pageNum === 1 ? data.items : (prev) => [...prev, ...data.items]);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleCategoryClick(cat: typeof CATEGORIES[0]) {
    setActiveCategory(cat.id);
    setSearchInput(cat.query);
    setPage(1);
    search(cat.query, 1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveCategory(null);
    setPage(1);
    search(searchInput, 1);
  }

  const topPicks = repos.filter((r) => r.stargazers_count > 5000).slice(0, 3);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex-shrink-0">
        <h2 className="text-xl font-bold gold-text mb-1">GitHub Repository Explorer</h2>
        <p className="text-[#666] text-xs">Discover, rate, and fork repositories</p>
      </div>

      {/* Search + Categories */}
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex-shrink-0 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search GitHub repositories…"
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37]"
          />
          <button type="submit" disabled={loading} className="gold-button px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? '…' : '🔍 Search'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#d4af37] text-black'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#d4af37]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/40 text-red-400 rounded-lg text-sm">{error}</div>
        )}

        {topPicks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">⭐ Top Picks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPicks.map((r) => <RepoCard key={r.id} repo={r} />)}
            </div>
          </div>
        )}

        {repos.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
              All Results ({repos.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {repos.map((r) => <RepoCard key={r.id} repo={r} />)}
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => search(searchInput, page + 1)}
                disabled={loading}
                className="px-4 py-2 text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-[#ffd700] hover:border-[#d4af37] rounded-lg transition-all disabled:opacity-40"
              >
                {loading ? 'Loading…' : 'Load More'}
              </button>
            </div>
          </div>
        )}

        {!loading && repos.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-[#555]">
            <div className="text-4xl mb-3">🐙</div>
            <div className="text-sm">Select a category or search for repositories</div>
          </div>
        )}

        {loading && repos.length === 0 && (
          <div className="flex items-center justify-center h-48 text-[#555]">Searching GitHub…</div>
        )}
      </div>
    </div>
  );
}
