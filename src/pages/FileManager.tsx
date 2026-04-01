import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../index'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../api'

type ViewMode = 'list' | 'grid'
type FileTab = 'uploaded' | 'browse' | 'search'

export default function FileManager() {
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.app.user)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tab, setTab] = useState<FileTab>('uploaded')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [browseDir, setBrowseDir] = useState('')
  const [browseItems, setBrowseItems] = useState<any[]>([])
  const [browsePath, setBrowsePath] = useState('')
  const [browseParent, setBrowseParent] = useState('')
  const [diskSearch, setDiskSearch] = useState('')
  const [diskResults, setDiskResults] = useState<any[]>([])
  const [diskSearching, setDiskSearching] = useState(false)
  const [newDirName, setNewDirName] = useState('')
  const [showNewDir, setShowNewDir] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadFiles() }, [filterType, filterDept])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const res = await api.getFiles({ type: filterType || undefined, department: filterDept || undefined, search: search || undefined })
      setFiles(res)
    } catch { setFiles([]) }
    setLoading(false)
  }

  const browseDirectory = async (path?: string) => {
    try {
      const res = await api.browseDir(path || browseDir || '')
      setBrowseItems(res.items)
      setBrowsePath(res.path)
      setBrowseParent(res.parent)
    } catch (e: any) { setBrowseItems([]) }
  }

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    setUploading(true)
    try {
      const files = Array.from(fileList)
      await api.uploadFiles(files, filterDept || user?.department || 'general', user?.email || 'user')
      await loadFiles()
    } catch { alert('Upload failed — is backend running?') }
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return
    try { await api.deleteFile(id); await loadFiles() }
    catch { alert('Delete failed') }
  }

  const handleDiskSearch = async () => {
    if (!diskSearch.trim()) return
    setDiskSearching(true)
    try {
      const res = await api.searchDisk(diskSearch)
      setDiskResults(res)
    } catch { setDiskResults([]) }
    setDiskSearching(false)
  }

  const handleMkdir = async () => {
    if (!newDirName.trim() || !browsePath) return
    const fullPath = `${browsePath}/${newDirName}`
    try { await api.mkdir(fullPath); browseDirectory(browsePath); setNewDirName(''); setShowNewDir(false) }
    catch { alert('Failed to create directory') }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const FILE_ICONS: Record<string, { icon: string; color: string }> = {
    xlsx: { icon: 'XL', color: '#22c55e' }, xls: { icon: 'XL', color: '#22c55e' },
    csv: { icon: 'CSV', color: '#14b8a6' }, pdf: { icon: 'PDF', color: '#ef4444' },
    docx: { icon: 'W', color: '#3b82f6' }, doc: { icon: 'W', color: '#3b82f6' },
    pptx: { icon: 'PPT', color: '#f97316' }, ppt: { icon: 'PPT', color: '#f97316' },
    png: { icon: 'PNG', color: '#a855f7' }, jpg: { icon: 'IMG', color: '#a855f7' },
    txt: { icon: 'TXT', color: '#9ca3af' }, folder: { icon: '📁', color: '#fbbf24' },
  }
  const getIcon = (type: string) => FILE_ICONS[type.toLowerCase()] || { icon: type.toUpperCase().slice(0,3), color: '#9ca3af' }

  const fmtSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`
  const fmtDate = (d: string | Date) => d ? new Date(d).toLocaleDateString() : '—'

  const departments = [...new Set(files.map(f => f.department).filter(Boolean))]
  const types = [...new Set(files.map(f => f.type).filter(Boolean))]
  const filteredFiles = files.filter(f =>
    (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-2)' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: '1.2rem', letterSpacing: -0.5 }}>File Manager</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload, browse, and manage files locally</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-icon-sm btn-ghost" onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}>
                {viewMode === 'list' ? '⊞' : '≡'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '⟳ Uploading...' : '+ Upload'}
              </button>
              <input ref={fileRef} type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
            {[{ id: 'uploaded' as FileTab, label: `Uploaded (${files.length})` }, { id: 'browse' as FileTab, label: 'Browse Disk' }, { id: 'search' as FileTab, label: 'Search Disk' }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'browse' && !browsePath) browseDirectory() }} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── UPLOADED TAB ── */}
          {tab === 'uploaded' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ width: 220 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                  <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadFiles()} />
                </div>
                <select className="input" style={{ width: 130, height: 32, padding: '0 8px', fontSize: '0.78rem' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="input" style={{ width: 110, height: 32, padding: '0 8px', fontSize: '0.78rem' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  {types.map(t => <option key={t} value={t}>.{t}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={loadFiles}>↻ Refresh</button>
                {selected.size > 0 && (
                  <button className="btn btn-sm btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={async () => {
                    if (!confirm(`Delete ${selected.size} files?`)) return
                    await Promise.all([...selected].map(id => api.deleteFile(id).catch(()=>{})))
                    setSelected(new Set()); loadFiles()
                  }}>Delete {selected.size} selected</button>
                )}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async e => { e.preventDefault(); setDragOver(false); await handleUpload(e.dataTransfer.files) }}
                style={{ flex: 1, overflowY: 'auto', background: dragOver ? 'rgba(59,130,246,0.05)' : 'transparent', transition: 'background 0.2s', outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                    <div className="spinner" style={{ width: 24, height: 24 }} />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, opacity: 0.3 }}>📁</div>
                    <p>No files yet. Drop files here or click Upload.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>Upload Files</button>
                  </div>
                ) : viewMode === 'list' ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '32px 40px 1fr 120px 100px 130px 100px', padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      <div/>
                      <div/>
                      <div>Name</div>
                      <div>Department</div>
                      <div>Size</div>
                      <div>Uploaded</div>
                      <div>Actions</div>
                    </div>
                    {filteredFiles.map(f => {
                      const icon = getIcon(f.type)
                      const isSelected = selected.has(f.id)
                      return (
                        <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '32px 40px 1fr 120px 100px 130px 100px', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--accent-dim)' : 'transparent', transition: 'background var(--tr)' }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(f.id)} style={{ cursor: 'pointer' }} />
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: icon.color }}>{icon.icon}</div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{f.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>By {f.uploadedBy}</div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.department}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtSize(f.size)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(f.uploadedAt)}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {['xlsx','xls','csv'].includes(f.type) && (
                              <button className="btn btn-xs btn-outline" onClick={e => { e.stopPropagation(); navigate('/excel') }}>Analyze</button>
                            )}
                            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--red)' }} onClick={e => { e.stopPropagation(); handleDelete(f.id) }}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, padding: 16 }}>
                    {filteredFiles.map(f => {
                      const icon = getIcon(f.type)
                      return (
                        <div key={f.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all var(--tr)', textAlign: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = icon.color; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                        >
                          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: icon.color, width: 40, height: 40, borderRadius: 8, background: `${icon.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{icon.icon}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{fmtSize(f.size)}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                            {['xlsx','xls','csv'].includes(f.type) && <button className="btn btn-xs btn-outline" onClick={() => navigate('/excel')}>Analyze</button>}
                            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDelete(f.id)}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BROWSE TAB ── */}
          {tab === 'browse' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, alignItems: 'center' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📁</span>
                  <input placeholder="Directory path..." value={browseDir} onChange={e => setBrowseDir(e.target.value)} onKeyDown={e => e.key === 'Enter' && browseDirectory(browseDir)} />
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => browseDirectory(browseDir)}>Go</button>
                {browsePath && browsePath !== browseParent && <button className="btn btn-ghost btn-sm" onClick={() => browseDirectory(browseParent)}>↑ Up</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNewDir(p => !p)}>+ New Folder</button>
              </div>
              {showNewDir && (
                <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                  <input className="input" placeholder="Folder name..." value={newDirName} onChange={e => setNewDirName(e.target.value)} style={{ width: 220, height: 32, padding: '0 10px', fontSize: '0.8rem' }} onKeyDown={e => e.key === 'Enter' && handleMkdir()} />
                  <button className="btn btn-primary btn-sm" onClick={handleMkdir}>Create</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowNewDir(false)}>Cancel</button>
                </div>
              )}
              {browsePath && <div style={{ padding: '6px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>{browsePath}</div>}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {browseItems.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 36, opacity: 0.3 }}>📂</div>
                    <p>Enter a directory path above and click Go.</p>
                  </div>
                ) : (
                  browseItems.map((item, i) => {
                    const icon = getIcon(item.isDir ? 'folder' : item.type)
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 140px', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', cursor: item.isDir ? 'pointer' : 'default', transition: 'background var(--tr)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => item.isDir && browseDirectory(item.path)}
                      >
                        <div style={{ fontSize: item.isDir ? 20 : '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: icon.color }}>{item.isDir ? '📁' : icon.icon}</div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: item.isDir ? 600 : 400 }}>{item.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.path}</div>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.isDir ? '—' : fmtSize(item.size)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(item.modified)}</div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ── SEARCH TAB ── */}
          {tab === 'search' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, alignItems: 'center' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                  <input placeholder="Search filename across all uploaded files..." value={diskSearch} onChange={e => setDiskSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDiskSearch()} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleDiskSearch} disabled={diskSearching}>{diskSearching ? '⟳ Searching...' : 'Search'}</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {diskResults.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 8, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 36, opacity: 0.3 }}>🔍</div>
                    <p>Type a filename and press Search. Searches all uploaded files.</p>
                    <p style={{ fontSize: '0.72rem' }}>Supports partial name matching.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Found {diskResults.length} files
                    </div>
                    {diskResults.map((item, i) => {
                      const icon = getIcon(item.type || '')
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 140px', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', transition: 'background var(--tr)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: icon.color }}>{icon.icon}</div>
                          <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>{item.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.path}</div>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtSize(item.size)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(item.modified)}</div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}