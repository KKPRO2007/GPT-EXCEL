import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

const phases = [
  "Initializing AI modules...",
  "Loading neural networks...",
  "Connecting Excel engine...",
  "Preparing workspace...",
  "Almost ready...",
]

const checks = [
  "AI Engine", "Excel Parser", "Neural Net",
  "File System", "Voice Module", "Workspace",
]

export default function Loading() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState(0)
  const [ready, setReady] = useState<boolean[]>(Array(checks.length).fill(false))
  const [done, setDone] = useState(false)
  const [cells, setCells] = useState<number[]>(Array(120).fill(0))

  useEffect(() => {
    // Background grid animation
    const cellInterval = setInterval(() => {
      setCells(prev => {
        const next = [...prev]
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * 120)
          next[idx] = Math.random() > 0.5 ? 1 : 0
        }
        return next
      })
    }, 80)

    // Progress
    let p = 0
    const progInterval = setInterval(() => {
      p += Math.random() * 2.8 + 0.4
      if (p >= 100) {
        p = 100
        clearInterval(progInterval)
        setTimeout(() => setDone(true), 300)
        setTimeout(() => navigate("/get-started"), 700)
      }
      setProgress(Math.min(p, 100))
      setPhase(Math.min(Math.floor((p / 100) * phases.length), phases.length - 1))
      setReady(prev => {
        const next = [...prev]
        const threshold = (100 / checks.length)
        for (let i = 0; i < checks.length; i++) {
          if (p > threshold * (i + 1)) next[i] = true
        }
        return next
      })
    }, 55)

    return () => { clearInterval(cellInterval); clearInterval(progInterval) }
  }, [])

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      transition: done ? "opacity 0.4s ease, transform 0.4s ease" : undefined,
      opacity: done ? 0 : 1,
      transform: done ? "scale(1.02)" : "scale(1)",
    }}>
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes glitch-1 {
          0%, 85%, 100% { clip-path: none; transform: none; }
          87% { clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); transform: translate(-3px, 0); }
          89% { clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%); transform: translate(3px, 0); }
          91% { clip-path: none; transform: none; }
        }
        @keyframes num-flip {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes check-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .loading-glitch { animation: glitch-1 6s infinite; }
        .num-animate { animation: num-flip 0.06s ease; }
      `}</style>

      {/* Grid BG */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "repeat(10, 1fr)",
      }}>
        {cells.map((v, i) => (
          <div key={i} style={{
            border: "1px solid",
            borderColor: v ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
            background: v ? "rgba(255,255,255,0.025)" : "transparent",
            transition: "all 0.4s ease",
          }}/>
        ))}
      </div>

      {/* Scanline */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 3, pointerEvents: "none", zIndex: 50,
        background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.025), transparent)",
        animation: "scan 3.5s linear infinite",
      }}/>

      {/* Corner brackets */}
      {[
        { top: 20, left: 20 },
        { top: 20, right: 20 },
        { bottom: 20, left: 20 },
        { bottom: 20, right: 20 },
      ].map((pos, i) => {
        const isRight = "right" in pos
        const isBottom = "bottom" in pos
        return (
          <div key={i} style={{
            position: "absolute", width: 20, height: 20,
            borderTop: isBottom ? "none" : "1px solid rgba(255,255,255,0.15)",
            borderBottom: isBottom ? "1px solid rgba(255,255,255,0.15)" : "none",
            borderLeft: isRight ? "none" : "1px solid rgba(255,255,255,0.15)",
            borderRight: isRight ? "1px solid rgba(255,255,255,0.15)" : "none",
            ...pos,
          }}/>
        )
      })}

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, zIndex: 10 }}>

        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div className="loading-glitch" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 48, fontWeight: 800, letterSpacing: -2,
              color: "var(--text)",
            }}>GPT</span>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 48, fontWeight: 800, letterSpacing: -2,
              color: "var(--bg)",
              background: "var(--text)", padding: "2px 12px",
            }}>EXCEL</span>
          </div>
          <div style={{
            marginTop: 6, fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 6, color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase",
          }}>
            AI Spreadsheet Intelligence
          </div>
        </div>

        {/* Progress bar area */}
        <div style={{ width: 320 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: 1, color: "rgba(255,255,255,0.3)",
            }}>
              {phases[phase]}
            </span>
            <span style={{
              fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, color: "var(--text)", letterSpacing: 1,
            }}>
              {String(Math.floor(progress)).padStart(3, "0")}%
            </span>
          </div>

          {/* Track */}
          <div style={{
            height: 1, background: "rgba(255,255,255,0.08)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0,
              height: "100%", width: `${progress}%`,
              background: "var(--text)",
              transition: "width 0.05s linear",
              boxShadow: "0 0 10px rgba(255,255,255,0.5)",
            }}/>
          </div>

          {/* Segment markers */}
          <div style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "center" }}>
            {Array(20).fill(0).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 2,
                background: (i / 20) * 100 <= progress ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.1)",
                transition: "background 0.15s ease",
                transitionDelay: `${i * 0.02}s`,
              }}/>
            ))}
          </div>
        </div>

        {/* System checks */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "6px 40px",
        }}>
          {checks.map((label, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: 1.5, textTransform: "uppercase",
              color: ready[i] ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
              transition: "color 0.4s ease",
              animation: ready[i] ? "check-in 0.3s ease" : undefined,
            }}>
              <div style={{
                width: 5, height: 5, flexShrink: 0,
                background: ready[i] ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)",
                boxShadow: ready[i] ? "0 0 6px rgba(255,255,255,0.6)" : "none",
                transition: "all 0.4s ease",
              }}/>
              {label}
              {ready[i] && (
                <span style={{ marginLeft: "auto", opacity: 0.35, fontSize: 8 }}>✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 22, left: 0, right: 0,
        display: "flex", justifyContent: "space-between",
        padding: "0 28px",
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 2, color: "rgba(255,255,255,0.15)",
      }}>
        <span>v2.0.0</span>
        <span>ELECTRON · REACT · TS</span>
        <span>© 2025</span>
      </div>
    </div>
  )
}