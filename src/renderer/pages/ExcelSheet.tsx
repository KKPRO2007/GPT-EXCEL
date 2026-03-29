import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import AIChatPanel from "../components/AIChatPanel"

type Tab = "generate" | "preview" | "code" | "chart"
type GenMode = "excel" | "document" | "chart" | "pivot" | "formula"

interface Cell { value: string; formula?: string; bold?: boolean; align?: "left" | "center" | "right" }
type SheetData = Cell[][]

const SAMPLE_SHEETS: Record<string, { name: string; data: SheetData }[]> = {
  budget: [{
    name: "Budget 2025",
    data: [
      [{ value: "Category", bold: true }, { value: "Jan", bold: true }, { value: "Feb", bold: true }, { value: "Mar", bold: true }, { value: "Q1 Total", bold: true }],
      [{ value: "Salaries" }, { value: "45000" }, { value: "45000" }, { value: "45000" }, { value: "=B2+C2+D2", formula: "135000" }],
      [{ value: "Marketing" }, { value: "8500" }, { value: "9200" }, { value: "7800" }, { value: "=B3+C3+D3", formula: "25500" }],
      [{ value: "Operations" }, { value: "12000" }, { value: "11500" }, { value: "13200" }, { value: "=B4+C4+D4", formula: "36700" }],
      [{ value: "Technology" }, { value: "5200" }, { value: "4800" }, { value: "6100" }, { value: "=B5+C5+D5", formula: "16100" }],
      [{ value: "Travel" }, { value: "3400" }, { value: "2100" }, { value: "4500" }, { value: "=B6+C6+D6", formula: "10000" }],
      [{ value: "Total", bold: true }, { value: "=SUM(B2:B6)", formula: "74100" }, { value: "=SUM(C2:C6)", formula: "72600" }, { value: "=SUM(D2:D6)", formula: "76600" }, { value: "=SUM(E2:E6)", formula: "223300" }],
    ],
  }],
  sales: [{
    name: "Sales Pipeline",
    data: [
      [{ value: "Deal Name", bold: true }, { value: "Stage", bold: true }, { value: "Value", bold: true }, { value: "Probability", bold: true }, { value: "Weighted", bold: true }, { value: "Close Date", bold: true }],
      [{ value: "Acme Corp" }, { value: "Proposal" }, { value: "85000" }, { value: "60%" }, { value: "=C2*D2", formula: "51000" }, { value: "Mar 2025" }],
      [{ value: "TechStart Inc" }, { value: "Negotiation" }, { value: "120000" }, { value: "80%" }, { value: "=C3*D3", formula: "96000" }, { value: "Feb 2025" }],
      [{ value: "Global Finance" }, { value: "Discovery" }, { value: "45000" }, { value: "25%" }, { value: "=C4*D4", formula: "11250" }, { value: "Apr 2025" }],
      [{ value: "Retail Plus" }, { value: "Closed Won" }, { value: "67000" }, { value: "100%" }, { value: "=C5*D5", formula: "67000" }, { value: "Jan 2025" }],
      [{ value: "Total", bold: true }, { value: "" }, { value: "=SUM(C2:C5)", formula: "317000" }, { value: "" }, { value: "=SUM(E2:E5)", formula: "225250" }, { value: "" }],
    ],
  }],
  default: [{
    name: "Sheet 1",
    data: [
      [{ value: "A", bold: true }, { value: "B", bold: true }, { value: "C", bold: true }],
      [{ value: "" }, { value: "" }, { value: "" }],
      [{ value: "" }, { value: "" }, { value: "" }],
    ],
  }],
}

