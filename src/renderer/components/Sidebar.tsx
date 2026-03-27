import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

interface Props { isOpen: boolean }

const navItems = [
  { id: 'dashboard', path: '/dashboard', icon: '◱', label: 'Dashboard' },
  { id: 'excel', path: '/excel', icon: '⊞', label: 'Excel Sheet', count: '2' },
  { id: 'documents', path: '/excel', icon: '◱', label: 'Documents' },
  { id: 'files', path: '/excel', icon: '◈', label: 'File Manager' },
  { id: 'workflow', path: '/excel', icon: '⌘', label: 'Workflow' },
  { id: 'dev', path: '/excel', icon: '◎', label: 'Developer', badge: 'BETA' },
  { id: 'settings', path: '/settings', icon: '⚙', label: 'Settings' },
]

export default function Sidebar({ isOpen }: Props) {
  const navigate = useNavigate()

  if (!isOpen) return (
    <aside style={{
      width: 44, background: 'var(--bg)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 8, gap: 4, flexShrink: 0,
    }}>
      {navItems.map(item => (
        <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div data-tooltip={item.label} style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, fontSize: 15, cursor: 'pointer',
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {item.icon}
            </div>
          )}
        </NavLink>
      ))}
    </aside>
  )

  return (
    <aside style={{
      width: 200, background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', marginBottom: 4,
          border: '1px solid var(--border)', borderRadius: 7,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{
            width: 22, height: 22, background: 'var(--text)', color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 800, borderRadius: 4, flexShrink: 0,
          }}>G</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Workspace
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Free Plan</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>⌄</span>
        </div>

        <div style={{ marginTop: 4 }}>
          <div style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', padding: '6px 8px 3px',
          }}>
            Navigation
          </div>
          {navItems.map(item => (
            <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none', display: 'block' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                  transition: 'all 0.12s', marginBottom: 1, fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 13, flexShrink: 0, width: 16, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  {item.count && (
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 5px', borderRadius: 99,
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-dim)',
                      color: isActive ? 'inherit' : 'var(--text-secondary)',
                    }}>{item.count}</span>
                  )}
                  {item.badge && (
                    <span style={{
                      fontSize: '0.55rem', padding: '1px 4px',
                      background: 'var(--info-bg)', color: 'var(--info)',
                      borderRadius: 3, fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                    }}>{item.badge}</span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', padding: '6px 8px 3px',
          }}>
            Recent
          </div>
          {[
            { name: 'Q4 Financial Model.xlsx', type: '⊞' },
            { name: 'Sales Dashboard.xlsx', type: '⊞' },
            { name: 'Project Proposal.docx', type: '◱' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
              transition: 'background 0.1s',
              marginBottom: 1,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => navigate('/excel')}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{f.type}</span>
              <span style={{
                fontSize: '0.75rem', color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.7rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Storage</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>3.4 / 5 GB</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '68%' }} />
          </div>
        </div>
        <button className="btn btn-outline btn-sm w-full" style={{ fontSize: '0.75rem' }}
          onClick={() => navigate('/settings')}
        >
          ↑ Upgrade to Pro
        </button>
      </div>
    </aside>
  )
}