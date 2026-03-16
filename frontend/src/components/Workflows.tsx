import { useState, useRef } from 'react';
import { runWorkflow, getWorkflowStatus } from '../api';
import type { Workflow, WorkflowNode, WorkflowNodeType, WorkflowEdge } from '../types';

const NODE_TYPES: Array<{ type: WorkflowNodeType; label: string; icon: string; color: string }> = [
  { type: 'trigger', label: 'Trigger', icon: '⚡', color: '#f59e0b' },
  { type: 'scrape', label: 'Scrape URL', icon: '🔍', color: '#3b82f6' },
  { type: 'filter', label: 'Filter', icon: '🔽', color: '#8b5cf6' },
  { type: 'transform', label: 'Transform', icon: '🔧', color: '#06b6d4' },
  { type: 'save_crm', label: 'Save to CRM', icon: '👥', color: '#22c55e' },
  { type: 'send_email', label: 'Send Email', icon: '📧', color: '#ec4899' },
  { type: 'llm', label: 'LLM Process', icon: '🤖', color: '#d4af37' },
  { type: 'webhook', label: 'Webhook', icon: '🔗', color: '#f97316' },
];

function makeId() {
  return Math.random().toString(36).slice(2);
}

function getNextSuggestion(nodes: WorkflowNode[]): WorkflowNodeType | null {
  if (nodes.length === 0) return 'trigger';
  const last = nodes[nodes.length - 1];
  const map: Partial<Record<WorkflowNodeType, WorkflowNodeType | null>> = {
    trigger: 'scrape',
    scrape: 'filter',
    filter: 'transform',
    transform: 'save_crm',
    save_crm: 'send_email',
    send_email: null,
  };
  return map[last.type] ?? null;
}

interface NodeCardProps {
  node: WorkflowNode;
  index: number;
  onRemove: (id: string) => void;
  total: number;
}

function NodeCard({ node, index, onRemove, total }: NodeCardProps) {
  const meta = NODE_TYPES.find((n) => n.type === node.type)!;
  return (
    <div className="relative flex items-start gap-2">
      {/* Connector line */}
      {index < total - 1 && (
        <div className="absolute left-5 top-12 w-0.5 h-8 bg-[#2a2a2a] z-0" />
      )}
      <div
        className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
        style={{ backgroundColor: `${meta.color}20`, border: `2px solid ${meta.color}` }}
      >
        {meta.icon}
      </div>
      <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#d4af37]/40 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">{node.label}</div>
            <div className="text-xs text-[#555] mt-0.5">{meta.label}</div>
          </div>
          <button onClick={() => onRemove(node.id)} className="text-[#444] hover:text-red-400 text-sm transition-colors">✕</button>
        </div>
      </div>
    </div>
  );
}

const SAVED_KEY = 'xps_workflows';

function loadSaved(): Workflow[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as Workflow[];
  } catch {
    return [];
  }
}