const SAMPLE_CODE: Record<string, string> = {
  budget: `import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Budget 2025"

headers = ["Category", "Jan", "Feb", "Mar", "Q1 Total"]
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="111111")
    cell.alignment = Alignment(horizontal="center")

data = [
    ("Salaries",    45000, 45000, 45000),
    ("Marketing",    8500,  9200,  7800),
    ("Operations",  12000, 11500, 13200),
    ("Technology",   5200,  4800,  6100),
    ("Travel",       3400,  2100,  4500),
]

for row_idx, (cat, jan, feb, mar) in enumerate(data, 2):
    ws.cell(row=row_idx, column=1, value=cat)
    ws.cell(row=row_idx, column=2, value=jan)
    ws.cell(row=row_idx, column=3, value=feb)
    ws.cell(row=row_idx, column=4, value=mar)
    ws.cell(row=row_idx, column=5, value=f"=B{row_idx}+C{row_idx}+D{row_idx}")

total_row = len(data) + 2
ws.cell(row=total_row, column=1, value="Total").font = Font(bold=True)
for col in range(2, 6):
    col_letter = get_column_letter(col)
    ws.cell(row=total_row, column=col, value=f"=SUM({col_letter}2:{col_letter}{total_row-1})")

ws.column_dimensions["A"].width = 16
for col in "BCDE":
    ws.column_dimensions[col].width = 12

wb.save("budget_2025.xlsx")
print("✓ Budget generated successfully")`,

  sales: `import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Sales Pipeline"

headers = ["Deal Name", "Stage", "Value ($)", "Probability", "Weighted Value", "Close Date"]
for col, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=h)
    cell.font = Font(bold=True)
    cell.fill = PatternFill("solid", fgColor="111111")

deals = [
    ("Acme Corp",      "Proposal",    85000, 0.60, "Mar 2025"),
    ("TechStart Inc",  "Negotiation", 120000, 0.80, "Feb 2025"),
    ("Global Finance", "Discovery",   45000, 0.25, "Apr 2025"),
    ("Retail Plus",    "Closed Won",  67000, 1.00, "Jan 2025"),
]

for i, (name, stage, val, prob, date) in enumerate(deals, 2):
    ws.cell(row=i, column=1, value=name)
    ws.cell(row=i, column=2, value=stage)
    ws.cell(row=i, column=3, value=val)
    ws.cell(row=i, column=4, value=f"{int(prob*100)}%")
    ws.cell(row=i, column=5, value=f"=C{i}*{prob}")
    ws.cell(row=i, column=6, value=date)

wb.save("sales_pipeline.xlsx")
print("✓ Sales pipeline generated")`,
}

