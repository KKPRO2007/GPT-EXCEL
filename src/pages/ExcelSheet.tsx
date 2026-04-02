import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../index'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ZAxis
} from 'recharts'

// ── TYPES ─────────────────────────────────────────────────────────
type MainTab = 'files' | 'sheet' | 'analyze' | 'charts' | 'create'
type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter'

interface CellState {
  value: string
  editing: boolean
  bold: boolean
  align: 'left' | 'center' | 'right'
}

const CHART_COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#14b8a6','#eab308','#ec4899','#ef4444','#06b6d4','#84cc16']
const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const fmtSize = (b: number) => b < 1024 ? `${b}B` : b < 1024*1024 ? `${(b/1024).toFixed(1)}KB` : `${(b/1024/1024).toFixed(1)}MB`

const Tip = ({ content, children }: { content: string; children: React.ReactNode }) => (
  <div style={{ position: 'relative', display: 'inline-flex' }} title={content}>{children}</div>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || 'var(--text)' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export default function ExcelSheet() {
  const user = useSelector((s: RootState) => s.app.user)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<MainTab>('files')
  const [backendOnline, setBackendOnline] = useState(false)

  // Files
  const [files, setFiles] = useState<any[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileSearch, setFileSearch] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [selectedViewMode, setSelectedViewMode] = useState<'list' | 'grid'>('list')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sheet state
  const [currentFile, setCurrentFile] = useState<any>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [allRawData, setAllRawData] = useState<Record<string, any>>({})
  // grid[row][col] = { value, bold, align, editing }
  const [grid, setGrid] = useState<CellState[][]>([])
  const [gridCols, setGridCols] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null)
  const [selectionRange, setSelectionRange] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)
  const [formulaBarVal, setFormulaBarVal] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [frozenRow, setFrozenRow] = useState(true)
  const [frozenCol, setFrozenCol] = useState(true)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [colWidths, setColWidths] = useState<number[]>([])
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartW, setResizeStartW] = useState(0)
  const editInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Analysis
  const [stats, setStats] = useState<any>(null)
  const [activeStatSheet, setActiveStatSheet] = useState('')
  const [cmdInput, setCmdInput] = useState('')
  const [cmdLoading, setCmdLoading] = useState(false)
  const [cmdResult, setCmdResult] = useState<any>(null)
  const [dataSearch, setDataSearch] = useState('')
  const [filteredStudents, setFilteredStudents] = useState<any[]>([])

  // Charts
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartDataKey, setChartDataKey] = useState('section')

  // Create
  const [createPrompt, setCreatePrompt] = useState('')
  const [creating, setCreating] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    api.health().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false))
    loadFiles()
  }, [])

  // ── FILES ──────────────────────────────────────────────────────
  const loadFiles = async () => {
    setFilesLoading(true)
    try {
      const res = await api.getFiles({ search: fileSearch || undefined, type: fileTypeFilter || undefined })
      setFiles(res)
    } catch { setFiles([]) }
    setFilesLoading(false)
  }

  const handleUpload = async (fileList: File[]) => {
    if (!fileList.length) return
    setUploading(true)
    try {
      await api.uploadFiles(fileList, user?.department || 'general', user?.email || 'user')
      await loadFiles()
      showToast(`Uploaded ${fileList.length} file(s)`)
    } catch (e: any) { showToast(e.message || 'Upload failed', 'err') }
    setUploading(false)
  }

  const handleDeleteFile = async (id: string) => {
    if (!confirm('Delete this file?')) return
    try {
      await api.deleteFile(id)
      await loadFiles()
      if (currentFile?.id === id) { setCurrentFile(null); setGrid([]); setStats(null) }
      showToast('File deleted')
    } catch { showToast('Delete failed', 'err') }
  }

  // ── OPEN FILE → LOAD GRID ──────────────────────────────────────
  const openFile = async (file: any) => {
    setSheetLoading(true); setCurrentFile(file)
    try {
      const res = await api.analyzeFile(file.id)
      setSheetNames(res.sheetNames || [])
      setAllRawData(res.rawData || {})
      setStats(res.sheets || {})
      setActiveStatSheet(res.sheetNames?.[0] || '')

      // Build grid from rawData
      const sheetKey = res.sheetNames?.[0]
      if (sheetKey && res.rawData?.[sheetKey]) {
        buildGrid(res.rawData[sheetKey].rawRows || [], sheetKey)
      }
      setActiveSheetIdx(0)
      setActiveTab('sheet')
      showToast(`Opened ${file.name}`)
    } catch (e: any) { showToast(e.message || 'Failed to open', 'err') }
    setSheetLoading(false)
  }

  const buildGrid = (rawRows: any[][], sheetKey: string) => {
    if (!rawRows?.length) { setGrid([]); setGridCols(0); return }
    const maxCols = rawRows.reduce((m, r) => Math.max(m, r.length), 0)
    // Pad all rows to same length
    const normalizedRows = rawRows.map(r => {
      const padded = [...r]
      while (padded.length < maxCols) padded.push('')
      return padded
    })
    const g: CellState[][] = normalizedRows.map(row =>
      row.map(cell => ({
        value: cell === null || cell === undefined ? '' : String(cell),
        editing: false, bold: false, align: 'left'
      }))
    )
    setGrid(g)
    setGridCols(maxCols)
    // Auto column widths
    const widths = Array(maxCols).fill(0).map((_, ci) => {
      const maxLen = normalizedRows.reduce((m, r) => Math.max(m, String(r[ci] || '').length), 0)
      return Math.min(Math.max(maxLen * 8 + 16, 60), 240)
    })
    setColWidths(widths)
    setSelectedCell(null); setFormulaBarVal(''); setCmdResult(null)
  }

  const switchSheet = (idx: number) => {
    setActiveSheetIdx(idx)
    const sheetKey = sheetNames[idx]
    if (sheetKey && allRawData[sheetKey]) {
      buildGrid(allRawData[sheetKey].rawRows || [], sheetKey)
      setActiveStatSheet(sheetKey)
    }
  }

  // ── CELL EDITING ───────────────────────────────────────────────
  const getCellAddr = (r: number, c: number) => `${COL_LETTERS[c] || String.fromCharCode(65 + c)}${r + 1}`

  const selectCell = (r: number, c: number) => {
    setSelectedCell({ r, c })
    setFormulaBarVal(grid[r]?.[c]?.value || '')
    setSelectionRange(null)
  }

  const startEdit = (r: number, c: number) => {
    setIsEditing(true)
    setSelectedCell({ r, c })
    setTimeout(() => editInputRef.current?.focus(), 10)
  }

  const commitEdit = (r: number, c: number, val: string) => {
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })))
    if (newGrid[r]?.[c]) {
      newGrid[r][c].value = val
      newGrid[r][c].editing = false
    }
    setGrid(newGrid)
    setIsEditing(false)
    setFormulaBarVal(val)
  }

  const applyFormulaBar = () => {
    if (!selectedCell) return
    commitEdit(selectedCell.r, selectedCell.c, formulaBarVal)
  }

  const toggleBold = () => {
    if (!selectedCell) return
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })))
    if (newGrid[selectedCell.r]?.[selectedCell.c]) {
      newGrid[selectedCell.r][selectedCell.c].bold = !newGrid[selectedCell.r][selectedCell.c].bold
    }
    setGrid(newGrid)
  }

  const setAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedCell) return
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })))
    if (newGrid[selectedCell.r]?.[selectedCell.c]) {
      newGrid[selectedCell.r][selectedCell.c].align = align
    }
    setGrid(newGrid)
  }

  const addRow = () => {
    const newRow: CellState[] = Array(gridCols).fill(null).map(() => ({ value: '', editing: false, bold: false, align: 'left' }))
    setGrid(prev => [...prev, newRow])
    showToast('Row added')
  }

  const addCol = () => {
    setGrid(prev => prev.map(row => [...row, { value: '', editing: false, bold: false, align: 'left' }]))
    setGridCols(c => c + 1)
    setColWidths(prev => [...prev, 100])
    showToast('Column added')
  }

  const deleteRow = () => {
    if (!selectedCell || grid.length <= 1) return
    const newGrid = grid.filter((_, i) => i !== selectedCell.r)
    setGrid(newGrid)
    setSelectedCell(null)
    showToast('Row deleted')
  }

  const deleteCol = () => {
    if (!selectedCell || gridCols <= 1) return
    const c = selectedCell.c
    setGrid(prev => prev.map(row => row.filter((_, i) => i !== c)))
    setColWidths(prev => prev.filter((_, i) => i !== c))
    setGridCols(prev => prev - 1)
    setSelectedCell(null)
    showToast('Column deleted')
  }

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === 'Enter') { commitEdit(r, c, (e.target as HTMLInputElement).value); selectCell(Math.min(r + 1, grid.length - 1), c); e.preventDefault() }
    else if (e.key === 'Tab') { commitEdit(r, c, (e.target as HTMLInputElement).value); selectCell(r, Math.min(c + 1, gridCols - 1)); e.preventDefault() }
    else if (e.key === 'Escape') { setIsEditing(false) }
  }

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return
    const { r, c } = selectedCell
    if (e.key === 'ArrowUp') { selectCell(Math.max(r - 1, 0), c); e.preventDefault() }
    else if (e.key === 'ArrowDown') { selectCell(Math.min(r + 1, grid.length - 1), c); e.preventDefault() }
    else if (e.key === 'ArrowLeft') { selectCell(r, Math.max(c - 1, 0)); e.preventDefault() }
    else if (e.key === 'ArrowRight') { selectCell(r, Math.min(c + 1, gridCols - 1)); e.preventDefault() }
    else if (e.key === 'Delete' || e.key === 'Backspace') { commitEdit(r, c, ''); setFormulaBarVal(''); e.preventDefault() }
    else if (e.key === 'Enter' || e.key === 'F2') { startEdit(r, c); e.preventDefault() }
    else if (!e.ctrlKey && !e.metaKey && e.key.length === 1) { startEdit(r, c) }
  }

  const saveSheet = async () => {
    if (!currentFile) return
    try {
      const rows = grid.map(row => row.map(c => ({ v: c.value })))
      await fetch(`http://localhost:3001/api/excel/save/${currentFile.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, sheetName: sheetNames[activeSheetIdx] })
      })
      showToast('Saved to disk')
    } catch { showToast('Save failed', 'err') }
  }

  const exportExcel = async () => {
    if (!grid.length) return
    try {
      const headers = grid[0].map(c => c.value)
      const data = grid.slice(1).map(row =>
        Object.fromEntries(row.map((cell, i) => [headers[i] || `col${i}`, cell.value]))
      )
      const res = await api.generateExcel(data, currentFile?.name || 'export.xlsx', sheetNames[activeSheetIdx], user?.department)
      window.open(`http://localhost:3001${res.file.url}`, '_blank')
      showToast('Export ready — check new tab')
    } catch (e: any) { showToast(e.message || 'Export failed', 'err') }
  }

  // ── COLUMN RESIZE ──────────────────────────────────────────────
  const startResize = (e: React.MouseEvent, colIdx: number) => {
    e.preventDefault(); e.stopPropagation()
    setResizingCol(colIdx); setResizeStartX(e.clientX); setResizeStartW(colWidths[colIdx] || 100)
    const onMove = (ev: MouseEvent) => {
      const diff = ev.clientX - e.clientX
      setColWidths(prev => { const n = [...prev]; n[colIdx] = Math.max(40, (colWidths[colIdx] || 100) + diff); return n })
    }
    const onUp = () => { setResizingCol(null); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  // ── AI COMMAND ─────────────────────────────────────────────────
  const runCommand = async () => {
    if (!cmdInput.trim() || !currentFile) return
    setCmdLoading(true); setCmdResult(null)
    try {
      const res = await api.excelCommand(currentFile.id, cmdInput)
      setCmdResult(res)
    } catch (e: any) { showToast(e.message || 'Command failed', 'err') }
    setCmdLoading(false)
  }

  // ── SEARCH IN DATA ─────────────────────────────────────────────
  useEffect(() => {
    if (!dataSearch || !stats) { setFilteredStudents([]); return }
    const allStats = Object.values(stats)[activeSheetIdx] as any
    if (!allStats?.students) return
    const q = dataSearch.toLowerCase()
    setFilteredStudents(allStats.students.filter((s: any) =>
      s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
    ))
  }, [dataSearch, stats, activeSheetIdx])

  // ── CHART DATA ─────────────────────────────────────────────────
  const getChartData = () => {
    const sh = stats?.[sheetNames[activeSheetIdx]]
    if (!sh) return []
    if (chartDataKey === 'section') return sh.sectionStats || []
    if (chartDataKey === 'subject') return sh.subjectStats?.map((s: any) => ({ name: s.subject, avg: s.avg, passRate: s.passRate })) || []
    if (chartDataKey === 'grade') return sh.gradeDistribution || []
    if (chartDataKey === 'score') return sh.scoreDistribution || []
    return sh.sectionStats || []
  }

  // ── CREATE ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createPrompt.trim()) return
    setCreating(true)
    try {
      const template = [
        { Name: 'Student 1', Roll: '001', Section: 'A', Maths: 85, Physics: 78, Chemistry: 90, Attendance: 92 },
        { Name: 'Student 2', Roll: '002', Section: 'A', Maths: 72, Physics: 65, Chemistry: 70, Attendance: 88 },
        { Name: 'Student 3', Roll: '003', Section: 'B', Maths: 90, Physics: 88, Chemistry: 85, Attendance: 95 },
        { Name: 'Student 4', Roll: '004', Section: 'B', Maths: 55, Physics: 60, Chemistry: 58, Attendance: 70 },
        { Name: 'Student 5', Roll: '005', Section: 'A', Maths: 95, Physics: 92, Chemistry: 88, Attendance: 98 },
      ]
      const fname = `${createPrompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      await api.generateExcel(template, fname, 'Sheet1', user?.department || 'general')
      await loadFiles()
      setCreatePrompt(''); setActiveTab('files')
      showToast('File created — open it from My Files')
    } catch (e: any) { showToast(e.message || 'Create failed', 'err') }
    setCreating(false)
  }

  // ── CURRENT STATS ──────────────────────────────────────────────
  const curStats = stats?.[sheetNames[activeSheetIdx]] as any

  const TABS: { id: MainTab; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'files', label: 'My Files', icon: '📁' },
    { id: 'sheet', label: 'Sheet View', icon: '⊞', disabled: !currentFile },
    { id: 'analyze', label: 'Analysis', icon: '📊', disabled: !currentFile },
    { id: 'charts', label: 'Charts', icon: '📈', disabled: !currentFile },
    { id: 'create', label: 'Create New', icon: '✨' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 60, right: 20, zIndex: 9999, padding: '10px 18px', borderRadius: 10, background: toast.type === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, color: toast.type === 'ok' ? 'var(--green)' : 'var(--red)', fontSize: '0.8rem', fontWeight: 500, boxShadow: 'var(--shadow-lg)', animation: 'popIn 0.2s ease' }}>
          {toast.type === 'ok' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-2)' }}>

          {/* ── TOP TOOLBAR ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 44, borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: backendOnline ? '#22c55e' : '#ef4444' }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{backendOnline ? 'Server OK' : 'cd server && npm start'}</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

            {activeTab === 'sheet' && currentFile && (
              <>
                <button className="btn btn-xs btn-ghost" onClick={saveSheet} title="Save">💾 Save</button>
                <button className="btn btn-xs btn-ghost" onClick={exportExcel} title="Export">↓ Export</button>
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
                <button className="btn btn-xs btn-ghost" onClick={toggleBold} title="Bold" style={{ fontWeight: 700 }}>B</button>
                <button className="btn btn-xs btn-ghost" onClick={() => setAlign('left')} title="Align Left">⬅</button>
                <button className="btn btn-xs btn-ghost" onClick={() => setAlign('center')} title="Center">⬛</button>
                <button className="btn btn-xs btn-ghost" onClick={() => setAlign('right')} title="Align Right">➡</button>
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
                <button className="btn btn-xs btn-ghost" onClick={addRow}>+Row</button>
                <button className="btn btn-xs btn-ghost" onClick={addCol}>+Col</button>
                <button className="btn btn-xs btn-ghost" onClick={deleteRow} style={{ color: 'var(--red)' }} disabled={!selectedCell}>-Row</button>
                <button className="btn btn-xs btn-ghost" onClick={deleteCol} style={{ color: 'var(--red)' }} disabled={!selectedCell}>-Col</button>
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {currentFile.name}</span>
              </>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '⟳' : '+'} Upload
              </button>
              <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => e.target.files?.length && handleUpload(Array.from(e.target.files))} />
            </div>
          </div>

          {/* ── FORMULA BAR (sheet only) ── */}
          {activeTab === 'sheet' && currentFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, height: 34 }}>
              <div style={{ minWidth: 60, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '0 8px', color: 'var(--blue)' }}>
                {selectedCell ? getCellAddr(selectedCell.r, selectedCell.c) : ''}
              </div>
              <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>ƒx</span>
              <input
                value={formulaBarVal}
                onChange={e => setFormulaBarVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFormulaBar()}
                placeholder={selectedCell ? 'Enter value...' : 'Select a cell'}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', padding: '0 4px' }}
              />
              {formulaBarVal !== (grid[selectedCell?.r || 0]?.[selectedCell?.c || 0]?.value || '') && (
                <button className="btn btn-xs btn-primary" onClick={applyFormulaBar}>✓</button>
              )}
            </div>
          )}

          {/* ── MAIN TABS ── */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => !t.disabled && setActiveTab(t.id)} disabled={t.disabled}
                style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', cursor: t.disabled ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: activeTab === t.id ? 600 : 400, color: t.disabled ? 'var(--text-muted)' : activeTab === t.id ? 'var(--accent)' : 'var(--text-secondary)', opacity: t.disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <span>{t.icon}</span>{t.label}
                {t.id === 'sheet' && currentFile && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', marginLeft: 2 }} />}
              </button>
            ))}
          </div>

          {/* ── SHEET TABS (when file open) ── */}
          {(activeTab === 'sheet' || activeTab === 'analyze' || activeTab === 'charts') && sheetNames.length > 1 && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, paddingLeft: 8, overflowX: 'auto' }}>
              {sheetNames.map((name, i) => (
                <button key={i} onClick={() => switchSheet(i)}
                  style={{ padding: '5px 14px', background: activeSheetIdx === i ? 'var(--surface)' : 'transparent', border: 'none', borderBottom: activeSheetIdx === i ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.72rem', color: activeSheetIdx === i ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeSheetIdx === i ? 600 : 400, whiteSpace: 'nowrap' }}>
                  📄 {name}
                </button>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ── TAB: MY FILES ── */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'files' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ width: 200 }}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                  <input placeholder="Search files..." value={fileSearch} onChange={e => setFileSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadFiles()} />
                </div>
                <select className="input" style={{ height: 30, width: 100, padding: '0 6px', fontSize: '0.75rem' }} value={fileTypeFilter} onChange={e => { setFileTypeFilter(e.target.value); setTimeout(loadFiles, 50) }}>
                  <option value="">All Types</option>
                  {['xlsx','xls','csv','pdf','docx','pptx'].map(t => <option key={t} value={t}>.{t}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={loadFiles}>↻</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedViewMode(v => v === 'list' ? 'grid' : 'list')}>{selectedViewMode === 'list' ? '⊞' : '≡'}</button>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>{files.length} files</span>
              </div>

              {/* Drop zone + file list */}
              <div style={{ flex: 1, overflowY: 'auto', background: dragOver ? 'rgba(59,130,246,0.04)' : 'transparent' }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = Array.from(e.dataTransfer.files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name)); if (f.length) handleUpload(f) }}
              >
                {dragOver && (
                  <div style={{ margin: 12, border: '2px dashed var(--accent)', borderRadius: 10, padding: '24px', textAlign: 'center', color: 'var(--accent)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                    Drop Excel files here to upload
                  </div>
                )}
                {filesLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
                ) : files.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📂</div>
                    <p>No files yet. Upload Excel files to get started.</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>Upload Files</button>
                  </div>
                ) : selectedViewMode === 'list' ? (
                  <div>
                    {/* List header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 80px 130px 120px', padding: '6px 14px', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      <div/><div>Name</div><div>Dept</div><div>Size</div><div>Uploaded</div><div>Actions</div>
                    </div>
                    {files.map(f => {
                      const typeColors: Record<string, string> = { xlsx: '#22c55e', xls: '#22c55e', csv: '#14b8a6', pdf: '#ef4444', docx: '#3b82f6', pptx: '#f97316' }
                      const col = typeColors[f.type] || '#9ca3af'
                      return (
                        <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 80px 130px 120px', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => openFile(f)}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 5, background: `${col}18`, border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: col }}>{f.type.toUpperCase().slice(0,3)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>by {f.uploadedBy}</div>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{f.department}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtSize(f.size)}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : '—'}</div>
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button className="btn btn-xs btn-primary" onClick={() => openFile(f)}>Open</button>
                            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteFile(f.id)}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, padding: 14 }}>
                    {files.map(f => {
                      const typeColors: Record<string, string> = { xlsx: '#22c55e', xls: '#22c55e', csv: '#14b8a6', pdf: '#ef4444', docx: '#3b82f6', pptx: '#f97316' }
                      const col = typeColors[f.type] || '#9ca3af'
                      return (
                        <div key={f.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = col; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                          onClick={() => openFile(f)}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: `${col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: col }}>{f.type.toUpperCase().slice(0,3)}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>{fmtSize(f.size)}</div>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                            <button className="btn btn-xs btn-primary" onClick={e => { e.stopPropagation(); openFile(f) }}>Open</button>
                            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--red)' }} onClick={e => { e.stopPropagation(); handleDeleteFile(f.id) }}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ── TAB: SHEET VIEW (real Excel grid) ── */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'sheet' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {sheetLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading sheet...</p>
                </div>
              ) : !grid.length ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 48, opacity: 0.3 }}>⊞</div>
                  <p style={{ color: 'var(--text-muted)' }}>Open a file from My Files tab</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('files')}>Go to My Files</button>
                </div>
              ) : (
                <div ref={gridRef} tabIndex={0} onKeyDown={handleGridKeyDown} style={{ flex: 1, overflow: 'auto', outline: 'none', position: 'relative', userSelect: 'none' }}>
                  <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      {/* Column header row */}
                      <tr style={{ background: 'var(--surface-2)' }}>
                        {/* Row number corner */}
                        <th style={{ width: 44, minWidth: 44, height: 24, border: '1px solid var(--border)', background: 'var(--surface-2)', position: 'sticky', left: 0, top: 0, zIndex: 20 }} />
                        {/* Column letters */}
                        {Array(gridCols).fill(0).map((_, ci) => (
                          <th key={ci} style={{ width: colWidths[ci] || 100, minWidth: 40, height: 24, border: '1px solid var(--border)', background: selectedCell?.c === ci ? 'rgba(59,130,246,0.12)' : 'var(--surface-2)', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600, textAlign: 'center', position: 'relative', userSelect: 'none' }}>
                            {COL_LETTERS[ci] || String.fromCharCode(65 + ci)}
                            {/* Resize handle */}
                            <div onMouseDown={e => startResize(e, ci)} style={{ position: 'absolute', right: 0, top: 0, width: 4, height: '100%', cursor: 'col-resize', background: resizingCol === ci ? 'var(--accent)' : 'transparent', zIndex: 1 }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
                              onMouseLeave={e => { if (resizingCol !== ci) e.currentTarget.style.background = 'transparent' }}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.map((row, ri) => (
                        <tr key={ri}>
                          {/* Row number */}
                          <td style={{ width: 44, height: 24, border: '1px solid var(--border)', background: selectedCell?.r === ri ? 'rgba(59,130,246,0.12)' : 'var(--surface-2)', color: 'var(--text-muted)', fontSize: '0.68rem', textAlign: 'center', fontWeight: 600, position: 'sticky', left: 0, zIndex: 5 }}>
                            {ri + 1}
                          </td>
                          {row.map((cell, ci) => {
                            const isSelected = selectedCell?.r === ri && selectedCell?.c === ci
                            const isInRange = selectionRange && ri >= selectionRange.r1 && ri <= selectionRange.r2 && ci >= selectionRange.c1 && ci <= selectionRange.c2
                            const isHeaderRow = ri === 0
                            return (
                              <td key={ci}
                                style={{
                                  width: colWidths[ci] || 100, maxWidth: colWidths[ci] || 100, height: 26, border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, padding: 0, position: 'relative', background: isSelected ? 'rgba(59,130,246,0.08)' : isInRange ? 'rgba(59,130,246,0.04)' : isHeaderRow ? 'var(--surface-2)' : 'var(--bg)',
                                  outline: isSelected ? '2px solid var(--accent)' : 'none', outlineOffset: -1, zIndex: isSelected ? 2 : 0
                                }}
                                onClick={() => { selectCell(ri, ci) }}
                                onDoubleClick={() => startEdit(ri, ci)}
                              >
                                {isEditing && isSelected ? (
                                  <input ref={editInputRef} defaultValue={cell.value}
                                    onBlur={e => commitEdit(ri, ci, e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, ri, ci)}
                                    style={{ width: '100%', height: '100%', border: 'none', padding: '0 6px', outline: 'none', background: 'rgba(59,130,246,0.12)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: cell.bold ? 700 : 400 }}
                                    autoFocus
                                  />
                                ) : (
                                  <div style={{ padding: '0 6px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: cell.align === 'right' ? 'flex-end' : cell.align === 'center' ? 'center' : 'flex-start', fontWeight: isHeaderRow || cell.bold ? 600 : 400, color: isHeaderRow ? 'var(--text)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                    {cell.value}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Command Bar at bottom of sheet */}
              {grid.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>AI ▶</span>
                  <input className="input" value={cmdInput} onChange={e => setCmdInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runCommand()} placeholder='Type a command: "top 10 students", "show failed", "section stats", "search John"...' style={{ flex: 1, height: 30, fontSize: '0.8rem' }} />
                  <button className="btn btn-primary btn-sm" onClick={runCommand} disabled={cmdLoading || !currentFile} style={{ minWidth: 60 }}>{cmdLoading ? '⟳' : 'Run'}</button>
                  {cmdResult && <button className="btn btn-ghost btn-sm" onClick={() => setCmdResult(null)}>✕</button>}
                </div>
              )}

              {/* Command result panel */}
              {cmdResult && (
                <div style={{ maxHeight: 280, overflowY: 'auto', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--green)' }}>✓ {cmdResult.message}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {Array.isArray(cmdResult.data) && cmdResult.data.length > 0 && (
                        <button className="btn btn-xs btn-outline" onClick={async () => {
                          const res = await api.generateExcel(cmdResult.data, 'export.xlsx', 'Results', user?.department)
                          window.open(`http://localhost:3001${res.file.url}`, '_blank')
                        }}>↓ Export</button>
                      )}
                      <button className="btn btn-xs btn-ghost" onClick={() => setCmdResult(null)}>✕</button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    {Array.isArray(cmdResult.data) && cmdResult.data.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-2)' }}>
                            {Object.keys(cmdResult.data[0]).filter(k => !['marks','markCols','below75'].includes(k)).map(k => (
                              <th key={k} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cmdResult.data.slice(0, 50).map((row: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {Object.entries(row).filter(([k]) => !['marks','markCols','below75'].includes(k)).map(([k, v]) => (
                                <td key={k} style={{ padding: '5px 10px', color: k === 'avg' || k === 'passRate' ? 'var(--blue)' : k === 'passed' ? 'var(--green)' : k === 'failed' ? 'var(--red)' : 'var(--text-secondary)', fontWeight: ['avg','passRate','passed','failed'].includes(k) ? 600 : 400 }}>
                                  {typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>{JSON.stringify(cmdResult.data, null, 2).slice(0, 800)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ── TAB: ANALYSIS ── */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'analyze' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {!curStats ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>📊</div>
                  <p>Open an Excel file to see analysis.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab('files')}>Open File</button>
                </div>
              ) : (
                <div style={{ maxWidth: 1080, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* KPI Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
                    {[
                      { label: 'Total', value: curStats.total, color: '#3b82f6', icon: '👥' },
                      { label: 'Passed', value: curStats.passed, color: '#22c55e', icon: '✅' },
                      { label: 'Failed', value: curStats.failed, color: '#ef4444', icon: '❌' },
                      { label: 'Pass Rate', value: `${curStats.passRate}%`, color: '#f97316', icon: '📈' },
                      { label: 'Avg Score', value: curStats.avgScore, color: '#a855f7', icon: '⭐' },
                      { label: '< 75% Attend', value: curStats.below75Count, color: '#eab308', icon: '⚠️' },
                    ].map((k, i) => (
                      <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${k.color}25`, borderRadius: 10, padding: '12px 10px', textAlign: 'center', transition: 'transform 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                      >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Search in data */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="search-bar" style={{ width: 280 }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                      <input placeholder="Search student by name, roll, section..." value={dataSearch} onChange={e => setDataSearch(e.target.value)} />
                    </div>
                    {filteredStudents.length > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{filteredStudents.length} results</span>}
                    {dataSearch && <button className="btn btn-ghost btn-sm" onClick={() => setDataSearch('')}>✕</button>}
                  </div>

                  {/* Search results */}
                  {dataSearch && filteredStudents.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(59,130,246,0.05)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>
                        🔍 Search results for "{dataSearch}"
                      </div>
                      <div style={{ overflowX: 'auto', maxHeight: 220 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                              {['Name','Roll','Section','Avg','Grade','Passed','Attendance'].map(h => (
                                <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.map((s: any, i: number) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: 500 }}>{s.name}</td>
                                <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.roll}</td>
                                <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>{s.section}</td>
                                <td style={{ padding: '7px 12px', color: 'var(--blue)', fontWeight: 700 }}>{s.avg}</td>
                                <td style={{ padding: '7px 12px' }}><span style={{ padding: '1px 7px', borderRadius: 4, background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '0.7rem', fontWeight: 700 }}>{s.grade}</span></td>
                                <td style={{ padding: '7px 12px' }}><span style={{ color: s.passed ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{s.passed ? '✓' : '✗'}</span></td>
                                <td style={{ padding: '7px 12px', color: s.below75 ? 'var(--orange)' : 'var(--text-secondary)' }}>{s.attendance ? `${s.attendance}%` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* AI Command */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>AI Command</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input className="input" value={cmdInput} onChange={e => setCmdInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runCommand()} placeholder='e.g. "top 10 students", "show failed", "section stats", "below 75% attendance"' style={{ flex: 1, height: 34, fontSize: '0.82rem' }} />
                      <button className="btn btn-primary btn-sm" onClick={runCommand} disabled={cmdLoading || !currentFile}>{cmdLoading ? '⟳' : 'Run →'}</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {['top 10 students','show failed','show passed','section stats','below 75% attendance','grade distribution','subject averages','sort by score'].map(c => (
                        <button key={c} className="btn btn-xs btn-outline" onClick={() => { setCmdInput(c); setTimeout(runCommand, 50) }}>{c}</button>
                      ))}
                    </div>
                  </div>

                  {/* Command result */}
                  {cmdResult && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(34,197,94,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green)' }}>✓ {cmdResult.message}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {Array.isArray(cmdResult.data) && (
                            <button className="btn btn-xs btn-outline" onClick={async () => {
                              const res = await api.generateExcel(cmdResult.data, 'result.xlsx', 'Results', user?.department)
                              window.open(`http://localhost:3001${res.file.url}`, '_blank')
                            }}>↓ Export</button>
                          )}
                          <button className="btn btn-xs btn-ghost" onClick={() => setCmdResult(null)}>✕</button>
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                        {Array.isArray(cmdResult.data) && cmdResult.data.length > 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                                {Object.keys(cmdResult.data[0]).filter(k => !['marks','markCols','below75'].includes(k)).map(k => (
                                  <th key={k} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '0.68rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {cmdResult.data.slice(0, 100).map((row: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  {Object.entries(row).filter(([k]) => !['marks','markCols','below75'].includes(k)).map(([k, v]) => (
                                    <td key={k} style={{ padding: '6px 12px', color: k === 'avg' ? 'var(--blue)' : k === 'passed' ? 'var(--green)' : k === 'failed' ? 'var(--red)' : 'var(--text-secondary)', fontWeight: ['avg'].includes(k) ? 700 : 400 }}>
                                      {typeof v === 'boolean' ? (v ? '✓ Pass' : '✗ Fail') : String(v)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Section comparison */}
                  {curStats.sectionStats?.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Section Comparison</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{curStats.sectionStats.length} sections</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)' }}>
                              {['Section','Students','Avg','Passed','Failed','Pass Rate'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {curStats.sectionStats.map((s: any, i: number) => (
                              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)' }}>{s.section}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{s.count}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--blue)', fontWeight: 700 }}>{s.avg}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--green)', fontWeight: 600 }}>{s.passed}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--red)', fontWeight: 600 }}>{s.failed}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                      <div style={{ height: '100%', width: `${s.passRate}%`, background: s.passRate >= 70 ? 'var(--green)' : s.passRate >= 50 ? 'var(--orange)' : 'var(--red)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                                    </div>
                                    <span style={{ fontWeight: 700, color: s.passRate >= 70 ? 'var(--green)' : s.passRate >= 50 ? 'var(--orange)' : 'var(--red)', minWidth: 38, fontSize: '0.75rem' }}>{s.passRate}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Subject stats */}
                  {curStats.subjectStats?.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subject-wise Performance</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)' }}>
                              {['Subject','Avg','Max','Min','Passed','Failed','Pass Rate'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {curStats.subjectStats.map((s: any, i: number) => (
                              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)' }}>{s.subject}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--blue)', fontWeight: 700 }}>{s.avg}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--green)' }}>{s.max}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--red)' }}>{s.min}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--green)', fontWeight: 600 }}>{s.passed}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--red)', fontWeight: 600 }}>{s.failed}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 5, background: s.passRate >= 70 ? 'rgba(34,197,94,0.1)' : s.passRate >= 50 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)', color: s.passRate >= 70 ? 'var(--green)' : s.passRate >= 50 ? 'var(--orange)' : 'var(--red)', fontSize: '0.72rem', fontWeight: 700 }}>{s.passRate}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Top students */}
                  {curStats.topStudents?.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>🏆 Top Students</span>
                        <button className="btn btn-xs btn-outline" onClick={async () => {
                          const res = await api.generateExcel(curStats.topStudents, 'top_students.xlsx', 'Top Students', user?.department)
                          window.open(`http://localhost:3001${res.file.url}`, '_blank')
                        }}>↓ Export</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)' }}>
                              {['#','Name','Roll','Section','Avg','Grade'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {curStats.topStudents.map((s: any, i: number) => (
                              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <td style={{ padding: '8px 12px', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c4b' : 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text)', fontWeight: 600 }}>{s.name}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{s.roll}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{s.section}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--blue)', fontWeight: 800, fontSize: '0.82rem' }}>{s.avg}</td>
                                <td style={{ padding: '8px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '0.72rem', fontWeight: 700 }}>{s.grade}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Below 75% attendance */}
                  {curStats.below75?.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--yellow)' }}>⚠ Below 75% Attendance — {curStats.below75Count} students</span>
                        <button className="btn btn-xs btn-outline" onClick={async () => {
                          const res = await api.generateExcel(curStats.below75, 'attendance_alert.xlsx', 'Low Attendance', user?.department)
                          window.open(`http://localhost:3001${res.file.url}`, '_blank')
                        }}>↓ Export List</button>
                      </div>
                      <div style={{ overflowX: 'auto', maxHeight: 200 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                              {['Name','Roll','Section','Attendance','Avg'].map(h => (
                                <th key={h} style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {curStats.below75.map((s: any, i: number) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '6px 12px', color: 'var(--text)' }}>{s.name}</td>
                                <td style={{ padding: '6px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.roll}</td>
                                <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{s.section}</td>
                                <td style={{ padding: '6px 12px', color: 'var(--orange)', fontWeight: 700 }}>{s.attendance}%</td>
                                <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{s.avg}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ── TAB: CHARTS ── */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'charts' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {!curStats ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>📈</div>
                  <p>Open a file to see charts</p>
                </div>
              ) : (
                <div style={{ maxWidth: 1080, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Chart type:</span>
                    {(['bar','line','pie','area','radar','scatter'] as ChartType[]).map(ct => (
                      <button key={ct} className={`btn btn-sm ${chartType === ct ? 'btn-primary' : 'btn-outline'}`} onClick={() => setChartType(ct)}>{ct}</button>
                    ))}
                    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Data:</span>
                    {[['section','By Section'],['subject','By Subject'],['grade','Grade Dist'],['score','Score Dist']].map(([k, l]) => (
                      <button key={k} className={`btn btn-sm ${chartDataKey === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setChartDataKey(k)}>{l}</button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Main chart */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px', gridColumn: chartType === 'radar' ? '1 / -1' : undefined }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>
                        {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart — {chartDataKey === 'section' ? 'Section' : chartDataKey === 'subject' ? 'Subject' : chartDataKey === 'grade' ? 'Grade' : 'Score'} View
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        {chartType === 'bar' ? (
                          <BarChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey={chartDataKey === 'grade' ? 'grade' : chartDataKey === 'score' ? 'range' : 'name' in getChartData()[0] ? 'name' : 'section'} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {chartDataKey === 'grade' || chartDataKey === 'score' ? (
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                {getChartData().map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Bar>
                            ) : (
                              <>
                                <Bar dataKey="avg" name="Avg Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="passRate" name="Pass Rate %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                              </>
                            )}
                          </BarChart>
                        ) : chartType === 'line' ? (
                          <LineChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey={chartDataKey === 'grade' ? 'grade' : 'name' in getChartData()[0] ? 'name' : 'section'} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="avg" name="Avg Score" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
                            <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
                          </LineChart>
                        ) : chartType === 'area' ? (
                          <AreaChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey={chartDataKey === 'grade' ? 'grade' : 'name' in getChartData()[0] ? 'name' : 'section'} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="avg" name="Avg Score" stroke="#3b82f6" fill="rgba(59,130,246,0.2)" strokeWidth={2} />
                            <Area type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#22c55e" fill="rgba(34,197,94,0.15)" strokeWidth={2} />
                          </AreaChart>
                        ) : chartType === 'pie' ? (
                          <PieChart>
                            <Pie data={chartDataKey === 'grade' ? curStats.gradeDistribution : [{ name: 'Passed', value: curStats.passed }, { name: 'Failed', value: curStats.failed }]}
                              dataKey={chartDataKey === 'grade' ? 'count' : 'value'}
                              nameKey={chartDataKey === 'grade' ? 'grade' : 'name'}
                              cx="50%" cy="50%" outerRadius={110} innerRadius={50}
                              label={({ name, value }) => `${name}: ${value}`}
                              labelLine={true}
                            >
                              {(chartDataKey === 'grade' ? curStats.gradeDistribution : [{ name: 'Passed' }, { name: 'Failed' }]).map((_: any, i: number) => <Cell key={i} fill={chartDataKey !== 'grade' ? (i === 0 ? '#22c55e' : '#ef4444') : CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                          </PieChart>
                        ) : chartType === 'radar' ? (
                          <RadarChart data={getChartData().slice(0, 8)}>
                            <PolarGrid stroke="var(--border)" />
                            <PolarAngleAxis dataKey={chartDataKey === 'grade' ? 'grade' : 'name' in getChartData()[0] ? 'name' : 'section'} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Radar name="Avg Score" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                            <Radar name="Pass Rate %" dataKey="passRate" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                            <Legend />
                            <Tooltip content={<CustomTooltip />} />
                          </RadarChart>
                        ) : (
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="avg" name="Avg Score" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <YAxis dataKey="passRate" name="Pass Rate %" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <ZAxis range={[40, 120]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Scatter name="Sections" data={getChartData()} fill="#3b82f6" />
                          </ScatterChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    {/* Pass/Fail donut */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Pass vs Fail</h4>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={[{ name: 'Passed', value: curStats.passed }, { name: 'Failed', value: curStats.failed }]} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                            <Cell fill="#22c55e" /><Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip content={<CustomTooltip />} /><Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Score distribution */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Score Distribution</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={curStats.scoreDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="range" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Students" radius={[3, 3, 0, 0]}>
                            {curStats.scoreDistribution.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Grade distribution */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Grade Distribution</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={curStats.gradeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="grade" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Students" radius={[3, 3, 0, 0]}>
                            {curStats.gradeDistribution?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ── TAB: CREATE NEW ── */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'create' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px' }}>
              <div style={{ maxWidth: 580, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>✨</div>
                  <h2 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Create New Spreadsheet</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Describe what you need — a sample file will be created</p>
                </div>
                <textarea className="input" value={createPrompt} onChange={e => setCreatePrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleCreate()} placeholder="e.g., 'Student attendance tracker for 50 students with 6 subjects', 'Monthly sales report Q4', 'Employee payroll sheet'..." style={{ width: '100%', minHeight: 110, marginBottom: 14, fontSize: '0.88rem', resize: 'vertical' }} />
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !createPrompt.trim()} style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '0.9rem', marginBottom: 22 }}>
                  {creating ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : '✨ Generate Spreadsheet'}
                </button>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Quick examples</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['Student grade sheet with 10 students','Monthly attendance tracker','Q1 sales report','Employee salary sheet','Inventory tracker','Exam results CSE Section A'].map(ex => (
                      <button key={ex} className="btn btn-xs btn-outline" onClick={() => setCreatePrompt(ex)}>{ex}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}