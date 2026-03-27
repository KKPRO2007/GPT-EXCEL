import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import AIChatPanel from '../components/AIChatPanel'

interface RecentFile {
  id: string; name: string; type: 'excel' | 'doc' | 'pdf' | 'csv';
  modified: string; size: string; starred: boolean;
}
interface Activity {
  id: string; icon: string; text: string; time: string; type: 'success' | 'info' | 'warning';
}
interface Metric { label: string; value: string; change: string; up: boolean; sparkline: number[] }

const sampleFiles: RecentFile[] = [
  { id: '1', name: 'Q4 Financial Model.xlsx', type: 'excel', modified: '2 min ago', size: '1.2 MB', starred: true },
  { id: '2', name: 'Sales Dashboard 2025.xlsx', type: 'excel', modified: '1 hr ago', size: '840 KB', starred: false },
  { id: '3', name: 'Project Proposal.docx', type: 'doc', modified: '3 hr ago', size: '320 KB', starred: true },
  { id: '4', name: 'Customer Data Export.csv', type: 'csv', modified: 'Yesterday', size: '4.1 MB', starred: false },
  { id: '5', name: 'Annual Report 2024.pdf', type: 'pdf', modified: '2 days ago', size: '2.8 MB', starred: false },
  { id: '6', name: 'Budget Tracker Template.xlsx', type: 'excel', modified: '3 days ago', size: '560 KB', starred: true },
]

const sampleActivity: Activity[] = [
  { id: '1', icon: '⊞', text: 'Generated "Q4 Revenue Forecast" — 12 sheets', time: '2m ago', type: 'success' },
  { id: '2', icon: '◱', text: 'Document "Project Proposal" exported as PDF', time: '1h ago', type: 'info' },
  { id: '3', icon: '◎', text: 'Voice command: "Create pivot table for sales data"', time: '2h ago', type: 'success' },
  { id: '4', icon: '◈', text: '43 files categorized and tagged automatically', time: '4h ago', type: 'success' },
  { id: '5', icon: '⌘', text: 'Workflow "Weekly Report" scheduled for Monday 09:00', time: 'Yesterday', type: 'info' },
  { id: '6', icon: '◬', text: 'API rate limit warning — 89% of free tier used', time: 'Yesterday', type: 'warning' },
]

const metrics: Metric[] = [
  { label: 'Files Generated', value: '248', change: '+12 today', up: true, sparkline: [4,6,5,8,7,9,11,10,12,14,13,16] },
  { label: 'Tokens Used', value: '1.2M', change: '+84k today', up: true, sparkline: [20,22,18,25,30,28,35,33,40,38,42,45] },
  { label: 'Storage Used', value: '3.4 GB', change: '+120 MB', up: true, sparkline: [10,12,13,14,15,17,19,20,22,24,25,27] },
  { label: 'Free Tier Left', value: '23%', change: '27 remaining', up: false, sparkline: [80,74,68,62,55,49,43,38,34,30,27,23] },
]

const Sparkline = ({ data, color = 'currentColor' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data), min = Math.min(...data)
  const norm = (v: number) => 1 - (v - min) / (max - min || 1)
  const w = 64, h = 24
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${norm(v) * h}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const FileIcon = ({ type }: { type: RecentFile['type'] }) => {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 6,
      background: 'var(--surface-3)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
      fontWeight: 700, color: 'var(--text-muted)',
      flexShrink: 0,
    }}>
      {type.toUpperCase().slice(0, 3)}
    </div>
  )
}