const BarChart = ({ data }: { data: { label: string; value: number; color?: string }[] }) => {
  const max = Math.max(...data.map(d => d.value))
  const W = 320, H = 160, pad = 30

  return (
    <svg width={W} height={H} style={{ fontFamily: "var(--font-mono)" }}>
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = pad + (H - pad * 2) * (1 - ratio)
        return (
          <g key={ratio}>
            <line x1={pad} y1={y} x2={W - 10} y2={y} stroke="var(--border)" strokeWidth={1}/>
            <text x={pad - 4} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={8}>
              {Math.round(max * ratio / 1000)}k
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const barW = (W - pad * 2 - 10) / data.length - 6
        const x = pad + i * ((W - pad * 2 - 10) / data.length) + 3
        const barH = ((d.value / max) * (H - pad * 2))
        const y = pad + (H - pad * 2) - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              fill={d.color || "var(--text)"} opacity={0.85} rx={2}/>
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize={8}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function ExcelSheet() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("generate")
  const [genMode, setGenMode] = useState<GenMode>("excel")
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [sheets, setSheets] = useState<{ name: string; data: SheetData }[]>(SAMPLE_SHEETS.default)
  const [activeSheet, setActiveSheet] = useState(0)
  const [code, setCode] = useState("")
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [formulaBar, setFormulaBar] = useState("")
  const [hasResult, setHasResult] = useState(false)
  const [historyItems, setHistoryItems] = useState<string[]>([
    "Monthly budget tracker with charts",
    "Sales pipeline Q4 forecast",
  ])
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true); setProgress(0)
    setHistoryItems(p => [prompt, ...p.slice(0, 9)])

    const steps = [
      [15, "Analyzing prompt..."],
      [35, "Generating Python code..."],
      [60, "Executing with openpyxl..."],
      [80, "Building spreadsheet..."],
      [95, "Finalizing output..."],
      [100, "Done!"],
    ]

    for (const [p, label] of steps) {
      await new Promise(r => setTimeout(r, 280 + Math.random() * 200))
      setProgress(p as number); setProgressLabel(label as string)
    }

    const lower = prompt.toLowerCase()
    const key = lower.includes("budget") ? "budget" : lower.includes("sales") || lower.includes("pipeline") ? "sales" : "budget"
    setSheets(SAMPLE_SHEETS[key])
    setCode(SAMPLE_CODE[key] || SAMPLE_CODE.budget)
    setHasResult(true)
    setGenerating(false)
    setActiveTab("preview")
  }

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell([row, col])
    const cell = sheets[activeSheet]?.data[row]?.[col]
    setFormulaBar(cell?.formula ? `=${cell.formula}` : cell?.value || "")
  }

  const getCellRef = (row: number, col: number) => {
    const cols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return `${cols[col]}${row + 1}`
  }

  const currentData = sheets[activeSheet]?.data || []

  const chartData = hasResult ? [
    { label: "Jan", value: 74100 },
    { label: "Feb", value: 72600 },
    { label: "Mar", value: 76600 },
  ] : []

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", fontFamily: "var(--font-body)" }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar isOpen={sidebarOpen} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-2)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
            height: 44, borderBottom: "1px solid var(--border)", background: "var(--bg)",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              EXCEL SHEET
            </div>
            <div className="divider-v" style={{ height: 16, margin: "0 4px" }}/>
            <div style={{ display: "flex", gap: 2 }}>
              {(["excel", "document", "chart", "pivot", "formula"] as GenMode[]).map(m => (
                <button key={m} className={`btn btn-xs ${genMode === m ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setGenMode(m)} style={{ textTransform: "capitalize" }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {hasResult && (
                <>
                  <button className="btn btn-secondary btn-sm">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1={12} y1={15} x2={12} y2={3}/>
                    </svg>
                    Export .xlsx
                  </button>
                  <button className="btn btn-outline btn-sm">Export PDF</button>
                  <button className="btn btn-outline btn-sm">Export CSV</button>
                </>
              )}
            </div>
          </div>

          <div style={{
            display: "flex", gap: 0,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)", flexShrink: 0,
          }}>
            {(["generate", "preview", "code", "chart"] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "8px 16px", background: "none",
                border: "none", borderBottom: activeTab === tab ? "2px solid var(--text)" : "2px solid transparent",
                cursor: "pointer", fontSize: "0.78rem", fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "var(--text)" : "var(--text-secondary)",
                transition: "all 0.15s", textTransform: "capitalize",
              }}>
                {tab}
                {tab === "preview" && hasResult && <span style={{ marginLeft: 4, width: 5, height: 5, background: "var(--success)", borderRadius: "50%", display: "inline-block" }}/>}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
            {activeTab === "generate" && (
              <div style={{ flex: 1, display: "flex", overflowY: "auto", padding: "24px", gap: 20 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
                  <div>
                    <h2 style={{ marginBottom: 4, fontSize: "1rem" }}>
                      Generate {genMode === "excel" ? "Spreadsheet" : genMode === "document" ? "Document" : genMode === "chart" ? "Chart" : genMode === "pivot" ? "Pivot Table" : "Formula"}
                    </h2>
                    <p style={{ fontSize: "0.8rem" }}>Describe what you want and AI will generate it with Python + openpyxl.</p>
                  </div>

                  <div style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 10, overflow: "hidden",
                  }}>
                    <textarea
                      ref={promptRef}
                      className="input"
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate() }}
                      placeholder={genMode === "formula" ? 'Describe your formula: "Sum values in column B where column A equals Sales and column C > 1000"' : genMode === "pivot" ? 'Describe your pivot: "Pivot table of sales by region and product category with totals"' : 'Describe your spreadsheet: "Monthly budget tracker for a startup with income, expenses, and profit/loss with conditional formatting for negative values"'}
                      style={{
                        border: "none", borderRadius: 0, resize: "none",
                        minHeight: 120, boxShadow: "none", fontSize: "0.875rem",
                      }}
                      rows={5}
                    />
                    <div style={{
                      padding: "8px 12px", borderTop: "1px solid var(--border)",
                      background: "var(--bg-3)", display: "flex",
                      alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["with charts", "with formatting", "with formulas", "downloadable"].map(t => (
                          <button key={t} className="btn btn-xs btn-outline"
                            onClick={() => setPrompt(p => p ? p + ` ${t}` : t)}
                          >{t}</button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                          {prompt.length}/2000
                        </span>
                        <button className="btn btn-primary btn-sm" onClick={handleGenerate}
                          disabled={!prompt.trim() || generating} style={{ minWidth: 80 }}
                        >
                          {generating ? "Generating..." : "Generate →"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {generating && (
                    <div style={{ padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{progressLabel}</span>
                        <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{progress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill striped" style={{ width: `${progress}%` }}/>
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                      Quick Templates
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { title: "Monthly Budget", desc: "Income & expenses with charts", prompt: "Create a monthly budget tracker with income, expenses by category, running totals, and a bar chart" },
                        { title: "Sales Pipeline", desc: "CRM opportunity tracker", prompt: "Build a sales pipeline tracker with deal name, stage, value, probability, weighted value, and close date" },
                        { title: "KPI Dashboard", desc: "Business metrics overview", prompt: "Create a KPI dashboard with revenue, growth rate, customer count, and churn rate metrics with sparklines" },
                        { title: "Employee Sheet", desc: "HR attendance & payroll", prompt: "Generate an employee attendance and payroll sheet with name, department, days present, rate, and net pay" },
                        { title: "Inventory Tracker", desc: "Stock management", prompt: "Create an inventory tracker with product name, SKU, quantity, reorder level, and value with low-stock alerts" },
                        { title: "P&L Statement", desc: "Profit & loss report", prompt: "Generate a monthly profit and loss statement with revenue, COGS, gross profit, operating expenses, and net income" },
                      ].map(t => (
                        <div key={t.title} style={{
                          padding: "10px 12px", background: "var(--surface)",
                          border: "1px solid var(--border)", borderRadius: 7,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)"; (e.currentTarget as HTMLElement).style.background = "var(--surface-2)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--surface)" }}
                          onClick={() => { setPrompt(t.prompt); promptRef.current?.focus() }}
                        >
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{t.title}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                    <div className="panel-header">Recent Prompts</div>
                    <div>
                      {historyItems.map((h, i) => (
                        <div key={i} style={{
                          padding: "8px 12px", fontSize: "0.75rem",
                          color: "var(--text-secondary)", cursor: "pointer",
                          borderBottom: "1px solid var(--border)", transition: "background 0.1s",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          onClick={() => { setPrompt(h); promptRef.current?.focus() }}
                        >{h}</div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px" }}>
                    <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Tips</div>
                    {[
                      "Be specific about columns and data types",
                      "Mention if you want formulas or static values",
                      "Ask for conditional formatting explicitly",
                      "Specify currency or date formats",
                    ].map((t, i) => (
                      <div key={i} style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid var(--border)", lineHeight: 1.4 }}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "preview" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {!hasResult ? (
                  <div className="empty-state" style={{ margin: "auto" }}>
                    <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⊞</div>
                    <h3>No spreadsheet generated yet</h3>
                    <p>Go to the Generate tab and create your first spreadsheet</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab("generate")}>Generate now →</button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                      height: 32, borderBottom: "1px solid var(--border)", flexShrink: 0,
                      background: "var(--bg)",
                    }}>
                      <div style={{
                        width: 56, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid var(--border)", fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
                        background: "var(--surface)",
                      }}>
                        {selectedCell ? getCellRef(selectedCell[0], selectedCell[1]) : ""}
                      </div>
                      <div style={{ width: 1, height: 20, background: "var(--border)" }}/>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>ƒ</span>
                      <input className="input input-mono" value={formulaBar}
                        onChange={e => setFormulaBar(e.target.value)}
                        style={{ flex: 1, border: "none", boxShadow: "none", background: "transparent", padding: "0 4px", height: 24, fontSize: "0.78rem" }}
                      />
                    </div>

                    <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                      <div style={{ display: "inline-flex", minWidth: "100%" }}>
                        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", fontSize: "0.75rem" }}>
                          <thead>
                            <tr>
                              <th className="cell row-header" style={{ width: 44, position: "sticky", left: 0, top: 0, zIndex: 3 }}/>
                              {currentData[0]?.map((_, ci) => (
                                <th key={ci} className="cell header" style={{ position: "sticky", top: 0, zIndex: 2, width: ci === 0 ? 140 : 100, textAlign: "center" }}>
                                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[ci]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentData.map((row, ri) => (
                              <tr key={ri}>
                                <td className="cell row-header header" style={{ position: "sticky", left: 0, zIndex: 1 }}>{ri + 1}</td>
                                {row.map((cell, ci) => (
                                  <td key={ci}
                                    className={`cell${selectedCell?.[0] === ri && selectedCell?.[1] === ci ? " selected" : ""}`}
                                    style={{
                                      fontWeight: cell.bold ? 700 : 400,
                                      textAlign: cell.align || (ri === 0 || cell.bold ? "center" : "left"),
                                      color: ri === 0 || (cell.bold && ri > 0) ? "var(--text)" : "var(--text-secondary)",
                                    }}
                                    onClick={() => handleCellClick(ri, ci)}
                                  >
                                    {cell.formula || cell.value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{
                      display: "flex", alignItems: "center", gap: 0,
                      borderTop: "1px solid var(--border)", height: 32, paddingLeft: 8,
                      background: "var(--bg)", flexShrink: 0,
                    }}>
                      {sheets.map((s, i) => (
                        <button key={i} onClick={() => setActiveSheet(i)} style={{
                          padding: "0 14px", height: "100%", border: "none",
                          borderRight: "1px solid var(--border)",
                          background: activeSheet === i ? "var(--surface)" : "transparent",
                          color: activeSheet === i ? "var(--text)" : "var(--text-muted)",
                          cursor: "pointer", fontSize: "0.75rem", fontWeight: activeSheet === i ? 600 : 400,
                          borderBottom: activeSheet === i ? "2px solid var(--accent)" : "2px solid transparent",
                          transition: "all 0.1s",
                        }}>{s.name}</button>
                      ))}
                      <button className="btn btn-ghost btn-xs" style={{ marginLeft: 4 }}>+ Sheet</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "code" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {!hasResult ? (
                  <div className="empty-state" style={{ margin: "auto" }}>
                    <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>{"</>"}</div>
                    <h3>No code generated yet</h3>
                    <p>Generate a spreadsheet first to see the Python code</p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "0 12px", height: 40, borderBottom: "1px solid var(--border)",
                      background: "var(--bg)", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                        PYTHON · openpyxl · Read-only
                      </span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(code) }}>Copy Code</button>
                        <button className="btn btn-primary btn-sm">▶ Run Locally</button>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflow: "auto", background: "var(--code-bg)" }}>
                      <pre style={{
                        padding: "16px 20px", margin: 0,
                        fontSize: "0.75rem", fontFamily: "var(--font-mono)",
                        color: "var(--code-text)", lineHeight: 1.7,
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {code.split("\n").map((line, i) => (
                          <div key={i} style={{ display: "flex" }}>
                            <span style={{ minWidth: 36, color: "var(--text-muted)", textAlign: "right", paddingRight: 16, userSelect: "none", fontSize: "0.7rem", opacity: 0.5 }}>
                              {i + 1}
                            </span>
                            <span>{line || "\u00A0"}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "chart" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", gap: 20 }}>
                {!hasResult ? (
                  <div className="empty-state" style={{ margin: "auto" }}>
                    <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>◬</div>
                    <h3>No chart data yet</h3>
                    <p>Generate a spreadsheet first, then visualize the data here</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
                    <h3 style={{ fontSize: "0.9rem" }}>Generated Charts</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                      {[
                        { title: "Q1 Budget by Month", type: "bar" },
                        { title: "Expense Distribution", type: "bar" },
                      ].map(c => (
                        <div key={c.title} style={{
                          background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: 10, padding: "14px 16px",
                        }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>{c.title}</div>
                          <BarChart data={chartData}/>
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button className="btn btn-xs btn-outline">Edit</button>
                            <button className="btn btn-xs btn-outline">Export PNG</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <AIChatPanel />
      </div>
    </div>
  )
}