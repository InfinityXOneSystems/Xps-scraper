import { useState, useRef } from 'react';

type BlockType = 'hero' | 'features' | 'cta' | 'pricing' | 'faq' | 'contact' | 'text' | 'image' | 'button' | 'divider' | 'testimonials' | 'stats';

interface Block {
  id: string;
  type: BlockType;
  content: Record<string, string>;
  styles: { bg?: string; textColor?: string; padding?: string };
}

interface AppPage {
  id: string;
  name: string;
  slug: string;
  blocks: Block[];
  seo: { title: string; description: string };
}

const BLOCK_LIBRARY: Array<{ type: BlockType; label: string; icon: string; desc: string; defaultContent: Record<string, string> }> = [
  {
    type: 'hero',
    label: 'Hero Section',
    icon: '🏆',
    desc: 'Full-width header with headline, subtext and CTA',
    defaultContent: {
      headline: 'Build Something Amazing',
      subtext: 'The fastest way to launch your product online',
      ctaText: 'Get Started',
      ctaUrl: '#',
    },
  },
  {
    type: 'features',
    label: 'Features Grid',
    icon: '✨',
    desc: '3-column feature showcase',
    defaultContent: {
      title: 'Why Choose Us',
      f1Title: 'Fast', f1Desc: 'Lightning-fast performance',
      f2Title: 'Secure', f2Desc: 'Enterprise-grade security',
      f3Title: 'Scalable', f3Desc: 'Grows with your business',
    },
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: '📣',
    desc: 'Prominent CTA section',
    defaultContent: { headline: 'Ready to get started?', subtext: 'Join thousands of users today.', ctaText: 'Sign Up Free', ctaUrl: '#' },
  },
  {
    type: 'pricing',
    label: 'Pricing Table',
    icon: '💰',
    desc: '3-tier pricing cards',
    defaultContent: {
      title: 'Simple Pricing',
      p1Name: 'Starter', p1Price: '$0', p1Features: 'Basic features\n5 projects\nCommunity support',
      p2Name: 'Pro', p2Price: '$29/mo', p2Features: 'All Starter features\nUnlimited projects\nPriority support',
      p3Name: 'Enterprise', p3Price: 'Custom', p3Features: 'All Pro features\nCustom integrations\nDedicated support',
    },
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    icon: '💬',
    desc: 'Customer testimonials',
    defaultContent: {
      title: 'What our customers say',
      t1Name: 'Sarah J.', t1Role: 'CEO at Acme', t1Text: 'This product transformed our workflow completely.',
      t2Name: 'Mike P.', t2Role: 'CTO at Beta Inc', t2Text: 'Incredible ROI. We saved 40 hours per week.',
      t3Name: 'Lisa R.', t3Role: 'Founder, Gamma', t3Text: 'Best investment we made this year.',
    },
  },
  {
    type: 'stats',
    label: 'Stats / Numbers',
    icon: '📊',
    desc: 'Key metrics and statistics',
    defaultContent: {
      s1Value: '10K+', s1Label: 'Users',
      s2Value: '99.9%', s2Label: 'Uptime',
      s3Value: '4.9★', s3Label: 'Rating',
      s4Value: '$2M+', s4Label: 'Processed',
    },
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: '❓',
    desc: 'Frequently asked questions',
    defaultContent: {
      title: 'Frequently Asked Questions',
      q1: 'How do I get started?', a1: 'Simply sign up and follow our onboarding guide.',
      q2: 'Is there a free trial?', a2: 'Yes! Start free with no credit card required.',
      q3: 'Can I cancel anytime?', a3: 'Absolutely. Cancel with one click from your settings.',
    },
  },
  {
    type: 'contact',
    label: 'Contact Form',
    icon: '📧',
    desc: 'Contact/lead capture form',
    defaultContent: { title: 'Get in Touch', subtitle: 'We typically respond within 24 hours.' },
  },
  {
    type: 'text',
    label: 'Rich Text',
    icon: '📝',
    desc: 'Free-form text block',
    defaultContent: { title: 'About Us', body: 'Tell your story here. Use this block for any content you need.' },
  },
  {
    type: 'button',
    label: 'Button',
    icon: '🔘',
    desc: 'Standalone CTA button',
    defaultContent: { label: 'Click Here', url: '#', style: 'primary' },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    desc: 'Section separator',
    defaultContent: { style: 'line' },
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    desc: 'Image block with caption',
    defaultContent: { src: '', alt: 'Image', caption: '' },
  },
];

