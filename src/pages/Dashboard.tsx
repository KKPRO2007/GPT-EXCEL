import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../index'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import AIChatPanel from '../components/AIChatPanel'
import { api } from '../api'

const Sparkline = ({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data), min = Math.min(...data)
  const norm = (v: number) => 1 - (v - min) / (max - min || 1)
  const w = 64, h = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${norm(v) * h}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={norm(data[data.length - 1]) * h} r={2.5} fill={color} />
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.app.user)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [backendOnline, setBackendOnline] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    loadData()
  }, [])

  const loadData = async () => {
    try {
      await api.health()
      setBackendOnline(true)
      const [dashStats, files] = await Promise.all([api.getDashboardStats(), api.getFiles()])
      setStats(dashStats)
      setRecentFiles((files as any[]).slice(-6).reverse())
    } catch {
      setBackendOnline(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name))
    if (!files.length) return
    try {
      await api.uploadFiles(files, user?.department || 'general', user?.email || 'user')
      loadData()
      navigate('/excel')
    } catch {}
  }

  const handlePrompt = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    await new Promise(r => setTimeout(r, 600))
    setGenerating(false)
    navigate('/excel')
  }

  const METRICS = [
    { label: 'Total Files', value: stats?.totalFiles ?? '—', change: 'uploaded', up: true, sparkline: [2,4,3,6,5,7,8,7,9,10,11,stats?.totalFiles||0], color: 'var(--blue)' },
    { label: 'Faculty Users', value: stats?.totalUsers ?? '—', change: 'active', up: true, sparkline: [10,12,14,13,16,18,20,22,24,26,28,stats?.totalUsers||0], color: 'var(--green)' },
    { label: 'Workflows', value: stats?.activeWorkflows ?? '—', change: 'active', up: true, sparkline: [1,1,2,2,3,3,4,4,5,5,6,stats?.activeWorkflows||0], color: 'var(--purple)' },
    { label: 'Departments', value: stats?.departments?.length ?? '—', change: 'connected', up: true, sparkline: [1,2,2,3,3,4,4,5,5,6,6,stats?.departments?.length||0], color: 'var(--orange)' },
  ]

  const getFileIcon = (type: string) => {
    const icons: Record<string, { icon: string; color: string }> = {
      xlsx: { icon: 'XL', color: 'var(--green)' }, xls: { icon: 'XL', color: 'var(--green)' },
      csv: { icon: 'CSV', color: 'var(--teal)' }, pdf: { icon: 'PDF', color: 'var(--red)' },
      docx: { icon: 'W', color: 'var(--blue)' }, doc: { icon: 'W', color: 'var(--blue)' },
      pptx: { icon: 'PPT', color: 'var(--orange)' },
    }
    return icons[type] || { icon: type.toUpperCase().slice(0, 3), color: 'var(--text-muted)' }
  }

  const quickActions = [
    { icon: '⊞', label: 'Analyze Excel', color: 'var(--green)', path: '/excel' },
    { icon: '◱', label: 'File Manager', color: 'var(--blue)', path: '/file-manager' },
    { icon: '◬', label: 'Compare Files', color: 'var(--purple)', path: '/excel' },
    { icon: '◱', label: 'Generate Doc', color: 'var(--orange)', path: '/documents' },
    { icon: '⌘', label: 'Workflows', color: 'var(--teal)', path: '/workflow' },
    { icon: '⚙', label: 'Settings', color: 'var(--text-muted)', path: '/settings' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-2)', padding: '24px 28px' }}>

          {/* Backend status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: backendOnline ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ color: 'var(--text-muted)' }}>{backendOnline ? 'Backend online · localhost:3001' : 'Backend offline — run: cd server && npm start'}</span>
          </div>

          {/* Greeting */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <h1 style={{ fontSize: '1.5rem', letterSpacing: -0.5, marginBottom: 4 }}>
              {greeting}, {user?.name?.split(' ')[0] || 'there'}.
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {user?.department && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{user.department}</span>}
              {user?.department && ' · '}
              Analyze student data, compare sections, generate reports.
            </p>
          </div>

          {/* Drop zone prompt bar */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              background: dragOver ? 'var(--accent-dim)' : 'var(--surface)',
              border: `1px ${dragOver ? 'solid' : 'solid'} ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, overflow: 'hidden', marginBottom: 20,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px' }}>
              <div style={{ width: 28, height: 28, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, borderRadius: 6, flexShrink: 0, marginTop: 1 }}>⊞</div>
              <textarea
                ref={promptRef}
                className="input"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePrompt() }}
                placeholder={dragOver ? 'Drop Excel files here to analyze...' : 'Ask anything or drag & drop Excel files... "Analyze Q4 results" or "Compare section A and B"'}
                style={{ flex: 1, border: 'none', background: 'transparent', resize: 'none', minHeight: 22, maxHeight: 100, boxShadow: 'none', fontSize: '0.875rem', padding: 0, lineHeight: 1.6 }}
                rows={1}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 90) + 'px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Analyze Excel', 'Top Students', 'Section Compare', 'Below 75%'].map(t => (
                  <button key={t} className="btn btn-xs btn-outline" onClick={() => { setPrompt(t); promptRef.current?.focus() }}>{t}</button>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={handlePrompt} disabled={!prompt.trim() || generating} style={{ minWidth: 90 }}>
                {generating ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Running</> : 'Go →'}
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {METRICS.map((m, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = m.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, letterSpacing: -0.5, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</div>
                  </div>
                  <Sparkline data={m.sparkline} color={m.color} />
                </div>
                <div style={{ marginTop: 8, fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: m.color }}>● {m.change}</div>
              </div>
            ))}
          </div>

          {/* Quick actions + recent files */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 16 }}>
            {/* Recent files */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Recent Files</span>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/file-manager')}>View All</button>
              </div>
              {recentFiles.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>⊞</div>
                  No files yet. Upload Excel files to get started.
                  <br /><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/file-manager')}>Upload Files</button>
                </div>
              ) : recentFiles.map(f => {
                const icon = getFileIcon(f.type)
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background var(--tr)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate('/excel')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: icon.color, flexShrink: 0 }}>{icon.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.department} · {(f.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button className="btn btn-xs btn-outline" onClick={e => { e.stopPropagation(); navigate('/excel') }}>Analyze</button>
                  </div>
                )
              })}
            </div>

            {/* Quick actions */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Quick Actions</div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {quickActions.map(a => (
                  <button key={a.label} onClick={() => navigate(a.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = a.color; el.style.background = `${a.color}10` }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--surface-2)' }}
                  >
                    <span style={{ color: a.color, fontSize: 16, width: 20, textAlign: 'center' }}>{a.icon}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>{a.label}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Department overview */}
          {stats?.departments && stats.departments.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Departments</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stats.departments.map((dept: string, i: number) => {
                  const colors = ['var(--blue)', 'var(--green)', 'var(--purple)', 'var(--orange)', 'var(--teal)']
                  const c = colors[i % colors.length]
                  return (
                    <div key={dept} style={{ padding: '6px 14px', background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 20, fontSize: '0.78rem', color: c, fontWeight: 500 }}>{dept}</div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
        <AIChatPanel />
      </div>
    </div>
  )
}