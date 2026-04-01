const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3001;

// Update CORS to allow your frontend ports
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add logging middleware to see requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dept = req.query.department || req.body.department || 'general';
    const dir = path.join(UPLOAD_DIR, dept);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ── IN-MEMORY DB ──────────────────────────────────────────────────
let usersDB = [
  { id: 'u1', name: 'Admin User', email: 'admin@university.edu', role: 'admin', department: 'Administration', plan: 'pro' },
  { id: 'u2', name: 'Dr. Krishna Koushik', email: 'krishna@university.edu', role: 'faculty', department: 'CSE', plan: 'pro' },
  { id: 'u3', name: 'Prof. Demo', email: 'demo@university.edu', role: 'faculty', department: 'ECE', plan: 'free' },
];
let filesDB = [];
let workflowsDB = [
  { id: 'w1', name: 'Monthly Report Generator', status: 'active', schedule: 'Monthly', lastRun: 'Mar 1, 2026', runs: 12 },
  { id: 'w2', name: 'Weekly Attendance Summary', status: 'active', schedule: 'Weekly', lastRun: 'Mar 24, 2026', runs: 8 },
];
let documentsDB = [];

// ── EXCEL PARSING ─────────────────────────────────────────────────
function parseExcel(filePath) {
  try {
    const wb = XLSX.readFile(filePath);
    const result = {};
    wb.SheetNames.forEach(name => {
      result[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
    });
    return result;
  } catch (e) { 
    console.error('Parse error:', e);
    return null; 
  }
}

function computeStats(rows) {
  if (!rows || rows.length === 0) return null;
  const skip = ['name','roll','rollno','roll_no','id','student','section','department','dept','branch','attendance','email','phone'];
  const sample = rows[0];
  const markCols = Object.keys(sample).filter(k =>
    !skip.includes(k.toLowerCase().replace(/[\s_]/g,'')) && !isNaN(parseFloat(sample[k])) && sample[k] !== ''
  );
  const passThreshold = 40;

  const students = rows.map(row => {
    const marks = markCols.map(c => parseFloat(row[c]) || 0);
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = marks.length > 0 ? total / marks.length : 0;
    const passed = marks.every(m => m >= passThreshold);
    const attendance = parseFloat(row['attendance'] || row['Attendance'] || row['ATTENDANCE'] || 0);
    return {
      name: row['name'] || row['Name'] || row['STUDENT NAME'] || row['student_name'] || 'Unknown',
      roll: String(row['roll'] || row['Roll'] || row['ROLL NO'] || row['rollno'] || ''),
      section: row['section'] || row['Section'] || row['SECTION'] || 'N/A',
      department: row['department'] || row['dept'] || row['Department'] || 'N/A',
      marks, markCols, total,
      avg: +avg.toFixed(2),
      percentage: +(marks.length > 0 ? (total / (markCols.length * 100)) * 100 : 0).toFixed(2),
      passed,
      attendance,
      below75: attendance > 0 && attendance < 75,
      grade: avg>=90?'O':avg>=80?'A+':avg>=70?'A':avg>=60?'B+':avg>=50?'B':avg>=40?'C':'F'
    };
  });

  const passed = students.filter(s => s.passed);
  const failed = students.filter(s => !s.passed);
  const avgScore = students.reduce((a,b)=>a+b.avg,0)/students.length;
  const topStudents = [...students].sort((a,b)=>b.avg-a.avg).slice(0,10);
  const below75 = students.filter(s=>s.below75);

  const sections = {};
  students.forEach(s => {
    if (!sections[s.section]) sections[s.section]=[];
    sections[s.section].push(s);
  });
  const sectionStats = Object.entries(sections).map(([sec,stds])=>({
    section:sec, count:stds.length,
    avg:+(stds.reduce((a,b)=>a+b.avg,0)/stds.length).toFixed(2),
    passed:stds.filter(s=>s.passed).length,
    failed:stds.filter(s=>!s.passed).length,
    passRate:+((stds.filter(s=>s.passed).length/stds.length)*100).toFixed(1)
  }));

  const subjectStats = markCols.map(col => {
    const vals = students.map(s=>s.marks[markCols.indexOf(col)]);
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    const p = vals.filter(v=>v>=passThreshold).length;
    return { subject:col, avg:+avg.toFixed(2), max:Math.max(...vals), min:Math.min(...vals),
      passed:p, failed:vals.length-p, passRate:+((p/vals.length)*100).toFixed(1) };
  });

  const gradeMap = {};
  students.forEach(s=>{ gradeMap[s.grade]=(gradeMap[s.grade]||0)+1 });
  const gradeDistribution = Object.entries(gradeMap).map(([grade,count])=>({grade,count}))
    .sort((a,b)=>['O','A+','A','B+','B','C','F'].indexOf(a.grade)-['O','A+','A','B+','B','C','F'].indexOf(b.grade));

  const scoreDistribution = [];
  for (let i=0;i<=90;i+=10) {
    scoreDistribution.push({ range:`${i}-${i+9}`, count: students.filter(s=>s.avg>=i&&s.avg<i+10).length });
  }

  return {
    total:students.length, passed:passed.length, failed:failed.length,
    passRate:+((passed.length/students.length)*100).toFixed(1),
    failRate:+((failed.length/students.length)*100).toFixed(1),
    avgScore:+avgScore.toFixed(2), topStudents, below75, below75Count:below75.length,
    sectionStats, subjectStats, gradeDistribution, scoreDistribution, students, markCols
  };
}

// ── AUTH ──────────────────────────────────────────────────────────
app.post('/api/auth/login', (req,res) => {
  const { email, password } = req.body;
  const passwords = { 'admin@university.edu':'admin123','krishna@university.edu':'datum2026','demo@university.edu':'demo123' };
  const user = usersDB.find(u=>u.email===email);
  if (!user||passwords[email]!==password) return res.status(401).json({error:'Invalid credentials'});
  res.json({ user, token:`tok_${user.id}_${Date.now()}` });
});

app.post('/api/auth/register', (req,res) => {
  const { name, email, department, role='faculty' } = req.body;
  if (usersDB.find(u=>u.email===email)) return res.status(400).json({error:'Email already registered'});
  const user = { id:`u${Date.now()}`, name, email, role, department, plan:'free' };
  usersDB.push(user);
  res.json({ user, token:`tok_${user.id}_${Date.now()}` });
});

app.get('/api/users', (req,res) => res.json(usersDB));

// ── FILES ─────────────────────────────────────────────────────────
app.post('/api/files/upload', (req,res,next) => {
  upload.array('files',20)(req,res,(err)=>{
    if(err) {
      console.error('Upload error:', err);
      return res.status(400).json({error:err.message});
    }
    const dept = req.query.department || 'general';
    const uploaded = (req.files || []).map(f=>{
      const record = {
        id:`f${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        name:f.originalname, path:f.path, size:f.size,
        type:path.extname(f.originalname).toLowerCase().slice(1),
        department:dept, uploadedBy:req.query.uploadedBy||'user',
        uploadedAt:new Date().toISOString(),
        url:`/uploads/${dept}/${f.filename}`
      };
      filesDB.push(record);
      return record;
    });
    console.log(`Uploaded ${uploaded.length} files to ${dept}`);
    res.json({ files:uploaded });
  });
});

app.get('/api/files', (req,res) => {
  const { department, type, search } = req.query;
  let r = [...filesDB];
  if (department) r = r.filter(f=>f.department===department);
  if (type) r = r.filter(f=>f.type===type);
  if (search) r = r.filter(f=>f.name.toLowerCase().includes(search.toLowerCase()));
  res.json(r);
});

app.delete('/api/files/:id', (req,res) => {
  const idx = filesDB.findIndex(f=>f.id===req.params.id);
  if (idx===-1) return res.status(404).json({error:'Not found'});
  const file = filesDB[idx];
  try { if(fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(e) {}
  filesDB.splice(idx,1);
  res.json({success:true});
});

app.get('/api/files/browse', (req,res) => {
  const dir = req.query.path || UPLOAD_DIR;
  try {
    const entries = fs.readdirSync(dir,{withFileTypes:true});
    const items = entries.map(e=>{
      const full = path.join(dir,e.name);
      let size=0, mtime=null;
      try { const s=fs.statSync(full); size=s.size; mtime=s.mtime; } catch(e) {}
      return { name:e.name, path:full, isDir:e.isDirectory(), size, type:e.isDirectory()?'folder':path.extname(e.name).toLowerCase().slice(1), modified:mtime };
    });
    res.json({ path:dir, parent:path.dirname(dir), items });
  } catch(e) { res.status(400).json({error:e.message}); }
});

app.post('/api/files/mkdir', (req,res) => {
  try { fs.mkdirSync(req.body.path,{recursive:true}); res.json({success:true}); }
  catch(e) { res.status(400).json({error:e.message}); }
});

app.get('/api/files/search-disk', (req,res) => {
  const { query='', directory=UPLOAD_DIR } = req.query;
  const results = [];
  function walk(dir) {
    try {
      fs.readdirSync(dir,{withFileTypes:true}).forEach(e=>{
        const full = path.join(dir,e.name);
        if (e.isDirectory()) { walk(full); }
        else if (e.name.toLowerCase().includes(query.toLowerCase())) {
          let size=0,mtime=null;
          try { const s=fs.statSync(full);size=s.size;mtime=s.mtime; } catch(e) {}
          results.push({ name:e.name, path:full, size, type:path.extname(e.name).slice(1), modified:mtime });
        }
      });
    } catch(e) {}
  }
  walk(directory);
  res.json(results.slice(0,500));
});

// ── EXCEL ANALYSIS ────────────────────────────────────────────────
app.post('/api/excel/analyze', upload.single('file'), (req,res) => {
  let filePath = req.file?.path;
  if (!filePath && req.body.fileId) {
    const r = filesDB.find(f=>f.id===req.body.fileId);
    if (r) filePath=r.path;
  }
  if (!filePath||!fs.existsSync(filePath)) return res.status(400).json({error:'No file'});
  const sheets = parseExcel(filePath);
  if (!sheets) return res.status(400).json({error:'Cannot parse file'});
  const results = {};
  Object.entries(sheets).forEach(([n,rows])=>{ results[n]=computeStats(rows); });
  res.json({ sheets:results, sheetNames:Object.keys(sheets) });
});

app.get('/api/excel/analyze/:fileId', (req,res) => {
  const record = filesDB.find(f=>f.id===req.params.fileId);
  if (!record) return res.status(404).json({error:'File not found'});
  const sheets = parseExcel(record.path);
  if (!sheets) return res.status(400).json({error:'Cannot parse'});
  const results = {};
  Object.entries(sheets).forEach(([n,rows])=>{ results[n]=computeStats(rows); });
  res.json({ sheets:results, sheetNames:Object.keys(sheets), file:record });
});

app.post('/api/excel/compare', (req,res) => {
  const { fileId1, fileId2 } = req.body;
  const f1 = filesDB.find(f=>f.id===fileId1);
  const f2 = filesDB.find(f=>f.id===fileId2);
  if (!f1||!f2) return res.status(404).json({error:'Files not found'});
  const s1 = computeStats(Object.values(parseExcel(f1.path))[0]);
  const s2 = computeStats(Object.values(parseExcel(f2.path))[0]);
  res.json({
    file1:{ name:f1.name, stats:s1 },
    file2:{ name:f2.name, stats:s2 },
    comparison:{ avgDiff:+(s1.avgScore-s2.avgScore).toFixed(2), passRateDiff:+(s1.passRate-s2.passRate).toFixed(1) }
  });
});

app.post('/api/excel/command', (req,res) => {
  const { fileId, command } = req.body;
  const record = filesDB.find(f=>f.id===fileId);
  if (!record) return res.status(404).json({error:'File not found'});
  const sheets = parseExcel(record.path);
  const rows = Object.values(sheets)[0];
  const stats = computeStats(rows);
  const cmd = command.toLowerCase();
  let data=null, message='';

  if (cmd.includes('top')) { const n=parseInt(cmd.match(/\d+/)?.[0]||'10'); data=stats.topStudents.slice(0,n); message=`Top ${n} students`; }
  else if (cmd.includes('fail')) { data=stats.students.filter(s=>!s.passed); message=`${data.length} failed students`; }
  else if (cmd.includes('pass')) { data=stats.students.filter(s=>s.passed); message=`${data.length} passed students`; }
  else if (cmd.includes('section')) { data=stats.sectionStats; message='Section comparison'; }
  else if (cmd.includes('attendance')||cmd.includes('75')) { data=stats.below75; message=`${stats.below75Count} students below 75%`; }
  else if (cmd.includes('grade')) { data=stats.gradeDistribution; message='Grade distribution'; }
  else if (cmd.includes('subject')||cmd.includes('avg')) { data=stats.subjectStats; message='Subject-wise stats'; }
  else { data=stats; message='Full analysis'; }

  res.json({ command, message, data, applied:true });
});

app.post('/api/excel/generate', (req,res) => {
  const { data, filename='output.xlsx', sheetName='Sheet1', department='general' } = req.body;
  if (!data||!Array.isArray(data)) return res.status(400).json({error:'Invalid data'});
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
  const dir = path.join(UPLOAD_DIR,department);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  const outFile = `generated_${Date.now()}_${filename}`;
  const outPath = path.join(dir,outFile);
  XLSX.writeFile(wb,outPath);
  const record = {
    id:`f${Date.now()}`, name:filename, path:outPath,
    size:fs.statSync(outPath).size, type:'xlsx', department,
    uploadedBy:'system', uploadedAt:new Date().toISOString(),
    url:`/uploads/${department}/${outFile}`
  };
  filesDB.push(record);
  res.json({ file:record, downloadUrl:`http://localhost:${PORT}${record.url}` });
});

// ── WORKFLOWS ─────────────────────────────────────────────────────
app.get('/api/workflows', (req,res) => res.json(workflowsDB));
app.post('/api/workflows', (req,res) => {
  const w = { id:`w${Date.now()}`, ...req.body, status:'paused', runs:0, lastRun:'Never' };
  workflowsDB.push(w); res.json(w);
});
app.patch('/api/workflows/:id', (req,res) => {
  const idx = workflowsDB.findIndex(w=>w.id===req.params.id);
  if (idx===-1) return res.status(404).json({error:'Not found'});
  workflowsDB[idx]={...workflowsDB[idx],...req.body}; res.json(workflowsDB[idx]);
});
app.delete('/api/workflows/:id', (req,res) => {
  workflowsDB=workflowsDB.filter(w=>w.id!==req.params.id); res.json({success:true});
});
app.post('/api/workflows/:id/run', (req,res) => {
  const idx=workflowsDB.findIndex(w=>w.id===req.params.id);
  if (idx===-1) return res.status(404).json({error:'Not found'});
  workflowsDB[idx].lastRun=new Date().toLocaleDateString(); workflowsDB[idx].runs++;
  res.json({success:true,workflow:workflowsDB[idx]});
});

// ── DOCUMENTS ─────────────────────────────────────────────────────
app.post('/api/documents/generate', (req,res) => {
  const { type='report', data, title } = req.body;
  let content = `${title||'Report'}\nGenerated: ${new Date().toLocaleString()}\n\n`;
  if (data?.stats) {
    const s=data.stats;
    content+=`SUMMARY\nTotal Students: ${s.total}\nPassed: ${s.passed} (${s.passRate}%)\nFailed: ${s.failed} (${s.failRate}%)\nClass Average: ${s.avgScore}\nBelow 75% Attendance: ${s.below75Count}\n\nTOP STUDENTS\n${s.topStudents?.slice(0,5).map((st,i)=>`${i+1}. ${st.name} - Avg: ${st.avg}`).join('\n')}`;
  }
  const doc = { id:`doc${Date.now()}`, title:title||'Report', type, content, createdAt:new Date().toISOString() };
  documentsDB.push(doc);
  res.json(doc);
});

// ── DASHBOARD ─────────────────────────────────────────────────────
app.get('/api/dashboard/stats', (req,res) => res.json({
  totalFiles:filesDB.length, totalUsers:usersDB.length,
  totalWorkflows:workflowsDB.length,
  activeWorkflows:workflowsDB.filter(w=>w.status==='active').length,
  recentFiles:filesDB.slice(-5).reverse(),
  departments:[...new Set(usersDB.map(u=>u.department))]
}));

app.get('/api/health', (req,res) => res.json({status:'ok',timestamp:new Date()}));

app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));