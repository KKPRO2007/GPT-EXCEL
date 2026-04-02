const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const XLSX = require('xlsx')

const app = express()
const PORT = 3001

app.use(cors({
  origin: ['http://localhost:3000','http://localhost:5173','http://127.0.0.1:3000','http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR))

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dept = req.query.department || 'general'
    const dir = path.join(UPLOAD_DIR, dept)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
})
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } })

// ── IN-MEMORY DB ─────────────────────────────────────────────────
let usersDB = [
  { id: 'u1', name: 'Admin User', email: 'admin@university.edu', role: 'admin', department: 'Administration', plan: 'pro' },
  { id: 'u2', name: 'Dr. Krishna Koushik', email: 'krishna@university.edu', role: 'faculty', department: 'CSE', plan: 'pro' },
  { id: 'u3', name: 'Prof. Demo', email: 'demo@university.edu', role: 'faculty', department: 'ECE', plan: 'free' },
]
let filesDB = []
let workflowsDB = [
  { id: 'w1', name: 'Monthly Report Generator', status: 'active', schedule: 'Monthly', lastRun: 'Mar 1, 2026', runs: 12 },
  { id: 'w2', name: 'Weekly Attendance Summary', status: 'active', schedule: 'Weekly', lastRun: 'Mar 24, 2026', runs: 8 },
]

// ── EXCEL HELPERS ────────────────────────────────────────────────
function parseExcelFull(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { cellStyles: true, cellFormulas: true, cellDates: true })
    const result = {}
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name]
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      const rows = []
      const headers = []

      // Get actual cell data with formatting
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c: C })
        const cell = ws[cellAddr]
        headers.push(cell ? (cell.v !== undefined ? String(cell.v) : '') : '')
      }

      for (let R = range.s.r; R <= range.e.r; R++) {
        const row = []
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = ws[cellAddr]
          row.push({
            v: cell ? (cell.v !== undefined ? cell.v : '') : '',
            t: cell ? cell.t : 'z',
            f: cell ? cell.f : undefined,
            r: R,
            c: C,
            addr: cellAddr
          })
        }
        rows.push(row)
      }

      result[name] = {
        rows,
        headers,
        rowCount: range.e.r - range.s.r + 1,
        colCount: range.e.c - range.s.c + 1,
        rawRows: XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 })
      }
    })
    return result
  } catch (e) {
    console.error('Parse error:', e)
    return null
  }
}

