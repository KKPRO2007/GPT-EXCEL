import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

interface Props { toggleSidebar: () => void }

export default function Header({ toggleSidebar }: Props) {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    if (saved) return saved === "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })
  const [cmd, setCmd] = useState(false)
  const [cmdQuery, setCmdQuery] = useState("")
  const [notifs, setNotifs] = useState(3)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmd(true) }
      if (e.key === "Escape") { setCmd(false); setShowNotifs(false); setShowProfile(false) }
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [])

  const notifications = [
    { id: 1, icon: "⊞", text: "Excel file generated successfully", sub: "Q4 Financial Model.xlsx · 2m ago", type: "success", read: false },
    { id: 2, icon: "⌘", text: "Workflow \"Weekly Report\" completed", sub: "Automated · 1h ago", type: "info", read: false },
    { id: 3, icon: "◬", text: "API usage at 89% of free tier", sub: "Upgrade to Pro for unlimited · 3h ago", type: "warning", read: false },
  ]

  const cmdResults = [
    { group: "Pages", items: [
      { icon: "◱", label: "Dashboard", key: "/dashboard" },
      { icon: "⊞", label: "Excel Sheet", key: "/excel" },
      { icon: "⚙", label: "Settings", key: "/settings" },
    ]},
    { group: "Actions", items: [
      { icon: "+", label: "New Spreadsheet", key: "new-xl" },
      { icon: "+", label: "New Document", key: "new-doc" },
      { icon: "◎", label: "Voice Command", key: "voice" },
    ]},
  ]

  const handleWindowControl = (action: 'close' | 'minimize' | 'maximize') => {
    if (window.electronAPI && window.electronAPI[action]) {
      window.electronAPI[action]?.()
    }
  }

  return (
    <>
      <header style={{
        height: 44, display: "flex", alignItems: "center",
        padding: "0 14px", background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0, gap: 8, position: "relative", zIndex: 40,
        WebkitAppRegion: "drag" as any,
      }}>
        {/* Window controls area */}
        <div style={{ display: "flex", gap: 6, WebkitAppRegion: "no-drag" as any, flexShrink: 0 }}>
          {[
            { color: "#ef4444", hover: "#dc2626", action: () => handleWindowControl('close') },
            { color: "#f59e0b", hover: "#d97706", action: () => handleWindowControl('minimize') },
            { color: "#22c55e", hover: "#16a34a", action: () => handleWindowControl('maximize') },
          ].map((b, i) => (
            <button key={i} onClick={b.action} style={{
              width: 12, height: 12, borderRadius: "50%",
              background: b.color, border: "none", cursor: "pointer",
              transition: "filter 0.1s",
            }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.85)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "none")}
            />
          ))}
        </div>

        {/* Sidebar toggle */}
        <button className="btn btn-icon btn-ghost btn-sm" onClick={toggleSidebar}
          style={{ WebkitAppRegion: "no-drag" as any }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1={3} y1={6} x2={21} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={3} y1={18} x2={21} y2={18}/>
          </svg>
        </button>

        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          WebkitAppRegion: "no-drag" as any, cursor: "pointer",
        }} onClick={() => navigate("/dashboard")}>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: 13, letterSpacing: -0.5, color: "var(--text)",
          }}>GPT</span>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: 13, letterSpacing: -0.5,
            background: "var(--text)", color: "var(--bg)",
            padding: "1px 5px",
          }}>EXCEL</span>
        </div>

        {/* Command search */}
        <button
          onClick={() => setCmd(true)}
          style={{
            flex: 1, maxWidth: 320, WebkitAppRegion: "no-drag" as any,
            display: "flex", alignItems: "center", gap: 8,
            height: 28, padding: "0 10px", border: "1px solid var(--border)",
            borderRadius: 6, background: "var(--surface-2)", cursor: "text",
            fontSize: "0.75rem", color: "var(--text-muted)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span style={{ flex: 1, textAlign: "left" }}>Search or run a command...</span>
          <div style={{ display: "flex", gap: 2 }}>
            <kbd style={{ fontSize: "0.6rem" }}>⌘</kbd>
            <kbd style={{ fontSize: "0.6rem" }}>K</kbd>
          </div>
        </button>

        {/* Right controls */}
        <div style={{
          display: "flex", gap: 4, marginLeft: "auto",
          alignItems: "center", WebkitAppRegion: "no-drag" as any,
        }}>
          {/* Theme toggle */}
          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setDark(d => !d)}
            data-tooltip={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx={12} cy={12} r={5}/>
                <line x1={12} y1={1} x2={12} y2={3}/><line x1={12} y1={21} x2={12} y2={23}/>
                <line x1={4.22} y1={4.22} x2={5.64} y2={5.64}/><line x1={18.36} y1={18.36} x2={19.78} y2={19.78}/>
                <line x1={1} y1={12} x2={3} y2={12}/><line x1={21} y1={12} x2={23} y2={12}/>
                <line x1={4.22} y1={19.78} x2={5.64} y2={18.36}/><line x1={18.36} y1={5.64} x2={19.78} y2={4.22}/>
              </svg>
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setShowNotifs(p => !p); setShowProfile(false) }}
              style={{ position: "relative" }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifs > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--error)", border: "1.5px solid var(--bg)",
                }}/>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                width: 300, background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "var(--shadow-lg)", zIndex: 200,
                animation: "menuIn 0.15s ease",
                overflow: "hidden",
              }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Notifications</span>
                  <button className="btn btn-xs btn-ghost" onClick={() => setNotifs(0)}>Mark all read</button>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    display: "flex", gap: 10, padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    background: n.read ? "transparent" : "var(--accent-dim-2)",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? "transparent" : "var(--accent-dim-2)")}
                  >
                    <div style={{
                      width: 28, height: 28, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: n.type === "success" ? "var(--success-bg)" : n.type === "warning" ? "var(--warning-bg)" : "var(--info-bg)",
                      border: "1px solid var(--border)", fontSize: 13,
                    }}>
                      {n.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.775rem", fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}>{n.text}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{n.sub}</div>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginLeft: "auto", marginTop: 4 }}/>}
                  </div>
                ))}
                <div style={{ padding: "8px 14px" }}>
                  <button className="btn btn-ghost btn-xs w-full">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div style={{ position: "relative" }}>
            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setShowProfile(p => !p); setShowNotifs(false) }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--text)", display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--bg)",
                fontSize: "0.6rem", fontWeight: 800, letterSpacing: -0.5,
              }}>KK</div>
            </button>

            {showProfile && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                width: 220, background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "var(--shadow-lg)", zIndex: 200,
                animation: "menuIn 0.15s ease", padding: 4,
              }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>Krishna Koushik</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Free Plan · 23% remaining</div>
                </div>
                {[
                  { icon: "◱", label: "Profile Settings" },
                  { icon: "⊞", label: "API Keys" },
                  { icon: "◈", label: "Integrations" },
                  { icon: "⌘", label: "Keyboard Shortcuts" },
                ].map((item, idx) => (
                  <div key={idx} className="ctx-item" onClick={() => { setShowProfile(false); navigate("/settings") }}>
                    <span style={{ fontSize: 12 }}>{item.icon}</span>
                    <span style={{ fontSize: "0.8rem" }}>{item.label}</span>
                  </div>
                ))}
                <div className="ctx-separator"/>
                <div className="ctx-item" style={{ color: "var(--text)" }} onClick={() => navigate("/")}>
                  <span style={{ fontSize: 12 }}>↑</span>
                  <span style={{ fontSize: "0.8rem" }}>Upgrade to Pro</span>
                </div>
                <div className="ctx-item destructive" onClick={() => navigate("/get-started")}>
                  <span style={{ fontSize: 12 }}>→</span>
                  <span style={{ fontSize: "0.8rem" }}>Sign out</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette */}
      {cmd && (
        <div className="modal-backdrop" onClick={() => setCmd(false)}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, width: 520, maxWidth: "90vw",
            boxShadow: "var(--shadow-xl)", animation: "scaleIn 0.15s ease",
            overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div className="search-bar" style={{ margin: 0, borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)", padding: "12px 16px" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                autoFocus
                placeholder="Search pages, commands, files..."
                value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                style={{ fontSize: "0.9rem" }}
              />
              <kbd style={{ fontSize: "0.65rem" }}>ESC</kbd>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
              {cmdResults.map(group => (
                <div key={group.group}>
                  <div style={{ padding: "6px 16px 3px", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {group.group}
                  </div>
                  {group.items.filter(i => !cmdQuery || i.label.toLowerCase().includes(cmdQuery.toLowerCase())).map(item => (
                    <div key={item.key} className="ctx-item" style={{ padding: "8px 16px", margin: "1px 4px", borderRadius: 6 }}
                      onClick={() => { setCmd(false); if (item.key.startsWith("/")) navigate(item.key) }}
                    >
                      <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12 }}>{item.icon}</span>
                      <span style={{ fontSize: "0.8125rem" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              <span><kbd>↵</kbd> Select</span>
              <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
              <span><kbd>ESC</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}