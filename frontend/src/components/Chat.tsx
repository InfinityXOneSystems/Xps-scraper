import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { agentChat } from '../api';
import type { ChatMessage, ScrapeResult } from '../types';

const SUGGESTIONS = [
  'Scrape https://example.com and summarize the content',
  'Extract all links from https://news.ycombinator.com',
  'Harvest API keys from https://example.com/config.js',
];

interface MessageWithResult extends ChatMessage {
  scrapeResult?: ScrapeResult;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

function ScrapedDataPanel({ result }: { result: ScrapeResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border border-[#30363d] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0f1117] text-xs text-[#8b949e] hover:text-white hover:bg-[#1c2333] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📄</span>
          <span>Scraped: {result.title || result.url}</span>
          <span className="px-1.5 py-0.5 bg-[#1c2333] rounded text-[10px]">
            {result.statusCode}
          </span>
          <span className="text-[#484f58]">{result.responseTime}ms</span>
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 bg-[#0f1117] text-xs space-y-2 max-h-60 overflow-y-auto">
          {result.description && (
            <p className="text-[#8b949e]">{result.description}</p>
          )}
          {result.links.length > 0 && (
            <div>
              <p className="text-[#58a6ff] mb-1">
                Links ({result.links.length})
              </p>
              <ul className="space-y-0.5">
                {result.links.slice(0, 10).map((l, i) => (
                  <li key={i} className="truncate text-[#8b949e]">
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white underline"
                    >
                      {l.text || l.href}
                    </a>
                  </li>
                ))}
                {result.links.length > 10 && (
                  <li className="text-[#484f58]">
                    … and {result.links.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<MessageWithResult[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: MessageWithResult = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const history: ChatMessage[] = messages.map(({ scrapeResult: _sr, ...m }) => m);
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setError(null);

      try {
        const lastScrape = [...messages]
          .reverse()
          .find((m) => m.scrapeResult)?.scrapeResult;

        const res = await agentChat(trimmed, history, lastScrape);

        const assistantMsg: MessageWithResult = {
          id: makeId(),
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString(),
          scrapeResult: res.scrapeResult,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    },
    [messages, loading],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 pb-20 animate-fade-in">
            <div>
              <div className="text-5xl mb-3">🕷️</div>
              <h2 className="text-xl font-bold text-white mb-1">
                XPS Shadow Scraper Agent
              </h2>
              <p className="text-[#8b949e] text-sm max-w-md">
                👋 I'm your XPS Shadow Scraper agent. Ask me to scrape a URL,
                extract data, harvest keys, or analyze web content.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-lg">
              <p className="text-xs text-[#484f58] uppercase tracking-wider mb-1">
                Suggested prompts
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-2.5 bg-[#1c2333] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-sm text-[#8b949e] hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex message-enter ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#1f6feb] flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5">
                🕷️
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#1e3a5f] text-white rounded-br-sm'
                  : 'bg-[#1c2333] text-[#e6edf3] rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}

              {msg.scrapeResult && (
                <ScrapedDataPanel result={msg.scrapeResult} />
              )}

              <p className="text-[10px] text-[#484f58] mt-1.5 text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-[#30363d] flex items-center justify-center text-sm flex-shrink-0 ml-2 mt-0.5">
                👤
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start message-enter">
            <div className="w-7 h-7 rounded-full bg-[#1f6feb] flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5">
              🕷️
            </div>
            <div className="bg-[#1c2333] rounded-2xl rounded-bl-sm px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-xs px-4 py-2 rounded-lg max-w-lg">
              ⚠️ {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-[#30363d] bg-[#0f1117]">
        {!isEmpty && (
          <div className="flex justify-end mb-2">
            <button
              onClick={clearConversation}
              className="text-xs text-[#484f58] hover:text-[#8b949e] transition-colors"
            >
              🗑 Clear conversation
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 focus-within:border-[#58a6ff] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to scrape a URL, extract data, harvest keys…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#484f58] resize-none outline-none max-h-40 leading-6"
            style={{ overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 bg-[#1f6feb] hover:bg-[#388bfd] disabled:bg-[#1c2333] disabled:text-[#484f58] text-white rounded-lg flex items-center justify-center transition-all text-sm"
            title="Send (Enter)"
          >
            ➤
          </button>
        </div>
        <p className="text-[10px] text-[#484f58] mt-1.5 text-center">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
