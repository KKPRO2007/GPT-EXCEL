import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../index'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../api'

interface Doc { id: string; title: string; type: string; content: string; createdAt: string }

const TEMPLATES = [
  { type: 'report', icon: '📊', label: 'Student Performance Report', prompt: 'Generate a comprehensive student performance report with pass/fail analysis' },
  { type: 'proposal', icon: '📝', label: 'Academic Proposal', prompt: 'Write a formal academic proposal for curriculum improvement' },
  { type: 'notice', icon: '📋', label: 'Exam Notice', prompt: 'Create an official exam notification for students' },
  { type: 'minutes', icon: '📄', label: 'Meeting Minutes', prompt: 'Generate faculty meeting minutes template' },
  { type: 'circular', icon: '🔔', label: 'Department Circular', prompt: 'Write a departmental circular for faculty' },
  { type: 'certificate', icon: '🏆', label: 'Certificate Template', prompt: 'Create a student achievement certificate' },
]

export default function Documents() {
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.app.user)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [prompt, setPrompt] = useState('')
  const [docType, setDocType] = useState('report')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const generate = async (customPrompt?: string, customType?: string) => {
    const p = customPrompt || prompt
    if (!p.trim()) return
    setGenerating(true); setError('')
    try {
      const doc = await api.generateDoc(customType || docType, { prompt: p, user: user?.name, department: user?.department }, p.slice(0, 60))
      setDocs(prev => [doc, ...prev])
      setPrompt('')
    } catch (e: any) {
      setError('Backend offline — run: cd server && npm start')
      // fallback: local mock
      const mock: Doc = {
        id: `doc${Date.now()}`, title: p.slice(0, 50), type: customType || docType,
        content: `${p.slice(0,60)}\n\nGenerated: ${new Date().toLocaleString()}\nBy: ${user?.name || 'User'}\nDepartment: ${user?.department || 'N/A'}\n\n[Backend offline — connect server for full AI generation]`,
        createdAt: new Date().toISOString()
      }
      setDocs(prev => [mock, ...prev])
      setPrompt('')
    }
    setGenerating(false)
  }

  const downloadDoc = (doc: Doc) => {
    const blob = new Blob([doc.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${doc.title}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const TYPE_COLORS: Record<string, string> = { report: 'var(--blue)', proposal: 'var(--purple)', notice: 'var(--orange)', minutes: 'var(--teal)', circular: 'var(--green)', certificate: 'var(--yellow)' }
  const TYPE_ICONS: Record<string, string> = { report: '📊', proposal: '📝', notice: '📋', minutes: '📄', circular: '🔔', certificate: '🏆' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: '1.3rem', letterSpacing: -0.5, marginBottom: 4 }}>Documents</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Generate reports, notices, proposals, and academic documents</p>
            </div>
          </div>

          {error && <div style={{ padding: '8px 14px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--orange)', marginBottom: 16 }}>{error}</div>}

          {/* Generate box */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select className="input" value={docType} onChange={e => setDocType(e.target.value)} style={{ width: 160, height: 34, padding: '0 10px', fontSize: '0.8rem' }}>
                {TEMPLATES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>for {user?.department || 'your department'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <textarea className="input" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the document you need... e.g., 'Q4 result analysis report for CSE section A with 45 students, pass rate 78%'" style={{ flex: 1, minHeight: 80, resize: 'vertical', fontSize: '0.85rem' }} />
              <button className="btn btn-primary" onClick={() => generate()} disabled={generating || !prompt.trim()} style={{ alignSelf: 'flex-end', minWidth: 100 }}>
                {generating ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Generating</> : 'Generate →'}
              </button>
            </div>
          </div>

          {/* Templates */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Quick Templates</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {TEMPLATES.map(t => (
                <button key={t.type} onClick={() => generate(t.prompt, t.type)} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = TYPE_COLORS[t.type] || 'var(--accent)'; el.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--surface)' }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 500 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Docs list */}
          {docs.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Generated ({docs.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {docs.map(doc => (
                  <div key={doc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all var(--tr)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = TYPE_COLORS[doc.type] || 'var(--accent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[doc.type] || '📄'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{doc.type} · {new Date(doc.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>{doc.content.slice(0, 120)}...</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button className="btn btn-xs btn-outline" onClick={e => { e.stopPropagation(); downloadDoc(doc) }}>↓ Download</button>
                      <button className="btn btn-xs btn-ghost" onClick={e => { e.stopPropagation(); setDocs(prev => prev.filter(d => d.id !== doc.id)) }} style={{ color: 'var(--red)' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal */}
          {selectedDoc && (
            <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
              <div className="modal-box" style={{ width: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>{TYPE_ICONS[selectedDoc.type] || '📄'}</span>
                  <div>
                    <div className="modal-title" style={{ margin: 0 }}>{selectedDoc.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedDoc.type} · {new Date(selectedDoc.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-2)', borderRadius: 8, padding: 16, fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 400 }}>
                  {selectedDoc.content}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>Close</button>
                  <button className="btn btn-primary" onClick={() => downloadDoc(selectedDoc)}>↓ Download .txt</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}