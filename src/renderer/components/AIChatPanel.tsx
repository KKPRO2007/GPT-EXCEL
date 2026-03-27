import { useState, useRef, useEffect } from "react"

interface Message {
  id: string; role: "user" | "assistant" | "system";
  content: string; time: string;
  type?: "text" | "code" | "table" | "error";
  file?: string;
}

const suggestions = [
  "Create a monthly budget tracker",
  "Generate a sales pivot table",
  "Explain VLOOKUP formula",
  "Build a KPI dashboard",
  "Compare two datasets",
  "Create financial forecast model",
]

const initMessages: Message[] = [
  {
    id: "1", role: "assistant",
    content: "Hello! I'm your GPT-EXCEL assistant. I can help you generate Excel files, write formulas, analyze data, or create documents.\n\nTry asking me to create a spreadsheet, or just describe what you need.",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "text",
  }
]

const AI_RESPONSES: Record<string, string> = {
  default: "I'll help you with that! I'm generating the Python code to create your Excel file now. Once ready, you'll see a preview in the main panel.",
  formula: "Here's the formula you need:\n\n```excel\n=VLOOKUP(A2, Sheet2!A:B, 2, FALSE)\n```\n\nThis looks up the value in A2 against column A in Sheet2, and returns the corresponding value from column B.",
  pivot: "I'll create a pivot table from your data. Go to the Excel Sheet module and use the prompt: **\"Create pivot table grouping by [column] and summing [values]\"** — I'll generate the full Python code.",
  budget: "Creating your budget tracker! This will include:\n- Monthly income/expense categories\n- Running totals with formulas\n- Conditional formatting for overspend\n- Summary chart\n\nOpening Excel module now...",
  chart: "I can create these chart types:\n- **Bar/Column** — comparisons\n- **Line** — trends over time\n- **Pie/Donut** — proportions\n- **Scatter** — correlations\n- **Area** — cumulative values\n\nWhich type and what data would you like to visualize?",
}

function getAIResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes("formula") || lower.includes("vlookup") || lower.includes("sumif")) return AI_RESPONSES.formula
  if (lower.includes("pivot")) return AI_RESPONSES.pivot
  if (lower.includes("budget")) return AI_RESPONSES.budget
  if (lower.includes("chart") || lower.includes("graph") || lower.includes("visual")) return AI_RESPONSES.chart
  return AI_RESPONSES.default
}

