import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Header from "../components/Header"

export default function Settings() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved === "dark"
  })

  const handleThemeChange = () => {
    const newTheme = !darkMode
    setDarkMode(newTheme)
    document.documentElement.classList.toggle("dark", newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", background: "var(--bg)",
      fontFamily: "var(--font-body)",
    }}>
      <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
      
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar isOpen={sidebarOpen} />
        
        <main style={{
          flex: 1, overflowY: "auto",
          padding: "32px 40px",
          background: "var(--bg-2)",
        }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: -0.5,
            marginBottom: 32,
          }}>Settings</h1>
          
          <div style={{
            maxWidth: 600,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}>
            {/* Appearance Section */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}>
              <h2 style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: 16,
                color: "var(--text)",
              }}>Appearance</h2>
              
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
              }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>Dark Mode</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Switch between light and dark theme
                  </div>
                </div>
                <button
                  onClick={handleThemeChange}
                  className={`switch ${darkMode ? "on" : ""}`}
                  style={{ width: 44, height: 24, cursor: "pointer" }}
                />
              </div>
            </div>
            
            {/* AI Settings Section */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}>
              <h2 style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: 16,
                color: "var(--text)",
              }}>AI Configuration</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="input-wrap">
                  <label className="input-label">OpenAI API Key</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="sk-..."
                    value=""
                    onChange={() => {}}
                  />
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Your API key is stored locally and never shared
                  </div>
                </div>
                
                <div className="input-wrap">
                  <label className="input-label">Model Selection</label>
                  <select className="input" defaultValue="gpt-4">
                    <option value="gpt-4">GPT-4 Turbo</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-3.5">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Export Section */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}>
              <h2 style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: 16,
                color: "var(--text)",
              }}>Export Preferences</h2>
              
              <div className="input-wrap">
                <label className="input-label">Default Export Format</label>
                <select className="input" defaultValue="xlsx">
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
            
            {/* About Section */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}>
              <h2 style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text)",
              }}>About GPT-EXCEL</h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                Version 2.0.0
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Built with Electron, React, TypeScript, and Python<br/>
                © 2025 Mallavarapu Krishna Koushik Reddy et al.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}