function makeId() { return crypto.randomUUID(); }

function BlockPreview({ block }: { block: Block }) {
  const { type, content } = block;
  switch (type) {
    case 'hero':
      return (
        <div className="text-center py-10 px-6 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
          <h1 className="text-3xl font-bold text-white mb-3">{content.headline}</h1>
          <p className="text-[#888] mb-5">{content.subtext}</p>
          <span className="gold-button px-5 py-2 rounded-full text-sm inline-block">{content.ctaText}</span>
        </div>
      );
    case 'features':
      return (
        <div className="py-8 px-6">
          <h2 className="text-center text-xl font-bold text-white mb-6">{content.title}</h2>
          <div className="grid grid-cols-3 gap-4">
            {[['f1', '⚡'], ['f2', '🔒'], ['f3', '📈']].map(([k, icon]) => (
              <div key={k} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-sm font-semibold text-white">{content[`${k}Title`]}</div>
                <div className="text-xs text-[#666] mt-1">{content[`${k}Desc`]}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'cta':
      return (
        <div className="gold-card rounded-xl py-8 px-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">{content.headline}</h2>
          <p className="text-[#888] text-sm mb-4">{content.subtext}</p>
          <span className="gold-button px-6 py-2 rounded-full text-sm inline-block">{content.ctaText}</span>
        </div>
      );
    case 'pricing':
      return (
        <div className="py-8 px-6">
          <h2 className="text-center text-xl font-bold text-white mb-6">{content.title}</h2>
          <div className="grid grid-cols-3 gap-4">
            {['p1', 'p2', 'p3'].map((p, i) => (
              <div key={p} className={`rounded-xl p-4 border ${i === 1 ? 'gold-card' : 'bg-[#111] border-[#2a2a2a]'}`}>
                <div className="text-sm font-semibold text-white">{content[`${p}Name`]}</div>
                <div className="text-2xl font-bold text-[#d4af37] my-2">{content[`${p}Price`]}</div>
                <div className="text-xs text-[#666] space-y-1">
                  {(content[`${p}Features`] ?? '').split('\n').map((f, j) => (
                    <div key={j} className="flex items-center gap-1"><span className="text-green-400">✓</span>{f}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'stats':
      return (
        <div className="grid grid-cols-4 gap-4 py-8 px-6">
          {['s1', 's2', 's3', 's4'].map((s) => (
            <div key={s} className="text-center">
              <div className="text-3xl font-bold gold-text">{content[`${s}Value`]}</div>
              <div className="text-xs text-[#666] mt-1">{content[`${s}Label`]}</div>
            </div>
          ))}
        </div>
      );
    case 'testimonials':
      return (
        <div className="py-8 px-6">
          <h2 className="text-center text-xl font-bold text-white mb-6">{content.title}</h2>
          <div className="grid grid-cols-3 gap-4">
            {['t1', 't2', 't3'].map((t) => (
              <div key={t} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#888] italic mb-3">"{content[`${t}Text`]}"</p>
                <div className="text-sm font-semibold text-white">{content[`${t}Name`]}</div>
                <div className="text-xs text-[#666]">{content[`${t}Role`]}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'faq':
      return (
        <div className="py-8 px-6">
          <h2 className="text-center text-xl font-bold text-white mb-6">{content.title}</h2>
          <div className="space-y-3">
            {['1', '2', '3'].map((n) => (
              <div key={n} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                <div className="text-sm font-semibold text-white mb-1">{content[`q${n}`]}</div>
                <div className="text-xs text-[#666]">{content[`a${n}`]}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'contact':
      return (
        <div className="py-8 px-6 max-w-md mx-auto">
          <h2 className="text-center text-xl font-bold text-white mb-2">{content.title}</h2>
          <p className="text-center text-xs text-[#666] mb-5">{content.subtitle}</p>
          <div className="space-y-3">
            {['Name', 'Email', 'Message'].map((f) => (
              <div key={f}>
                <label className="block text-xs text-[#888] mb-1">{f}</label>
                {f === 'Message'
                  ? <textarea rows={3} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37] resize-none" placeholder={f} />
                  : <input className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-[#d4af37]" placeholder={f} />
                }
              </div>
            ))}
            <button className="gold-button w-full py-2 rounded-lg text-sm">Send Message</button>
          </div>
        </div>
      );
    case 'text':
      return (
        <div className="py-6 px-6">
          {content.title && <h2 className="text-lg font-bold text-white mb-2">{content.title}</h2>}
          <p className="text-sm text-[#888] whitespace-pre-wrap">{content.body}</p>
        </div>
      );
    case 'button':
      return (
        <div className="py-4 px-6 flex justify-center">
          <span className="gold-button px-6 py-2 rounded-full text-sm inline-block cursor-pointer">{content.label}</span>
        </div>
      );
    case 'divider':
      return <div className="py-2 px-6"><div className="border-t border-[#2a2a2a]" /></div>;
    case 'image':
      return (
        <div className="py-4 px-6">
          {content.src
            ? <img src={content.src} alt={content.alt} className="w-full rounded-xl" />
            : <div className="h-32 bg-[#111] border border-dashed border-[#2a2a2a] rounded-xl flex items-center justify-center text-[#555] text-sm">Image URL</div>
          }
          {content.caption && <p className="text-xs text-[#555] text-center mt-2">{content.caption}</p>}
        </div>
      );
    default:
      return null;
  }
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const lib = BLOCK_LIBRARY.find((l) => l.type === block.type);
  if (!lib) return null;
  return (
    <div className="space-y-2 p-3">
      <div className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider mb-2">{lib.label} Content</div>
      {Object.entries(block.content).map(([key, val]) => (
        <div key={key}>
          <label className="block text-[10px] text-[#666] mb-0.5 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
          {val.includes('\n') ? (
            <textarea
              value={val}
              onChange={(e) => onChange({ ...block, content: { ...block.content, [key]: e.target.value } })}
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#d4af37] resize-none"
            />
          ) : (
            <input
              type="text"
              value={val}
              onChange={(e) => onChange({ ...block, content: { ...block.content, [key]: e.target.value } })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

const STORAGE_KEY = 'xps_app_pages';
function loadPages(): AppPage[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function savePages(pages: AppPage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export default function AppBuilder() {
  const [pages, setPages] = useState<AppPage[]>(loadPages);
  const [activePage, setActivePage] = useState<AppPage | null>(pages[0] ?? null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [panel, setPanel] = useState<'blocks' | 'editor' | 'pages'>('blocks');
  const [previewMode, setPreviewMode] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [publishCode, setPublishCode] = useState('');
  const dragRef = useRef<string | null>(null);

  function createPage() {
    const name = `Page ${pages.length + 1}`;
    const page: AppPage = { id: makeId(), name, slug: name.toLowerCase().replace(/\s+/g, '-'), blocks: [], seo: { title: name, description: '' } };
    const updated = [...pages, page];
    setPages(updated);
    savePages(updated);
    setActivePage(page);
  }

  function updatePage(page: AppPage) {
    const updated = pages.map((p) => (p.id === page.id ? page : p));
    setPages(updated);
    savePages(updated);
    setActivePage(page);
  }

  function deletePage(id: string) {
    const updated = pages.filter((p) => p.id !== id);
    setPages(updated);
    savePages(updated);
    setActivePage(updated[0] ?? null);
  }

  function addBlock(type: BlockType) {
    if (!activePage) return;
    const lib = BLOCK_LIBRARY.find((l) => l.type === type)!;
    const block: Block = { id: makeId(), type, content: { ...lib.defaultContent }, styles: {} };
    const updated = { ...activePage, blocks: [...activePage.blocks, block] };
    updatePage(updated);
    setSelectedBlock(block.id);
    setPanel('editor');
  }

  function removeBlock(id: string) {
    if (!activePage) return;
    updatePage({ ...activePage, blocks: activePage.blocks.filter((b) => b.id !== id) });
    if (selectedBlock === id) { setSelectedBlock(null); setPanel('blocks'); }
  }

  function updateBlock(block: Block) {
    if (!activePage) return;
    updatePage({ ...activePage, blocks: activePage.blocks.map((b) => (b.id === block.id ? block : b)) });
  }

  function moveBlock(id: string, dir: -1 | 1) {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    const i = blocks.findIndex((b) => b.id === id);
    if (i + dir < 0 || i + dir >= blocks.length) return;
    const temp = blocks[i + dir]!;
    blocks[i + dir] = blocks[i]!;
    blocks[i] = temp;
    updatePage({ ...activePage, blocks });
  }

  function generateHtml() {
    if (!activePage) return;
    const blocksHtml = activePage.blocks.map((b) => {
      const lib = BLOCK_LIBRARY.find((l) => l.type === b.type);
      return `<!-- ${lib?.label} -->\n<section class="xps-block xps-${b.type}">\n  ${JSON.stringify(b.content)}\n</section>`;
    }).join('\n\n');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activePage.seo.title || activePage.name}</title>
  <meta name="description" content="${activePage.seo.description}">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
${blocksHtml}
</body>
</html>`;
    setPublishCode(html);
    setShowPublish(true);
  }

  const selectedBlockObj = activePage?.blocks.find((b) => b.id === selectedBlock) ?? null;

  return (
    <div className="h-full flex overflow-hidden bg-[#0a0a0a]">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r border-[#2a2a2a] flex flex-col bg-[#0d0d0d]">
        {/* Panel tabs */}
        <div className="flex border-b border-[#2a2a2a]">
          {(['blocks', 'pages', 'editor'] as const).map((p) => (
            <button key={p} onClick={() => setPanel(p)}
              className={`flex-1 py-2.5 text-xs font-medium transition-all capitalize ${panel === p ? 'text-[#ffd700] border-b-2 border-[#d4af37]' : 'text-[#555] hover:text-white'}`}>
              {p === 'editor' ? '✏️ Edit' : p === 'blocks' ? '🧱 Blocks' : '📄 Pages'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {panel === 'blocks' && (
            <div className="p-2 space-y-1">
              <p className="text-[10px] text-[#555] px-2 py-1 uppercase tracking-wider">Click to add to page</p>
              {BLOCK_LIBRARY.map((b) => (
                <button key={b.type} onClick={() => { addBlock(b.type); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-[#1a1a1a] group transition-all">
                  <span className="text-lg">{b.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-[#ffd700]">{b.label}</div>
                    <div className="text-[10px] text-[#555]">{b.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {panel === 'pages' && (
            <div className="p-2 space-y-1">
              <button onClick={createPage} className="w-full gold-button py-2 rounded-lg text-xs mb-3">+ New Page</button>
              {pages.map((p) => (
                <div key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${activePage?.id === p.id ? 'gold-card text-[#ffd700]' : 'text-[#666] hover:bg-[#1a1a1a] hover:text-white'}`}
                  onClick={() => setActivePage(p)}>
                  <span className="text-sm flex-1 truncate">📄 {p.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
                    className="text-[#444] hover:text-red-400 text-xs">✕</button>
                </div>
              ))}
              {pages.length === 0 && (
                <p className="text-xs text-[#555] text-center py-4">No pages yet. Create one!</p>
              )}
            </div>
          )}

          {panel === 'editor' && selectedBlockObj && (
            <BlockEditor block={selectedBlockObj} onChange={updateBlock} />
          )}

          {panel === 'editor' && !selectedBlockObj && (
            <div className="flex flex-col items-center justify-center h-40 text-[#555] text-xs p-4 text-center">
              Click a block in the canvas to edit its content
            </div>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#0d0d0d] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold gold-text">App Builder</span>
            {activePage && (
              <span className="text-xs text-[#555]">→ {activePage.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewMode(!previewMode)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${previewMode ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#ffd700]' : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:text-white'}`}>
              {previewMode ? '✏️ Edit' : '👁️ Preview'}
            </button>
            <button onClick={generateHtml} disabled={!activePage || activePage.blocks.length === 0}
              className="gold-button px-3 py-1.5 rounded-lg text-xs disabled:opacity-50">
              🚀 Export HTML
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#111]">
          {!activePage ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">🏗️</div>
              <h2 className="text-white font-semibold text-lg mb-2">No page selected</h2>
              <p className="text-[#555] text-sm mb-4">Create your first page to start building</p>
              <button onClick={() => { createPage(); setPanel('blocks'); }} className="gold-button px-6 py-2.5 rounded-xl text-sm">
                Create First Page
              </button>
            </div>
          ) : activePage.blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">✚</div>
              <h2 className="text-white font-semibold mb-2">Start building</h2>
              <p className="text-[#555] text-sm mb-4">Add blocks from the panel on the left</p>
              <button onClick={() => setPanel('blocks')} className="gold-button px-6 py-2.5 rounded-xl text-sm">
                Browse Blocks
              </button>
            </div>
          ) : (
            <div className={`max-w-3xl mx-auto my-4 rounded-xl overflow-hidden border ${previewMode ? 'border-transparent' : 'border-[#2a2a2a]'} bg-[#0a0a0a]`}>
              {activePage.blocks.map((block, idx) => (
                <div key={block.id}
                  className={`relative group ${!previewMode ? 'hover:outline hover:outline-1 hover:outline-[#d4af37]/30 cursor-pointer' : ''} ${selectedBlock === block.id && !previewMode ? 'outline outline-1 outline-[#d4af37]' : ''}`}
                  onClick={() => { if (!previewMode) { setSelectedBlock(block.id); setPanel('editor'); } }}
                  draggable={!previewMode}
                  onDragStart={() => { dragRef.current = block.id; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragRef.current || dragRef.current === block.id) return;
                    const blocks = [...activePage.blocks];
                    const fromIdx = blocks.findIndex((b) => b.id === dragRef.current);
                    const toIdx = idx;
                    const [moved] = blocks.splice(fromIdx, 1);
                    blocks.splice(toIdx, 0, moved!);
                    updatePage({ ...activePage, blocks });
                    dragRef.current = null;
                  }}
                >
                  {!previewMode && (
                    <div className="absolute top-1 right-1 z-10 hidden group-hover:flex items-center gap-1 bg-[#0a0a0a]/90 border border-[#2a2a2a] rounded-lg px-1.5 py-1">
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }} disabled={idx === 0}
                        className="text-[10px] text-[#888] hover:text-white disabled:opacity-30 px-1">▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }} disabled={idx === activePage.blocks.length - 1}
                        className="text-[10px] text-[#888] hover:text-white disabled:opacity-30 px-1">▼</button>
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        className="text-[10px] text-red-400 hover:text-red-300 px-1">✕</button>
                    </div>
                  )}
                  <BlockPreview block={block} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Block order list (only in edit mode with blocks) */}
      {!previewMode && activePage && activePage.blocks.length > 0 && (
        <div className="w-44 flex-shrink-0 border-l border-[#2a2a2a] bg-[#0d0d0d] overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#2a2a2a] text-[10px] text-[#555] uppercase tracking-wider">Layers</div>
          {activePage.blocks.map((b, i) => {
            const lib = BLOCK_LIBRARY.find((l) => l.type === b.type);
            return (
              <div key={b.id}
                onClick={() => { setSelectedBlock(b.id); setPanel('editor'); }}
                className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-all border-b border-[#1a1a1a] ${selectedBlock === b.id ? 'bg-[#d4af37]/10 text-[#ffd700]' : 'text-[#666] hover:text-white hover:bg-[#1a1a1a]'}`}>
                <span>{lib?.icon}</span>
                <span className="truncate flex-1">{lib?.label}</span>
                <span className="text-[#444]">{i + 1}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Export modal */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowPublish(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold gold-text">Exported HTML</h3>
              <button onClick={() => { navigator.clipboard.writeText(publishCode); }}
                className="text-xs gold-button px-3 py-1.5 rounded-lg">Copy HTML</button>
            </div>
            <pre className="flex-1 overflow-auto text-xs text-[#888] bg-[#0a0a0a] p-4 rounded-xl border border-[#2a2a2a] font-mono">
              {publishCode}
            </pre>
            <button onClick={() => setShowPublish(false)} className="mt-4 text-xs text-[#666] hover:text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