// ─── Message bubble ───────────────────────────────────────────────────────────
const MsgBubble = ({ msg, isUser }: { msg: Message; isUser: boolean }) => {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(msg.content).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // Parse markdown-ish content
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).replace(/^[a-z]+\n/, "")
        return (
          <div key={i} style={{
            margin: "6px 0", background: "var(--code-bg)",
            border: "1px solid var(--border)", borderRadius: 6,
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.05em" }}>CODE</span>
              <button onClick={copy} style={{ fontSize: "0.65rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <pre style={{ padding: "8px 10px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", overflowX: "auto", margin: 0, color: "var(--code-text)" }}>{code}</pre>
          </div>
        )
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ fontWeight: 600, color: "var(--text)" }}>{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div style={{
      display: "flex", gap: 8, flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end",
    }}>
      {!isUser && (
        <div style={{
          width: 24, height: 24, flexShrink: 0,
          background: "var(--text)", color: "var(--bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem", fontWeight: 800, borderRadius: 6,
        }}>G</div>
      )}
      <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: 3, alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{
          padding: "8px 11px",
          background: isUser ? "var(--accent)" : "var(--surface-2)",
          color: isUser ? "var(--accent-text)" : "var(--text)",
          borderRadius: isUser ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
          border: isUser ? "none" : "1px solid var(--border)",
          fontSize: "0.8rem", lineHeight: 1.55,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {renderContent(msg.content)}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", padding: "0 2px" }}>
          {msg.time}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>(initMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [width] = useState(280)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [listening, setListening] = useState(false)
  const [tab, setTab] = useState<"chat" | "history" | "settings">("chat")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages(p => [...p, userMsg])
    setInput(""); setLoading(true); setShowSuggestions(false)

    // Simulate streaming response
    await new Promise(r => setTimeout(r, 900 + Math.random() * 800))

    const response = getAIResponse(content)
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(), role: "assistant", content: response,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages(p => [...p, aiMsg])
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const toggleVoice = () => {
    setListening(p => !p)
    if (!listening && "webkitSpeechRecognition" in window) {
      const rec = new (window as any).webkitSpeechRecognition()
      rec.continuous = false; rec.interimResults = false; rec.lang = "en-US"
      rec.onresult = (e: any) => {
        const t = e.results[0][0].transcript
        setInput(t); setListening(false)
      }
      rec.onerror = () => setListening(false)
      rec.start()
    }
  }

  const clearChat = () => {
    setMessages(initMessages)
    setShowSuggestions(true)
  }

  if (collapsed) return (
    <div style={{
      width: 40, background: "var(--bg)",
      borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      alignItems: "center", paddingTop: 10, gap: 8,
      flexShrink: 0, cursor: "pointer",
    }} onClick={() => setCollapsed(false)}>
      <div style={{ fontSize: 14, color: "var(--text-muted)", writing: "vertical-lr" as any, textOrientation: "mixed" }}>AI</div>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", animation: "pulse-soft 2s infinite" }}/>
    </div>
  )

  return (
    <aside style={{
      width, flexShrink: 0,
      background: "var(--bg)", borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-body)",
    }}>
      <style>{`
        @keyframes typing-dot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .typing-dot { animation: typing-dot 1.2s ease infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Header */}
      <div style={{
        height: 44, display: "flex", alignItems: "center",
        padding: "0 10px", borderBottom: "1px solid var(--border)",
        gap: 8, flexShrink: 0,
      }}>
        <div style={{
          width: 22, height: 22, background: "var(--text)", color: "var(--bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem", fontWeight: 800, borderRadius: 5,
        }}>G</div>
        <div>
          <div style={{ fontSize: "0.775rem", fontWeight: 600, lineHeight: 1.2 }}>GPT Assistant</div>
          <div style={{ fontSize: "0.65rem", color: "var(--success)", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block" }}/>
            Online · GPT-4o
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <button className="btn btn-icon-sm btn-ghost" data-tooltip="Clear chat" onClick={clearChat}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
          <button className="btn btn-icon-sm btn-ghost" data-tooltip="Collapse" onClick={() => setCollapsed(true)}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "4px 8px 0" }}>
        {(["chat", "history", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "5px 0", fontSize: "0.7rem", fontWeight: 500,
            background: "none", border: "none", cursor: "pointer",
            color: tab === t ? "var(--text)" : "var(--text-muted)",
            borderBottom: tab === t ? "1.5px solid var(--text)" : "1.5px solid transparent",
            textTransform: "capitalize", transition: "all 0.15s",
          }}>{t}</button>
        ))}
      </div>

      {tab === "settings" && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Model", options: ["GPT-4o", "GPT-4", "GPT-3.5"] },
            { label: "Temperature", options: ["Creative (0.9)", "Balanced (0.7)", "Precise (0.3)"] },
            { label: "Context", options: ["Full history", "Last 10 msgs", "Current only"] },
          ].map(s => (
            <div key={s.label} className="input-wrap">
              <label className="input-label">{s.label}</label>
              <select className="input" style={{ fontSize: "0.75rem" }}>
                {s.options.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="switch-wrap">
            <div className="switch on"/>
            <span style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>Stream responses</span>
          </div>
          <div className="switch-wrap">
            <div className="switch on"/>
            <span style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>Context-aware suggestions</span>
          </div>
          <div className="switch-wrap">
            <div className="switch"/>
            <span style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>Text-to-speech responses</span>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {[
            { title: "Q4 Budget Analysis", date: "Today, 2:30 PM", msgs: 8 },
            { title: "Sales Pivot Table", date: "Today, 11:20 AM", msgs: 5 },
            { title: "Employee Tracker", date: "Yesterday", msgs: 12 },
            { title: "Revenue Forecast 2025", date: "2 days ago", msgs: 6 },
          ].map((h, i) => (
            <div key={i} style={{
              padding: "10px 12px", borderBottom: "1px solid var(--border)",
              cursor: "pointer", transition: "background 0.1s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              onClick={() => setTab("chat")}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{h.title}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                <span>{h.date}</span>
                <span>{h.msgs} messages</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "chat" && (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map(msg => (
              <MsgBubble key={msg.id} msg={msg} isUser={msg.role === "user"}/>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 24, height: 24, background: "var(--text)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, borderRadius: 6 }}>G</div>
                <div style={{
                  padding: "10px 13px", background: "var(--surface-2)",
                  border: "1px solid var(--border)", borderRadius: "10px 10px 10px 2px",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="typing-dot" style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--text-muted)",
                      animationDelay: `${i * 0.2}s`,
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                  Suggestions
                </div>
                {suggestions.slice(0, 4).map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    padding: "6px 10px", background: "var(--surface)",
                    border: "1px solid var(--border)", borderRadius: 7,
                    fontSize: "0.75rem", color: "var(--text-secondary)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.1s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input area */}
          <div style={{
            borderTop: "1px solid var(--border)", padding: "8px 10px",
            display: "flex", flexDirection: "column", gap: 6, flexShrink: 0,
          }}>
            {/* Attachment row */}
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn btn-icon-sm btn-ghost" data-tooltip="Attach file" style={{ fontSize: 12 }}>+</button>
              <button className="btn btn-icon-sm btn-ghost" data-tooltip="Insert formula" style={{ fontSize: 10 }}>ƒ</button>
              <button className="btn btn-icon-sm btn-ghost" data-tooltip="Add context" style={{ fontSize: 11 }}>⊞</button>
              <span style={{ flex: 1 }}/>
              <button
                className="btn btn-icon-sm btn-ghost"
                data-tooltip={listening ? "Stop recording" : "Voice input"}
                onClick={toggleVoice}
                style={{ color: listening ? "var(--error)" : undefined }}
              >
                {listening ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x={6} y={6} width={12} height={12}/>
                  </svg>
                ) : (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1={12} y1={19} x2={12} y2={23}/><line x1={8} y1={23} x2={16} y2={23}/>
                  </svg>
                )}
              </button>
            </div>

            {/* Text input */}
            <div style={{
              display: "flex", gap: 6, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8,
              padding: "6px 8px", transition: "border-color 0.15s",
            }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                disabled={loading}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  resize: "none", outline: "none",
                  fontSize: "0.8rem", color: "var(--text)",
                  fontFamily: "var(--font-body)", lineHeight: 1.5,
                  minHeight: 20, maxHeight: 100,
                  caretColor: "var(--accent)",
                }}
                rows={1}
              />
              <button className="btn btn-primary btn-icon-sm"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1={22} y1={2} x2={11} y2={13}/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
              <kbd>↵</kbd> send · <kbd>⇧↵</kbd> newline · <kbd>⌘K</kbd> commands
            </div>
          </div>
        </>
      )}
    </aside>
  )
}