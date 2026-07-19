import { useState, useEffect } from 'react'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import SEOHelmet from '../components/shared/SEOHelmet'

export default function Scans() {
  const { user } = useAuth()
  const [scans, setScans]       = useState([])
  const [targets, setTargets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [launching, setLaunching] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState('')
  const [error, setError]       = useState('')

  async function fetchScanData() {
    if (!user) return
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      const [targetsRes, scansRes] = await Promise.all([
        fetch('/api/targets', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/scans', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (targetsRes.ok && scansRes.ok) {
        const targetsData = await targetsRes.json()
        const scansData = await scansRes.json()
        
        const tList = targetsData.targets || []
        setTargets(tList)
        setScans(scansData.scans || [])
        
        if (tList.length > 0 && !selectedTarget) {
          setSelectedTarget(tList[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching scans:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load targets and scans
  useEffect(() => {
    fetchScanData()
  }, [user])

  async function handleLaunchScan(e) {
    e.preventDefault()
    setError('')
    if (!selectedTarget) {
      setError('Please add a target from the Dashboard first.')
      return
    }

    setLaunching(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('No auth token found')

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_id: selectedTarget,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to launch scan')
      }
      
      // Refresh list
      fetchScanData()
    } catch (err) {
      setError(err.message || 'Failed to launch scan. Please try again.')
    } finally {
      setLaunching(false)
    }
  }

  function statusBadge(status) {
    if (status === 'running') {
      return (
        <span className="badge badge-high" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span className="pulse" style={{ color: '#10b981', marginRight: 4 }}>●</span> Running
        </span>
      )
    }
    const map = {
      queued:    { cls: 'badge-info',     label: '◷ Queued' },
      completed: { cls: 'badge-live',     label: '✓ Completed' },
      failed:    { cls: 'badge-critical', label: '✕ Failed' },
    }
    const s = map[status] || { cls: 'badge-dead', label: status || 'Unknown' }
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  const runningCount   = scans.filter(s => s.status === 'running').length
  const completedCount = scans.filter(s => s.status === 'completed').length

  return (
    <>
      <SEOHelmet title="Scans" description="Schedule and manage attack surface scans." />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Scans</h1>
          <p className="page-subtitle">Launch and track attack surface scans</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchScanData} disabled={loading} style={{ fontSize: 13 }}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stat row */}
      <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)', maxWidth: 600 }}>
        <div className="stat-card">
          <div className="stat-label">Total Scans</div>
          <div className="stat-value">{scans.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Running</div>
          <div className="stat-value">{runningCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{completedCount}</div>
        </div>
      </div>

      {/* Launch scan form */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Launch New Scan
        </h2>

        {error && (
          <div style={{
            background: '#1a1a1a', border: '1px solid #333333',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: 14, color: 'var(--color-critical)',
          }}>{error}</div>
        )}

        {targets.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            No targets available. Add a domain from the Dashboard first.
          </p>
        ) : (
          <form onSubmit={handleLaunchScan} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: 'var(--color-text-muted)', marginBottom: 6,
              }}>Target Domain</label>
              <select
                className="input"
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {targets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.root_domain} {t.label && t.label !== t.root_domain ? `(${t.label})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={launching}
              style={{ height: 38 }}
            >
              {launching
                ? <><div className="spinner" /> Launching…</>
                : '⚡ Launch Scan'
              }
            </button>
          </form>
        )}
      </div>

      {/* Scan history */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-4)' }}>
        Scan History
      </h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : scans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <div className="empty-state-title">No scans yet</div>
          <p className="text-sm">Launch your first scan above to discover your attack surface.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Assets</th>
                <th>Findings</th>
                <th className="hide-mobile">Started</th>
                <th className="hide-mobile">Completed</th>
              </tr>
            </thead>
            <tbody>
              {scans.map(scan => (
                <tr key={scan.id}>
                  <td>
                    <span className="font-mono" style={{ fontSize: 13 }}>
                      {scan.root_domain}
                    </span>
                  </td>
                  <td>{statusBadge(scan.status)}</td>
                  <td style={{ fontWeight: 600 }}>{scan.assets_found ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>{scan.findings_found ?? '—'}</td>
                  <td className="hide-mobile" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {scan.started_at ? new Date(scan.started_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                  </td>
                  <td className="hide-mobile" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {scan.completed_at ? new Date(scan.completed_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}