function computeStats(rawRows) {
  if (!rawRows || rawRows.length < 2) return null
  const headers = rawRows[0].map(h => String(h || ''))
  const dataRows = rawRows.slice(1).filter(r => r.some(c => c !== ''))
  if (!dataRows.length) return null

  const skip = new Set(['name','roll','rollno','roll_no','id','student','section','department','dept','branch','email','phone','sno','s.no','sl.no'])
  const markColIdxs = headers.map((h, i) => {
    const key = h.toLowerCase().replace(/[\s_\.\-]/g,'')
    if (skip.has(key)) return -1
    const vals = dataRows.map(r => parseFloat(r[i])).filter(v => !isNaN(v))
    return vals.length > dataRows.length * 0.5 ? i : -1
  }).filter(i => i >= 0)

  const attendIdx = headers.findIndex(h => /attend/i.test(h))
  const nameIdx = headers.findIndex(h => /name/i.test(h))
  const rollIdx = headers.findIndex(h => /roll|sno|s\.no/i.test(h))
  const secIdx = headers.findIndex(h => /section|sec/i.test(h))
  const deptIdx = headers.findIndex(h => /dept|department/i.test(h))
  const passThreshold = 40

  const students = dataRows.map(row => {
    const marks = markColIdxs.map(i => parseFloat(row[i]) || 0)
    const total = marks.reduce((a, b) => a + b, 0)
    const avg = marks.length ? total / marks.length : 0
    const passed = marks.length ? marks.every(m => m >= passThreshold) : false
    const attendance = attendIdx >= 0 ? parseFloat(row[attendIdx]) || 0 : 0
    const avg2dp = +avg.toFixed(2)
    return {
      name: nameIdx >= 0 ? String(row[nameIdx] || 'Unknown') : 'Unknown',
      roll: rollIdx >= 0 ? String(row[rollIdx] || '') : '',
      section: secIdx >= 0 ? String(row[secIdx] || 'N/A') : 'N/A',
      department: deptIdx >= 0 ? String(row[deptIdx] || 'N/A') : 'N/A',
      marks, markCols: markColIdxs.map(i => headers[i]),
      total, avg: avg2dp,
      percentage: +((marks.length ? total / (markColIdxs.length * 100) : 0) * 100).toFixed(2),
      passed, attendance,
      below75: attendance > 0 && attendance < 75,
      grade: avg2dp>=90?'O':avg2dp>=80?'A+':avg2dp>=70?'A':avg2dp>=60?'B+':avg2dp>=50?'B':avg2dp>=40?'C':'F'
    }
  }).filter(s => s.name !== 'Unknown' || s.marks.some(m => m > 0))

  if (!students.length) return null

  const passed = students.filter(s => s.passed)
  const failed = students.filter(s => !s.passed)
  const avgScore = students.reduce((a, b) => a + b.avg, 0) / students.length
  const topStudents = [...students].sort((a, b) => b.avg - a.avg).slice(0, 10)
  const below75 = students.filter(s => s.below75)

  const sections = {}
  students.forEach(s => { if (!sections[s.section]) sections[s.section] = []; sections[s.section].push(s) })
  const sectionStats = Object.entries(sections).map(([sec, stds]) => ({
    section: sec, count: stds.length,
    avg: +(stds.reduce((a, b) => a + b.avg, 0) / stds.length).toFixed(2),
    passed: stds.filter(s => s.passed).length,
    failed: stds.filter(s => !s.passed).length,
    passRate: +((stds.filter(s => s.passed).length / stds.length) * 100).toFixed(1)
  }))

  const subjectStats = markColIdxs.map((colIdx, mi) => {
    const vals = students.map(s => s.marks[mi])
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const p = vals.filter(v => v >= passThreshold).length
    return {
      subject: headers[colIdx], avg: +avg.toFixed(2),
      max: Math.max(...vals), min: Math.min(...vals),
      passed: p, failed: vals.length - p,
      passRate: +((p / vals.length) * 100).toFixed(1)
    }
  })

  const gradeMap = {}
  students.forEach(s => { gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1 })
  const gradeDistribution = ['O','A+','A','B+','B','C','F']
    .filter(g => gradeMap[g])
    .map(grade => ({ grade, count: gradeMap[grade] }))

  const scoreDistribution = []
  for (let i = 0; i <= 90; i += 10) {
    scoreDistribution.push({ range: `${i}-${i+9}`, count: students.filter(s => s.avg >= i && s.avg < i + 10).length })
  }

  return {
    total: students.length, passed: passed.length, failed: failed.length,
    passRate: +((passed.length / students.length) * 100).toFixed(1),
    failRate: +((failed.length / students.length) * 100).toFixed(1),
    avgScore: +avgScore.toFixed(2), topStudents, below75, below75Count: below75.length,
    sectionStats, subjectStats, gradeDistribution, scoreDistribution, students,
    markCols: markColIdxs.map(i => headers[i]), headers
  }
}

// ── AUTH ─────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const passwords = { 'admin@university.edu': 'admin123', 'krishna@university.edu': 'datum2026', 'demo@university.edu': 'demo123' }
  const user = usersDB.find(u => u.email === email)
  if (!user || passwords[email] !== password) return res.status(401).json({ error: 'Invalid credentials' })
  res.json({ user, token: `tok_${user.id}_${Date.now()}` })
})