const QuickAction = ({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.15s', width: '100%',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
  >
    <span style={{ fontSize: 20, lineHeight: 1.2 }}>{icon}</span>
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
    </div>
  </button>
)

export default function Dashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [files, setFiles] = useState<RecentFile[]>(sampleFiles)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sortBy, setSortBy] = useState<'modified' | 'name' | 'size'>('modified')
  const [activeTab, setActiveTab] = useState<'recent' | 'starred' | 'shared'>('recent')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('')
  const [usageExpanded, setUsageExpanded] = useState(false)
  const [promptValue, setPromptValue] = useState('')
  const [generating, setGenerating] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  const filteredFiles = files
    .filter(f => {
      if (activeTab === 'starred') return f.starred
      return true
    })
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

  const toggleStar = (id: string) => {
    setFiles(p => p.map(f => f.id === id ? { ...f, starred: !f.starred } : f))
  }

  const handleQuickPrompt = async () => {
    if (!promptValue.trim()) return
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1800))
    setGenerating(false)
    navigate('/excel')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuickPrompt()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg)',
      fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        .file-row:hover { background: var(--surface) !important; }
        .file-row:hover .file-actions { opacity: 1 !important; }
        .file-actions { opacity: 0; transition: opacity 0.15s; display: flex; gap: 4px; align-items: center; }
        .metric-card { transition: all 0.2s; }
        .metric-card:hover { border-color: var(--border-2); transform: translateY(-1px); }
        .prompt-area:focus-within .prompt-footer { opacity: 1 !important; }
        .prompt-footer { opacity: 0; transition: opacity 0.2s; }
        @media (max-width: 1200px) { .qa-grid { grid-template-columns: 1fr; } }
      `}</style>

      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />

        <main style={{
          flex: 1, overflowY: 'auto', background: 'var(--bg-2)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '24px 28px 0',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: -0.5 }}>
                {greeting}. 👋
              </h1>
            </div>

            <div className="prompt-area" style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
                <div style={{
                  width: 26, height: 26, background: 'var(--bg-3)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, flexShrink: 0, marginTop: 2,
                }}>⊞</div>
                <textarea
                  ref={promptRef}
                  className="input"
                  value={promptValue}
                  onChange={e => setPromptValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={'Ask GPT-EXCEL anything... "Create a sales pipeline tracker" or "Compare Q3 vs Q4 data"'}
                  style={{
                    flex: 1, border: 'none', background: 'transparent', resize: 'none',
                    minHeight: 20, maxHeight: 120, boxShadow: 'none',
                    fontSize: '0.875rem', padding: 0, lineHeight: 1.6,
                  }}
                  rows={1}
                  onInput={e => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }}
                />
              </div>
              <div className="prompt-footer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 14px', borderTop: '1px solid var(--border)',
                background: 'var(--bg-3)',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Excel', 'Document', 'Chart', 'Pivot'].map((t, idx) => (
                    <button key={idx} className="btn btn-xs btn-outline"
                      onClick={() => setPromptValue(p => p ? p + ` [${t}]` : `Create a ${t.toLowerCase()}: `)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <kbd>⌘</kbd><kbd>↵</kbd>
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleQuickPrompt}
                    disabled={!promptValue.trim() || generating}
                    style={{ minWidth: 70 }}
                  >
                    {generating ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Generating</> : 'Generate →'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex', gap: 0,
              borderTop: '1px solid var(--border)',
              marginLeft: -28, marginRight: -28,
              paddingLeft: 28,
              overflowX: 'auto',
            }}>
              {[
                { icon: '⊞', label: 'New Spreadsheet' },
                { icon: '◱', label: 'New Document' },
                { icon: '◬', label: 'New Chart' },
                { icon: '⌘', label: 'New Workflow' },
                { icon: '◈', label: 'Organize Files' },
                { icon: '◎', label: 'Voice Input' },
              ].map((a, idx) => (
                <button key={idx} className="btn btn-ghost btn-sm" style={{
                  borderRadius: 0, height: 38, borderRight: '1px solid var(--border)',
                  fontSize: '0.75rem', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
                }}
                  onClick={() => navigate('/excel')}
                >
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '20px 28px', display: 'flex', gap: 20 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {metrics.map((m, i) => (
                  <div key={i} className="metric-card" style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>
                          {m.value}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.02em' }}>
                          {m.label}
                        </div>
                      </div>
                      <Sparkline data={m.sparkline} color={m.up ? 'var(--success)' : 'var(--error)'} />
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                      color: m.up ? 'var(--success)' : 'var(--error)',
                    }}>
                      {m.up ? '↑' : '↓'} {m.change}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', flex: 1,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderBottom: '1px solid var(--border)',
                }}>
                  <div className="tabs" style={{ flex: 1 }}>
                    {(['recent', 'starred', 'shared'] as const).map(tab => (
                      <div key={tab} className={`tab${activeTab === tab ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                        style={{ textTransform: 'capitalize' }}
                      >{tab}</div>
                    ))}
                  </div>
                  <div className="search-bar" style={{ width: 180 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    style={{ width: 'auto', padding: '5px 8px', fontSize: '0.75rem' }}
                  >
                    <option value="modified">Modified</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                  </select>
                  <button className="btn btn-icon-sm btn-ghost" onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}>
                    {viewMode === 'list' ? '⊟' : '⊞'}
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => navigate('/excel')}>
                    + New
                  </button>
                </div>

                <div style={{ overflowY: 'auto', maxHeight: 320 }}>
                  {filteredFiles.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon" style={{ fontSize: 32 }}>◱</div>
                      <h3>No files found</h3>
                      <p>Try adjusting your search or create a new file</p>
                      <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate('/excel')}>
                        Create file →
                      </button>
                    </div>
                  ) : (
                    filteredFiles.map(f => (
                      <div key={f.id} className="file-row" style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', transition: 'background 0.1s',
                        background: selectedFile === f.id ? 'var(--accent-dim)' : 'transparent',
                      }}
                        onClick={() => setSelectedFile(f.id === selectedFile ? null : f.id)}
                        onDoubleClick={() => navigate('/excel')}
                      >
                        <FileIcon type={f.type} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                            {f.modified} · {f.size}
                          </div>
                        </div>
                        <div className="file-actions">
                          <button className="btn btn-icon-sm btn-ghost" title="Star"
                            onClick={e => { e.stopPropagation(); toggleStar(f.id) }}
                            style={{ color: f.starred ? 'var(--warning)' : undefined }}
                          >
                            {f.starred ? '★' : '☆'}
                          </button>
                          <button className="btn btn-icon-sm btn-ghost" title="Open" onClick={e => { e.stopPropagation(); navigate('/excel') }}>↗</button>
                          <button className="btn btn-icon-sm btn-ghost" title="Download">↓</button>
                          <button className="btn btn-icon-sm btn-ghost" title="More">…</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div className="panel-header">
                  <span>Activity</span>
                  <button className="btn btn-xs btn-ghost" style={{ marginLeft: 'auto' }}>View all</button>
                </div>
                <div style={{ padding: '6px 0' }}>
                  {sampleActivity.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '7px 14px',
                    }}>
                      <div style={{
                        width: 28, height: 28, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: a.type === 'warning' ? 'var(--warning-bg)' : a.type === 'success' ? 'var(--success-bg)' : 'var(--bg-3)',
                        color: a.type === 'warning' ? 'var(--warning)' : a.type === 'success' ? 'var(--success)' : 'var(--text-muted)',
                        fontSize: 14, border: '1px solid var(--border)',
                      }}>
                        {a.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>{a.text}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div className="panel-header">Quick Actions</div>
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <QuickAction icon="⊞" label="Excel from prompt" desc="Generate .xlsx from text" onClick={() => navigate('/excel')} />
                  <QuickAction icon="◱" label="Write a document" desc="Reports, proposals, CVs" onClick={() => navigate('/excel')} />
                  <QuickAction icon="◬" label="Build a chart" desc="From data or prompt" onClick={() => navigate('/excel')} />
                  <QuickAction icon="◎" label="Voice command" desc="Speak your request" onClick={() => {}} />
                </div>
              </div>

              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div className="panel-header" style={{ cursor: 'pointer' }} onClick={() => setUsageExpanded(p => !p)}>
                  <span>Usage</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Free Plan</span>
                  <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{usageExpanded ? '▲' : '▼'}</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {[
                    { label: 'AI Generations', used: 27, total: 50, color: 'var(--accent)' },
                    { label: 'Storage', used: 3.4, total: 5, color: 'var(--info)', suffix: ' GB' },
                    { label: 'Voice Minutes', used: 8, total: 30, color: 'var(--success)' },
                  ].map((u, idx) => (
                    <div key={idx} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{u.label}</span>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {u.used}{u.suffix || ''} / {u.total}{u.suffix || ''}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${(u.used / u.total) * 100}%`, background: u.color }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-primary btn-sm w-full" style={{ marginTop: 6 }}>
                    Upgrade to Pro →
                  </button>
                </div>
              </div>

              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div className="panel-header">Recent Prompts</div>
                <div style={{ padding: '6px 0' }}>
                  {[
                    'Monthly budget tracker with charts',
                    'Sales pipeline Q4 forecast',
                    'Employee attendance sheet',
                    'Revenue comparison 2023 vs 2024',
                  ].map((p, i) => (
                    <div key={i} style={{
                      padding: '7px 14px', fontSize: '0.75rem',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.1s',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => { setPromptValue(p); promptRef.current?.focus() }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <AIChatPanel />
      </div>
    </div>
  )
}