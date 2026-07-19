import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/assets', label: 'Assets', icon: '📡' },
    { path: '/scans', label: 'Scans', icon: '⚡' },
    { path: '/findings', label: 'Findings', icon: '🚨' },
]

// ── Sidebar (tablet + laptop) ────────────────────────────
export function Sidebar() {
    const { pathname } = useLocation()
    const { user, logout } = useAuth()

    return (
        <aside
            className="sidebar"
            aria-label="Main navigation"
        >
            {/* Logo */}
            <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#000000',
                }}>S</div>
                <span style={{
                    fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap',
                }}>SurfaceIQ</span>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, padding: '12px 0', overflow: 'hidden' }}>
                {navLinks.map(({ path, label, icon }) => {
                    const active = pathname === path
                    return (
                        <Link
                            key={path}
                            to={path}
                            title={label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 16px',
                                fontSize: 14,
                                fontWeight: active ? 600 : 400,
                                color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                                borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                transition: 'color 150ms, background 150ms',
                            }}
                        >
                            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}
                                role="img" aria-hidden="true">{icon}</span>
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* User + logout */}
            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                }}>
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div style={{
                    flex: 1, minWidth: 0,
                }}>
                    <div style={{
                        fontSize: 12, fontWeight: 500,
                        color: 'var(--color-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{user?.email}</div>
                    <button
                        onClick={logout}
                        style={{
                            fontSize: 11, color: 'var(--color-text-muted)',
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        }}
                    >Sign out</button>
                </div>
            </div>
        </aside>
    )
}

// ── Mobile top navbar ────────────────────────────────────
export function MobileNavbar() {
    const [open, setOpen] = useState(false)
    const { pathname } = useLocation()
    const { logout } = useAuth()

    return (
        <>
            <header className="mobile-navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: 'var(--color-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#0f172a',
                    }}>S</div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>SurfaceIQ</span>
                </div>

                <button
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    onClick={() => setOpen(o => !o)}
                    style={{ fontSize: 22, color: 'var(--color-text)', padding: 4 }}
                >
                    {open ? '✕' : '☰'}
                </button>
            </header>

            {/* Slide-down mobile menu */}
            {open && (
                <div style={{
                    position: 'fixed',
                    top: 'var(--navbar-height)',
                    left: 0, right: 0, bottom: 0,
                    background: 'var(--color-surface)',
                    zIndex: 99,
                    padding: '16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                    role="dialog"
                    aria-label="Navigation menu"
                >
                    <nav>
                        {navLinks.map(({ path, label, icon }) => {
                            const active = pathname === path
                            return (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={() => setOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '14px 24px',
                                        fontSize: 16,
                                        fontWeight: active ? 600 : 400,
                                        color: active ? 'var(--color-accent)' : 'var(--color-text)',
                                        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                                        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
                                    }}
                                >
                                    <span style={{ fontSize: 20 }} role="img" aria-hidden="true">{icon}</span>
                                    {label}
                                </Link>
                            )
                        })}
                    </nav>
                    <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
                        <button
                            onClick={() => { logout(); setOpen(false) }}
                            style={{ color: 'var(--color-text-muted)', fontSize: 14 }}
                        >Sign out</button>
                    </div>
                </div>
            )}
        </>
    )
}