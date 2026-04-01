import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../index';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AIChatPanel from '../components/AIChatPanel';
import { api } from '../api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

type Tab = 'upload' | 'preview' | 'edit' | 'analyze' | 'charts' | 'create';

interface CellData {
  value: string;
  formula?: string;
  bold?: boolean;
  color?: string;
  bg?: string;
}

interface SheetData {
  name: string;
  data: CellData[][];
  rows: number;
  cols: number;
}

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6', '#eab308', '#ec4899', '#ef4444'];

export default function ExcelSheet() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.app.user);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaBar, setFormulaBar] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'radar'>('bar');
  const [chartData, setChartData] = useState<any[]>([]);
  const [createPrompt, setCreatePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files on mount
  useEffect(() => {
    checkBackend();
    loadFiles();
  }, []);

  const checkBackend = async () => {
    try {
      const health = await api.health();
      console.log('Backend health:', health);
      setBackendOnline(true);
    } catch (err) {
      console.error('Backend offline:', err);
      setBackendOnline(false);
      setError('Backend offline. Run: cd server && npm start');
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    setDebugInfo('Loading files...');
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      const res = await api.getFiles(params);
      console.log('Files loaded from API:', res);
      setDebugInfo(`Found ${res.length} files`);
      setFiles(res);
    } catch (err: any) {
      console.error('Load files error:', err);
      setDebugInfo(`Error: ${err.message}`);
      setError('Failed to load files: ' + err.message);
    }
    setLoading(false);
  };

  const handleUpload = async (fileList: File[]) => {
    if (!fileList.length) return;
    setUploading(true);
    setError('');
    setDebugInfo(`Uploading ${fileList.length} files...`);
    
    try {
      const result = await api.uploadFiles(
        Array.from(fileList),
        user?.department || 'general',
        user?.email || 'user'
      );
      console.log('Upload result:', result);
      setDebugInfo(`Uploaded ${result.files?.length || fileList.length} files`);
      setSuccess(`✓ Uploaded ${fileList.length} file(s)`);
      
      // Reload files after upload
      await loadFiles();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setDebugInfo(`Upload error: ${err.message}`);
      setError(err.message || 'Upload failed');
      setTimeout(() => setError(''), 5000);
    }
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      console.log('Selected files:', e.target.files);
      handleUpload(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => 
      /\.(xlsx|xls|csv)$/i.test(f.name)
    );
    console.log('Dropped files:', files);
    if (files.length) await handleUpload(files);
  };

  const handleSelectFile = async (file: any) => {
    console.log('Selecting file:', file);
    setSelectedFile(file);
    setAnalyzing(true);
    setError('');
    
    try {
      const res = await api.analyzeFile(file.id);
      console.log('Analysis result:', res);
      
      const loadedSheets: SheetData[] = [];
      if (res.sheets && Object.keys(res.sheets).length > 0) {
        Object.entries(res.sheets).forEach(([name, data]: [string, any]) => {
          const rows = data?.students || [];
          const markCols = data?.markCols || ['Name', 'Roll', 'Section', 'Attendance'];
          
          const sheetData: CellData[][] = [
            markCols.map(c => ({ value: c, bold: true, color: '#3b82f6' })),
            ...rows.slice(0, 100).map((row: any) => 
              markCols.map(col => ({
                value: col === 'Name' ? row.name || '' :
                       col === 'Roll' ? row.roll || '' :
                       col === 'Section' ? row.section || '' :
                       col === 'Attendance' ? row.attendance?.toString() || '' :
                       row[col]?.toString() || ''
              }))
            )
          ];
          loadedSheets.push({ name, data: sheetData, rows: sheetData.length, cols: sheetData[0]?.length || 4 });
        });
      }
      
      if (loadedSheets.length === 0) {
        loadedSheets.push({
          name: 'Sheet1',
          data: [[{ value: 'A', bold: true }, { value: 'B', bold: true }], [{ value: '' }, { value: '' }]],
          rows: 2, cols: 2
        });
      }
      
      setSheets(loadedSheets);
      setStats(res.sheets);
      setActiveTab('preview');
      setSuccess(`✓ Loaded ${loadedSheets.length} sheet(s)`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed');
    }
    setAnalyzing(false);
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;
    try {
      await api.deleteFile(id);
      await loadFiles();
      if (selectedFile?.id === id) {
        setSelectedFile(null);
        setSheets([]);
      }
      setSuccess('✓ File deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Delete failed');
    }
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    if (!sheets[activeSheet]) return;
    const newSheets = [...sheets];
    newSheets[activeSheet].data[row][col] = { ...newSheets[activeSheet].data[row][col], value };
    setSheets(newSheets);
    if (selectedCell?.row === row && selectedCell?.col === col) setFormulaBar(value);
  };

  const addRow = () => {
    if (!sheets[activeSheet]) return;
    const newSheets = [...sheets];
    const newRow: CellData[] = Array(newSheets[activeSheet].cols).fill({ value: '' });
    newSheets[activeSheet].data.push(newRow);
    newSheets[activeSheet].rows++;
    setSheets(newSheets);
    setSuccess('Row added');
    setTimeout(() => setSuccess(''), 1000);
  };

  const addColumn = () => {
    if (!sheets[activeSheet]) return;
    const newSheets = [...sheets];
    newSheets[activeSheet].data.forEach(row => row.push({ value: '' }));
    newSheets[activeSheet].cols++;
    setSheets(newSheets);
    setSuccess('Column added');
    setTimeout(() => setSuccess(''), 1000);
  };

  const deleteRow = () => {
    if (!sheets[activeSheet] || sheets[activeSheet].rows <= 1) return;
    const newSheets = [...sheets];
    newSheets[activeSheet].data.pop();
    newSheets[activeSheet].rows--;
    setSheets(newSheets);
    setSuccess('Row removed');
    setTimeout(() => setSuccess(''), 1000);
  };

  const deleteColumn = () => {
    if (!sheets[activeSheet] || sheets[activeSheet].cols <= 1) return;
    const newSheets = [...sheets];
    newSheets[activeSheet].data.forEach(row => row.pop());
    newSheets[activeSheet].cols--;
    setSheets(newSheets);
    setSuccess('Column removed');
    setTimeout(() => setSuccess(''), 1000);
  };

  const applyFormula = () => {
    if (!selectedCell || !formulaBar.startsWith('=')) return;
    const formula = formulaBar.slice(1);
    try {
      const sheet = sheets[activeSheet];
      const [func, range] = formula.split('(');
      const [start, end] = range?.replace(')', '').split(':') || [];
      if (func.toUpperCase() === 'SUM' && start && end) {
        const startCol = start.charCodeAt(0) - 65;
        const startRow = parseInt(start.slice(1)) - 1;
        const endCol = end.charCodeAt(0) - 65;
        const endRow = parseInt(end.slice(1)) - 1;
        let sum = 0;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const val = parseFloat(sheet.data[r]?.[c]?.value || '0');
            if (!isNaN(val)) sum += val;
          }
        }
        handleCellChange(selectedCell.row, selectedCell.col, sum.toString());
      }
    } catch (e) {
      setError('Invalid formula');
    }
  };

  const exportExcel = async () => {
    if (!sheets[activeSheet]) return;
    const headers = sheets[activeSheet].data[0].map(c => c.value);
    const dataToExport = sheets[activeSheet].data.slice(1).map(row =>
      Object.fromEntries(row.map((cell, i) => [headers[i] || `col${i}`, cell.value]))
    );
    try {
      const res = await api.generateExcel(
        dataToExport,
        `${sheets[activeSheet].name}_${Date.now()}.xlsx`,
        sheets[activeSheet].name,
        user?.department
      );
      window.open(`http://localhost:3001${res.file.url}`, '_blank');
      setSuccess('✓ Export ready');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Export failed');
    }
  };

  const createNewSheet = async () => {
    if (!createPrompt.trim()) return;
    setGenerating(true);
    try {
      const sampleData = [
        { Name: 'John Doe', Score: 85, Grade: 'A', Attendance: 92 },
        { Name: 'Jane Smith', Score: 78, Grade: 'B+', Attendance: 88 },
        { Name: 'Mike Johnson', Score: 92, Grade: 'A+', Attendance: 95 },
        { Name: 'Sarah Williams', Score: 67, Grade: 'C', Attendance: 74 },
        { Name: 'David Brown', Score: 89, Grade: 'A', Attendance: 91 },
      ];
      await api.generateExcel(sampleData, `${createPrompt.slice(0, 30)}.xlsx`, 'NewSheet', user?.department);
      await loadFiles();
      setCreatePrompt('');
      setActiveTab('upload');
      setSuccess(`✓ Created "${createPrompt.slice(0, 40)}"`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Creation failed');
    }
    setGenerating(false);
  };

  const prepareChartData = useCallback(() => {
    if (!stats) return;
    const firstSheet = Object.values(stats)[0] as any;
    if (!firstSheet) return;
    if (firstSheet.sectionStats?.length) {
      setChartData(firstSheet.sectionStats.map((s: any) => ({ name: s.section, avg: s.avg, passRate: s.passRate })));
    } else if (firstSheet.subjectStats?.length) {
      setChartData(firstSheet.subjectStats.map((s: any) => ({ name: s.subject, avg: s.avg, passRate: s.passRate })));
    } else if (firstSheet.gradeDistribution?.length) {
      setChartData(firstSheet.gradeDistribution);
    } else {
      setChartData([]);
    }
  }, [stats]);

  useEffect(() => {
    if (stats && activeTab === 'charts') prepareChartData();
  }, [stats, activeTab, prepareChartData]);

  const getCellAddress = (row: number, col: number) => `${String.fromCharCode(65 + col)}${row + 1}`;
  const currentSheet = sheets[activeSheet];
  const currentStats = stats ? Object.values(stats)[activeSheet] as any : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-2)' }}>

          {/* Top Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
            height: 52, borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0
          }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>EXCEL STUDIO</span>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: backendOnline ? '#22c55e' : '#ef4444' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {backendOnline ? 'Backend Online' : 'Backend Offline'}
              </span>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            
            <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? '⟳ Uploading...' : '+ Upload Excel'}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
            
            {selectedFile && (
              <>
                <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 6 }}>
                  📄 {selectedFile.name.length > 35 ? selectedFile.name.slice(0, 32) + '...' : selectedFile.name}
                </span>
                <button className="btn btn-sm btn-outline" onClick={exportExcel}>↓ Export</button>
                <button className="btn btn-sm btn-ghost" onClick={addRow}>+ Row</button>
                <button className="btn btn-sm btn-ghost" onClick={addColumn}>+ Col</button>
              </>
            )}
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              {debugInfo && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{debugInfo}</span>}
              {success && <span style={{ fontSize: '0.7rem', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 6 }}>{success}</span>}
              {error && <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: 6 }}>⚠ {error}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, gap: 4, padding: '0 12px' }}>
            {[
              { id: 'upload', label: '📁 My Files', icon: '📁' },
              { id: 'preview', label: '👁 Preview', icon: '👁', disabled: !selectedFile },
              { id: 'edit', label: '✏ Edit', icon: '✏', disabled: !selectedFile },
              { id: 'analyze', label: '📊 Analyze', icon: '📊', disabled: !selectedFile },
              { id: 'charts', label: '📈 Charts', icon: '📈', disabled: !selectedFile },
              { id: 'create', label: '✨ Create New', icon: '✨' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id as Tab)}
                disabled={tab.disabled}
                style={{
                  padding: '10px 20px', background: 'none', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem', fontWeight: activeTab === tab.id ? 600 : 500,
                  color: tab.disabled ? 'var(--text-muted)' : (activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)'),
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                  opacity: tab.disabled ? 0.5 : 1
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* Sheet Selector */}
          {selectedFile && sheets.length > 1 && (
            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '4px 12px', flexShrink: 0, overflowX: 'auto' }}>
              {sheets.map((sheet, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveSheet(i); prepareChartData(); }}
                  style={{
                    padding: '6px 16px', background: activeSheet === i ? 'var(--surface)' : 'transparent',
                    border: 'none', borderBottom: activeSheet === i ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer', fontSize: '0.75rem', color: activeSheet === i ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: activeSheet === i ? 600 : 400
                  }}
                >
                  📄 {sheet.name}
                </button>
              ))}
            </div>
          )}

          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* UPLOAD TAB */}
            {activeTab === 'upload' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                  {/* Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 20, padding: 48, textAlign: 'center', cursor: 'pointer',
                      background: dragOver ? 'var(--accent-dim)' : 'var(--surface)',
                      transition: 'all 0.2s', marginBottom: 32
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.6 }}>📊</div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Upload Excel Files</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Drag & drop or click to upload .xlsx, .xls, .csv files
                    </p>
                    <button className="btn btn-primary btn-md" style={{ marginTop: 20 }} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Select Files'}
                    </button>
                  </div>

                  {/* Search */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ fontSize: '0.9rem' }}>Your Files ({files.length})</h3>
                    <div className="search-bar" style={{ width: 220 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/></svg>
                      <input 
                        placeholder="Search files..." 
                        value={searchQuery} 
                        onChange={e => { setSearchQuery(e.target.value); loadFiles(); }} 
                      />
                    </div>
                  </div>

                  {/* Files List */}
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="spinner" style={{ width: 28, height: 28 }} />
                    </div>
                  ) : files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 16 }}>
                      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📂</div>
                      <p>No files uploaded yet. Drop your Excel files above.</p>
                      <p style={{ fontSize: '0.7rem', marginTop: 8 }}>Supported: .xlsx, .xls, .csv</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                          onClick={() => handleSelectFile(file)}
                        >
                          <div style={{ fontSize: 32 }}>📄</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{file.name}</div>
                            <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              <span>{(file.size / 1024).toFixed(1)} KB</span>
                              <span>📁 {file.department || 'general'}</span>
                              <span>📅 {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Just now'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleSelectFile(file); }}>
                              Analyze
                            </button>
                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }} onClick={(e) => deleteFile(file.id, e)}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW TAB */}
            {activeTab === 'preview' && currentSheet && (
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '100%' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, padding: '10px 12px', borderBottom: '1px solid var(--border)', width: 44 }}>#</th>
                        {currentSheet.data[0]?.map((_, ci) => (
                          <th key={ci} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {String.fromCharCode(65 + ci)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSheet.data.slice(0, 50).map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{
                              padding: '8px 12px', borderRight: '1px solid var(--border)',
                              fontWeight: cell.bold ? 600 : 400, color: cell.color || 'var(--text)',
                              background: cell.bg || 'transparent', minWidth: 100
                            }}>
                              {cell.value || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {currentSheet.data.length > 50 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid var(--border)' }}>
                      Showing first 50 of {currentSheet.data.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EDIT TAB */}
            {activeTab === 'edit' && currentSheet && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
                  <div style={{
                    width: 70, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6,
                    fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600
                  }}>
                    {selectedCell ? getCellAddress(selectedCell.row, selectedCell.col) : 'A1'}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>ƒx</span>
                  <input
                    className="input"
                    value={formulaBar}
                    onChange={e => setFormulaBar(e.target.value)}
                    placeholder="Enter value or formula (e.g., =SUM(A1:A5))"
                    style={{ flex: 1, height: 34, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                    onKeyDown={e => e.key === 'Enter' && applyFormula()}
                  />
                  <button className="btn btn-sm btn-outline" onClick={applyFormula}>Apply</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                  <div style={{ minWidth: 'max-content' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 44, padding: '6px 4px', border: '1px solid var(--border)', background: 'var(--surface)' }}></th>
                          {currentSheet.data[0]?.map((_, ci) => (
                            <th key={ci} style={{
                              padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--surface-2)',
                              fontWeight: 600, fontSize: '0.7rem', minWidth: 100
                            }}>
                              {String.fromCharCode(65 + ci)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentSheet.data.map((row, ri) => (
                          <tr key={ri}>
                            <td style={{
                              padding: '6px 4px', border: '1px solid var(--border)', background: 'var(--surface)',
                              textAlign: 'center', fontWeight: 600, fontSize: '0.7rem'
                            }}>{ri + 1}</td>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                style={{
                                  padding: 0, border: '1px solid var(--border)',
                                  background: selectedCell?.row === ri && selectedCell?.col === ci ? 'var(--accent-dim)' : 'transparent'
                                }}
                                onClick={() => {
                                  setSelectedCell({ row: ri, col: ci });
                                  setFormulaBar(cell.value);
                                }}
                              >
                                <input
                                  value={cell.value}
                                  onChange={e => handleCellChange(ri, ci, e.target.value)}
                                  style={{
                                    width: '100%', padding: '6px 12px', border: 'none', background: 'transparent',
                                    outline: 'none', fontSize: '0.75rem', color: 'var(--text)',
                                    fontFamily: 'var(--font-mono)'
                                  }}
                                  onFocus={() => setSelectedCell({ row: ri, col: ci })}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYZE TAB */}
            {activeTab === 'analyze' && currentStats && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Total', value: currentStats.total, color: '#3b82f6', icon: '👥' },
                    { label: 'Passed', value: currentStats.passed, color: '#22c55e', icon: '✅' },
                    { label: 'Failed', value: currentStats.failed, color: '#ef4444', icon: '❌' },
                    { label: 'Pass Rate', value: `${currentStats.passRate}%`, color: '#f97316', icon: '📈' },
                    { label: 'Avg Score', value: currentStats.avgScore, color: '#a855f7', icon: '⭐' },
                    { label: '<75% Attend', value: currentStats.below75Count || 0, color: '#eab308', icon: '⚠️' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${k.color}30`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{k.icon}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {currentStats.sectionStats?.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: 16 }}>📊 Section-wise Performance</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-2)' }}>
                            {['Section', 'Students', 'Avg Score', 'Passed', 'Failed', 'Pass Rate'].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                            ))}
                           </tr>
                        </thead>
                        <tbody>
                          {currentStats.sectionStats.map((s: any, i: number) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.section}</td>
                              <td style={{ padding: '10px 12px' }}>{s.count}</td>
                              <td style={{ padding: '10px 12px', color: '#3b82f6', fontWeight: 600 }}>{s.avg}</td>
                              <td style={{ padding: '10px 12px', color: '#22c55e' }}>{s.passed}</td>
                              <td style={{ padding: '10px 12px', color: '#ef4444' }}>{s.failed}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${s.passRate}%`, height: '100%', background: s.passRate > 70 ? '#22c55e' : s.passRate > 50 ? '#f97316' : '#ef4444', borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontWeight: 600, minWidth: 40 }}>{s.passRate}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {currentStats.topStudents?.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: 16 }}>🏆 Top 10 Students</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                      {currentStats.topStudents.slice(0, 10).map((s: any, i: number) => (
                        <div key={i} style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><span style={{ color: i < 3 ? '#fbbf24' : 'var(--text-muted)', fontWeight: 600, marginRight: 8 }}>{i + 1}.</span> {s.name}</span>
                          <span style={{ color: '#3b82f6', fontWeight: 700 }}>{s.avg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CHARTS TAB */}
            {activeTab === 'charts' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {!chartData.length ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 48, opacity: 0.3 }}>📊</div>
                    <p style={{ color: 'var(--text-muted)' }}>Select a file and go to Analyze tab first</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {(['bar', 'line', 'pie', 'area', 'radar'] as const).map(type => (
                        <button key={type} className={`btn ${chartType === type ? 'btn-primary' : 'btn-outline'}`} onClick={() => setChartType(type)}>
                          {type === 'bar' ? '📊 Bar' : type === 'line' ? '📈 Line' : type === 'pie' ? '🥧 Pie' : type === 'area' ? '📉 Area' : '🔮 Radar'}
                        </button>
                      ))}
                    </div>

                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                      <ResponsiveContainer width="100%" height={450}>
                        {chartType === 'bar' && (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                            <Legend />
                            <Bar dataKey="avg" name="Average Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="passRate" name="Pass Rate %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        )}
                        {chartType === 'line' && (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                            <Legend />
                            <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                            <Line type="monotone" dataKey="passRate" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
                          </LineChart>
                        )}
                        {chartType === 'pie' && chartData[0]?.count && (
                          <PieChart>
                            <Pie data={chartData} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={140} label={{ fill: 'var(--text)', fontSize: 12 }}>
                              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                            <Legend />
                          </PieChart>
                        )}
                        {chartType === 'area' && (
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                            <Legend />
                            <Area type="monotone" dataKey="avg" stroke="#3b82f6" fill="#3b82f640" />
                            <Area type="monotone" dataKey="passRate" stroke="#22c55e" fill="#22c55e40" />
                          </AreaChart>
                        )}
                        {chartType === 'radar' && (
                          <RadarChart data={chartData}>
                            <PolarGrid stroke="var(--border)" />
                            <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                            <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)' }} />
                            <Radar name="Average" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                            <Radar name="Pass Rate" dataKey="passRate" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                            <Legend />
                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                          </RadarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CREATE TAB */}
            {activeTab === 'create' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
                    <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>Create New Spreadsheet</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Describe what you need, and AI will generate a sample Excel file</p>
                  </div>

                  <textarea
                    className="input"
                    value={createPrompt}
                    onChange={e => setCreatePrompt(e.target.value)}
                    placeholder="e.g., Student attendance tracker, Q4 sales report, Employee salary sheet, Exam results analysis..."
                    style={{ width: '100%', minHeight: 120, marginBottom: 20, fontSize: '0.9rem', resize: 'vertical' }}
                  />

                  <button className="btn btn-primary btn-lg" onClick={createNewSheet} disabled={generating || !createPrompt.trim()} style={{ width: '100%', padding: '12px' }}>
                    {generating ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating...</> : '✨ Generate Spreadsheet'}
                  </button>

                  <div style={{ marginTop: 32 }}>
                    <h3 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-muted)' }}>Try these examples</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Student grade sheet with 10 students', 'Monthly sales report Q1 2026', 'Employee attendance tracker', 'Inventory stock management', 'Exam results analysis'].map(example => (
                        <button key={example} className="btn btn-xs btn-outline" onClick={() => setCreatePrompt(example)} style={{ padding: '5px 12px' }}>
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        <AIChatPanel />
      </div>
    </div>
  );
}