app.post('/api/auth/register', (req, res) => {
  const { name, email, department, role = 'faculty' } = req.body
  if (usersDB.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' })
  const user = { id: `u${Date.now()}`, name, email, role, department, plan: 'free' }
  usersDB.push(user)
  res.json({ user, token: `tok_${user.id}_${Date.now()}` })
})

app.get('/api/users', (req, res) => res.json(usersDB))

// ── FILES ────────────────────────────────────────────────────────
app.post('/api/files/upload', (req, res, next) => {
  upload.array('files', 20)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message })
    const dept = req.query.department || 'general'
    const uploaded = (req.files || []).map(f => {
      const record = {
        id: `f${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: f.originalname, path: f.path, size: f.size,
        type: path.extname(f.originalname).toLowerCase().slice(1),
        department: dept, uploadedBy: req.query.uploadedBy || 'user',
        uploadedAt: new Date().toISOString(),
        url: `/uploads/${dept}/${f.filename}`
      }
      filesDB.push(record)
      return record
    })
    console.log(`Uploaded ${uploaded.length} files`)
    res.json({ files: uploaded })
  })
})

app.get('/api/files', (req, res) => {
  const { department, type, search } = req.query
  let r = [...filesDB]
  if (department) r = r.filter(f => f.department === department)
  if (type) r = r.filter(f => f.type === type)
  if (search) r = r.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  res.json(r)
})

app.delete('/api/files/:id', (req, res) => {
  const idx = filesDB.findIndex(f => f.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const file = filesDB[idx]
  try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch (e) {}
  filesDB.splice(idx, 1)
  res.json({ success: true })
})

app.get('/api/files/browse', (req, res) => {
  const dir = req.query.path || UPLOAD_DIR
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const items = entries.map(e => {
      const full = path.join(dir, e.name)
      let size = 0, mtime = null
      try { const s = fs.statSync(full); size = s.size; mtime = s.mtime } catch (e) {}
      return { name: e.name, path: full, isDir: e.isDirectory(), size, type: e.isDirectory() ? 'folder' : path.extname(e.name).toLowerCase().slice(1), modified: mtime }
    })
    res.json({ path: dir, parent: path.dirname(dir), items })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/api/files/mkdir', (req, res) => {
  try { fs.mkdirSync(req.body.path, { recursive: true }); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

app.get('/api/files/search-disk', (req, res) => {
  const { query = '', directory = UPLOAD_DIR } = req.query
  const results = []
  function walk(dir) {
    try {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { walk(full) }
        else if (e.name.toLowerCase().includes(query.toLowerCase())) {
          let size = 0, mtime = null
          try { const s = fs.statSync(full); size = s.size; mtime = s.mtime } catch (e) {}
          results.push({ name: e.name, path: full, size, type: path.extname(e.name).slice(1), modified: mtime })
        }
      })
    } catch (e) {}
  }
  walk(directory)
  res.json(results.slice(0, 500))
})

// ── EXCEL ────────────────────────────────────────────────────────

// Full raw sheet data (for real preview)
app.get('/api/excel/raw/:fileId', (req, res) => {
  const record = filesDB.find(f => f.id === req.params.fileId)
  if (!record) return res.status(404).json({ error: 'File not found' })
  const data = parseExcelFull(record.path)
  if (!data) return res.status(400).json({ error: 'Cannot parse file' })
  res.json({ data, file: record })
})

app.post('/api/excel/analyze', upload.single('file'), (req, res) => {
  let filePath = req.file?.path
  if (!filePath && req.body.fileId) {
    const r = filesDB.find(f => f.id === req.body.fileId)
    if (r) filePath = r.path
  }
  if (!filePath || !fs.existsSync(filePath)) return res.status(400).json({ error: 'No file' })
  const data = parseExcelFull(filePath)
  if (!data) return res.status(400).json({ error: 'Cannot parse file' })

  const results = {}
  Object.entries(data).forEach(([name, sheet]) => {
    results[name] = computeStats(sheet.rawRows)
  })
  res.json({ sheets: results, sheetNames: Object.keys(data), rawData: data })
})

app.get('/api/excel/analyze/:fileId', (req, res) => {
  const record = filesDB.find(f => f.id === req.params.fileId)
  if (!record) return res.status(404).json({ error: 'File not found' })
  const data = parseExcelFull(record.path)
  if (!data) return res.status(400).json({ error: 'Cannot parse' })

  const results = {}
  Object.entries(data).forEach(([name, sheet]) => {
    results[name] = computeStats(sheet.rawRows)
  })
  res.json({ sheets: results, sheetNames: Object.keys(data), rawData: data, file: record })
})

app.post('/api/excel/compare', (req, res) => {
  const { fileId1, fileId2 } = req.body
  const f1 = filesDB.find(f => f.id === fileId1)
  const f2 = filesDB.find(f => f.id === fileId2)
  if (!f1 || !f2) return res.status(404).json({ error: 'Files not found' })
  const d1 = parseExcelFull(f1.path)
  const d2 = parseExcelFull(f2.path)
  const s1 = computeStats(Object.values(d1)[0].rawRows)
  const s2 = computeStats(Object.values(d2)[0].rawRows)
  res.json({
    file1: { name: f1.name, stats: s1 },
    file2: { name: f2.name, stats: s2 },
    comparison: { avgDiff: +(s1.avgScore - s2.avgScore).toFixed(2), passRateDiff: +(s1.passRate - s2.passRate).toFixed(1) }
  })
})

// AI command on data
app.post('/api/excel/command', (req, res) => {
  const { fileId, command } = req.body
  const record = filesDB.find(f => f.id === fileId)
  if (!record) return res.status(404).json({ error: 'File not found' })
  const data = parseExcelFull(record.path)
  const rawRows = Object.values(data)[0].rawRows
  const stats = computeStats(rawRows)
  if (!stats) return res.status(400).json({ error: 'No data to analyze' })

  const cmd = command.toLowerCase()
  let result = null, message = '', type = 'table'

  if (/top\s*(\d+)/.test(cmd)) {
    const n = parseInt(cmd.match(/top\s*(\d+)/)[1] || '10')
    result = stats.topStudents.slice(0, n)
    message = `Top ${n} students by average score`
  } else if (/fail/i.test(cmd)) {
    result = stats.students.filter(s => !s.passed)
    message = `${result.length} failed students (scored below pass mark)`
  } else if (/pass/i.test(cmd)) {
    result = stats.students.filter(s => s.passed)
    message = `${result.length} passed students`
  } else if (/section/i.test(cmd)) {
    result = stats.sectionStats; type = 'section'
    message = `Section-wise comparison (${stats.sectionStats.length} sections)`
  } else if (/attend|75/i.test(cmd)) {
    result = stats.below75
    message = `${stats.below75Count} students below 75% attendance`
  } else if (/grade/i.test(cmd)) {
    result = stats.gradeDistribution; type = 'grade'
    message = 'Grade distribution'
  } else if (/subject|avg|average/i.test(cmd)) {
    result = stats.subjectStats; type = 'subject'
    message = 'Subject-wise performance'
  } else if (/sort.*score|rank/i.test(cmd)) {
    result = [...stats.students].sort((a, b) => b.avg - a.avg)
    message = 'Students sorted by average score (highest first)'
  } else if (/search\s+(.+)/i.test(cmd)) {
    const q = cmd.match(/search\s+(.+)/i)[1].trim()
    result = stats.students.filter(s =>
      s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) || s.section.toLowerCase().includes(q)
    )
    message = `Search results for "${q}" — ${result.length} students found`
  } else {
    result = stats; type = 'summary'
    message = 'Full analysis summary'
  }

  res.json({ command, message, data: result, type, stats })
})

// Save edited sheet data back
app.post('/api/excel/save/:fileId', (req, res) => {
  const record = filesDB.find(f => f.id === req.params.fileId)
  if (!record) return res.status(404).json({ error: 'Not found' })
  const { rows, sheetName } = req.body

  try {
    const wb = XLSX.readFile(record.path)
    const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => c.v !== undefined ? c.v : c)))
    wb.Sheets[sheetName || wb.SheetNames[0]] = ws
    XLSX.writeFile(wb, record.path)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/excel/generate', (req, res) => {
  const { data, filename = 'output.xlsx', sheetName = 'Sheet1', department = 'general' } = req.body
  if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Invalid data' })
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const dir = path.join(UPLOAD_DIR, department)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const outFile = `generated_${Date.now()}_${filename}`
  const outPath = path.join(dir, outFile)
  XLSX.writeFile(wb, outPath)
  const record = {
    id: `f${Date.now()}`, name: filename, path: outPath,
    size: fs.statSync(outPath).size, type: 'xlsx', department,
    uploadedBy: 'system', uploadedAt: new Date().toISOString(),
    url: `/uploads/${department}/${outFile}`
  }
  filesDB.push(record)
  res.json({ file: record, downloadUrl: `http://localhost:${PORT}${record.url}` })
})

// ── WORKFLOWS ────────────────────────────────────────────────────
app.get('/api/workflows', (req, res) => res.json(workflowsDB))
app.post('/api/workflows', (req, res) => {
  const w = { id: `w${Date.now()}`, ...req.body, status: 'paused', runs: 0, lastRun: 'Never' }
  workflowsDB.push(w); res.json(w)
})
app.patch('/api/workflows/:id', (req, res) => {
  const idx = workflowsDB.findIndex(w => w.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  workflowsDB[idx] = { ...workflowsDB[idx], ...req.body }; res.json(workflowsDB[idx])
})
app.delete('/api/workflows/:id', (req, res) => {
  workflowsDB = workflowsDB.filter(w => w.id !== req.params.id); res.json({ success: true })
})
app.post('/api/workflows/:id/run', (req, res) => {
  const idx = workflowsDB.findIndex(w => w.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  workflowsDB[idx].lastRun = new Date().toLocaleDateString(); workflowsDB[idx].runs++
  res.json({ success: true, workflow: workflowsDB[idx] })
})

// ── DOCUMENTS ───────────────────────────────────────────────────
app.post('/api/documents/generate', (req, res) => {
  const { type = 'report', data, title } = req.body
  let content = `${title || 'Report'}\nGenerated: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`
  if (data?.stats) {
    const s = data.stats
    content += `EXECUTIVE SUMMARY\n${'-'.repeat(30)}\nTotal Students: ${s.total}\nPassed: ${s.passed} (${s.passRate}%)\nFailed: ${s.failed} (${s.failRate}%)\nClass Average: ${s.avgScore}\nBelow 75% Attendance: ${s.below75Count}\n\nTOP 5 STUDENTS\n${'-'.repeat(30)}\n${s.topStudents?.slice(0, 5).map((st, i) => `${i + 1}. ${st.name} (${st.roll}) — Avg: ${st.avg}, Grade: ${st.grade}`).join('\n')}\n\nSECTION ANALYSIS\n${'-'.repeat(30)}\n${s.sectionStats?.map(sec => `${sec.section}: ${sec.count} students, Avg: ${sec.avg}, Pass Rate: ${sec.passRate}%`).join('\n') || 'N/A'}`
  } else if (data?.prompt) {
    content += `Document Type: ${type}\nPrepared for: ${data.user || 'Faculty'}\nDepartment: ${data.department || 'N/A'}\n\n${data.prompt}\n\n[This document was generated by GPT-EXCEL. Please review and customize as needed.]`
  }
  const doc = { id: `doc${Date.now()}`, title: title || 'Report', type, content, createdAt: new Date().toISOString() }
  res.json(doc)
})

// ── DASHBOARD ───────────────────────────────────────────────────
app.get('/api/dashboard/stats', (req, res) => res.json({
  totalFiles: filesDB.length, totalUsers: usersDB.length,
  totalWorkflows: workflowsDB.length,
  activeWorkflows: workflowsDB.filter(w => w.status === 'active').length,
  recentFiles: filesDB.slice(-5).reverse(),
  departments: [...new Set(usersDB.map(u => u.department))]
}))

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), filesCount: filesDB.length }))

app.listen(PORT, () => console.log(`\n✓ GPT-EXCEL Server → http://localhost:${PORT}\n`))