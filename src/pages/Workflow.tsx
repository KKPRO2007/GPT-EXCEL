import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../api'

interface Workflow { id: string; name: string; status: 'active' | 'paused'; schedule: string; lastRun: string; runs: number; description?: string }

const SCHEDULE_OPTIONS = ['Manual', 'Daily', 'Weekly', 'Monthly', 'Every Monday', 'Every Friday', 'End of Semester']

export default function Workflow() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', schedule: 'Manual', description: '' })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.getWorkflows()
      setWorkflows(res)
    } catch { setError('Backend offline') }
    setLoading(false)
  }

  const create = async () => {
    if (!form.name.trim()) return
    try {
      const w = await api.createWorkflow(form)
      setWorkflows(prev => [w, ...prev])
      setShowCreate(false); setForm({ name: '', schedule: 'Manual', description: '' })
    } catch { setError('Create failed') }
  }

  const toggleStatus = async (w: Workflow) => {
    const newStatus = w.status === 'active' ? 'paused' : 'active'
    try {
      await api.updateWorkflow(w.id, { status: newStatus })
      setWorkflows(prev => prev.map(wf => wf.id === w.id ? { ...wf, status: newStatus } : wf))
    } catch { setError('Update failed') }
  }

  const runNow = async (id: string) => {
    setRunningId(id)
    try {
      const res = await api.runWorkflow(id)
      setWorkflows(prev => prev.map(w => w.id === id ? res.workflow : w))
    } catch { setError('Run failed') }
    setRunningId(null)
  }

  const deleteWf = async (id: string) => {
    if (!confirm('Delete this workflow?')) return
    try { await api.deleteWorkflow(id); setWorkflows(prev => prev.filter(w => w.id !== id)) }
    catch { setError('Delete failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: '1.3rem', letterSpacing: -0.5, marginBottom: 4 }}>Workflow Automation</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Schedule recurring tasks and report generation</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create Workflow</button>
          </div>

          {error && <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: '0.78rem', color: '#fca5a5', marginBottom: 14 }}>{error} <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>×</button></div>}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
          ) : workflows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>⌘</div>
              <p>No workflows yet. Create one to automate recurring tasks.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>+ Create Workflow</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {workflows.map(w => (
                <div key={w.id} style={{ background: 'var(--surface)', border: `1px solid ${w.status === 'active' ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: w.status === 'active' ? 'rgba(34,197,94,0.12)' : 'var(--surface-2)', border: `1px solid ${w.status === 'active' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⌘</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{w.name}</span>
                        <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: w.status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)', color: w.status === 'active' ? 'var(--green)' : 'var(--text-muted)', border: `1px solid ${w.status === 'active' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}` }}>{w.status === 'active' ? '● Active' : '○ Paused'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>📅 {w.schedule}</span>
                        <span>🕐 Last: {w.lastRun}</span>
                        <span>▶ {w.runs} runs</span>
                        {w.description && <span>· {w.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleStatus(w)}>{w.status === 'active' ? 'Pause' : 'Activate'}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => runNow(w.id)} disabled={runningId === w.id}>{runningId === w.id ? '⟳' : '▶ Run'}</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }} onClick={() => deleteWf(w.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create modal */}
          {showCreate && (
            <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
              <div className="modal-box" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
                <div className="modal-title">Create Workflow</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="input-wrap">
                    <label className="input-label">Workflow Name *</label>
                    <input className="input" placeholder="e.g., Weekly Result Analysis" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                  </div>
                  <div className="input-wrap">
                    <label className="input-label">Schedule</label>
                    <select className="input" value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}>
                      {SCHEDULE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="input-wrap">
                    <label className="input-label">Description</label>
                    <input className="input" placeholder="Optional description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={create} disabled={!form.name.trim()}>Create</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}