export default function Workflows() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>(loadSaved);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'saved'>('editor');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const suggestion = getNextSuggestion(nodes);

  function addNode(type: WorkflowNodeType) {
    const meta = NODE_TYPES.find((n) => n.type === type)!;
    const newNode: WorkflowNode = {
      id: makeId(),
      type,
      label: meta.label,
      x: 100 + nodes.length * 20,
      y: 100 + nodes.length * 60,
      config: {},
    };
    if (nodes.length > 0) {
      setEdges((prev) => [...prev, { from: nodes[nodes.length - 1].id, to: newNode.id }]);
    }
    setNodes((prev) => [...prev, newNode]);
  }

  function removeNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
  }

  function clearWorkflow() {
    setNodes([]);
    setEdges([]);
    setRunStatus(null);
    setRunLog([]);
  }

  function saveWorkflow() {
    const wf: Workflow = { id: makeId(), name: workflowName, nodes, edges };
    const updated = [...savedWorkflows, wf];
    setSavedWorkflows(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    alert(`Workflow "${workflowName}" saved!`);
  }

  function loadWorkflow(wf: Workflow) {
    setNodes(wf.nodes);
    setEdges(wf.edges);
    setWorkflowName(wf.name);
    setActiveView('editor');
  }

  function deleteWorkflow(id: string) {
    const updated = savedWorkflows.filter((w) => w.id !== id);
    setSavedWorkflows(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  }

  async function handleRun() {
    if (nodes.length === 0) return;
    setRunning(true);
    setRunStatus('running');
    setRunLog(['Starting workflow…']);

    try {
      const wf: Workflow = { id: makeId(), name: workflowName, nodes, edges };
      const result = await runWorkflow(wf);
      const runId = result.runId;

      // Poll for status
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const status = await getWorkflowStatus(runId);
          setRunLog(status.log);
          setRunStatus(status.status);
          if (status.status === 'completed' || status.status === 'failed' || attempts > 30) {
            clearInterval(pollRef.current!);
            setRunning(false);
          }
        } catch {
          clearInterval(pollRef.current!);
          setRunning(false);
          setRunStatus('failed');
        }
      }, 500);
    } catch {
      setRunStatus('failed');
      setRunLog(['Failed to start workflow']);
      setRunning(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold gold-text">Workflow Builder</h2>
          <p className="text-[#666] text-xs mt-0.5">Drag nodes to build automations</p>
        </div>
        <div className="flex gap-2">
          {(['editor', 'saved'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-all ${
                activeView === v ? 'bg-[#d4af37] text-black font-semibold' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white'
              }`}
            >
              {v} {v === 'saved' ? `(${savedWorkflows.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'saved' ? (
        <div className="flex-1 overflow-y-auto p-6">
          {savedWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#555]">
              <div className="text-3xl mb-2">🔄</div>
              <div className="text-sm">No saved workflows</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedWorkflows.map((wf) => (
                <div key={wf.id} className="gold-card rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{wf.name}</div>
                      <div className="text-xs text-[#666] mt-0.5">{wf.nodes.length} nodes · {wf.edges.length} connections</div>
                    </div>
                    <button onClick={() => deleteWorkflow(wf.id)} className="text-[#444] hover:text-red-400 text-sm">🗑️</button>
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {wf.nodes.map((n) => {
                      const meta = NODE_TYPES.find((t) => t.type === n.type);
                      return (
                        <span key={n.id} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${meta?.color}20`, color: meta?.color }}>
                          {meta?.icon} {n.label}
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={() => loadWorkflow(wf)} className="mt-3 text-xs text-[#d4af37] hover:underline">Load workflow →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Node palette */}
          <div className="w-48 border-r border-[#2a2a2a] flex flex-col bg-[#0d0d0d] flex-shrink-0">
            <div className="p-3 border-b border-[#2a2a2a]">
              <div className="text-xs text-[#666] font-medium uppercase tracking-wider">Node Types</div>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto flex-1">
              {NODE_TYPES.map((nt) => (
                <button
                  key={nt.type}
                  onClick={() => addNode(nt.type)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-left transition-all hover:bg-[#1a1a1a] hover:text-white text-[#888] ${
                    suggestion === nt.type ? 'border border-[#d4af37]/50 bg-[#d4af37]/5 text-[#ffd700]' : ''
                  }`}
                  title={suggestion === nt.type ? '⭐ Recommended next step' : ''}
                >
                  <span>{nt.icon}</span>
                  <span>{nt.label}</span>
                  {suggestion === nt.type && <span className="ml-auto text-[8px] text-[#d4af37]">★</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#d4af37] w-48"
              />
              <button onClick={saveWorkflow} disabled={nodes.length === 0} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-[#ffd700] hover:border-[#d4af37] rounded-lg transition-all disabled:opacity-40">
                💾 Save
              </button>
              <button onClick={clearWorkflow} disabled={nodes.length === 0} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-red-400 rounded-lg transition-all disabled:opacity-40">
                🗑️ Clear
              </button>
              <div className="flex-1" />
              <button
                onClick={handleRun}
                disabled={running || nodes.length === 0}
                className="gold-button px-4 py-1.5 text-xs rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {running ? '⏳ Running…' : '▶ Run Workflow'}
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Node list (canvas) */}
              <div className="flex-1 overflow-y-auto p-6 workflow-canvas">
                {nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#333]">
                    <div className="text-5xl mb-3">🔄</div>
                    <div className="text-sm">Click node types on the left to build your workflow</div>
                    <div className="text-xs mt-1">⭐ Starred nodes are recommended next steps</div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    {nodes.map((node, i) => (
                      <NodeCard key={node.id} node={node} index={i} onRemove={removeNode} total={nodes.length} />
                    ))}
                  </div>
                )}
              </div>

              {/* Run log */}
              {(runStatus || runLog.length > 0) && (
                <div className="w-72 border-l border-[#2a2a2a] flex flex-col bg-[#0d0d0d] flex-shrink-0">
                  <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between">
                    <div className="text-xs font-medium text-[#888]">Run Log</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      runStatus === 'completed' ? 'bg-green-900/40 text-green-400' :
                      runStatus === 'failed' ? 'bg-red-900/40 text-red-400' :
                      'bg-yellow-900/40 text-yellow-400'
                    }`}>
                      {runStatus}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {runLog.map((line, i) => (
                      <div key={i} className="text-[10px] text-[#666] font-mono">{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
