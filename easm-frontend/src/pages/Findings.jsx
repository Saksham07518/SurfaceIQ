import { useState, useEffect } from 'react'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import SEOHelmet from '../components/shared/SEOHelmet'

export default function Findings() {
  const { user }              = useAuth()
  const [findings, setFindings] = useState([])
  const [targets, setTargets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all') // all | critical | high | medium | low
  const [selectedTarget, setSelectedTarget] = useState('all')

  async function fetchFindings() {
    if (!user) return
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      const [findingsRes, targetsRes] = await Promise.all([
        fetch('/api/findings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/targets', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (findingsRes.ok && targetsRes.ok) {
        const findingsData = await findingsRes.json()
        const targetsData = await targetsRes.json()
        setFindings(findingsData.findings || [])
        setTargets(targetsData.targets || [])
      }
    } catch (err) {
      console.error('Error fetching findings data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFindings()
  }, [user])

  const severities = ['all', 'critical', 'high', 'medium', 'low']

  // Filter findings by severity and site (root domain)
  const filtered = findings.filter(f => {
    const matchesSeverity = filter === 'all' || f.severity === filter
    const matchesSite = selectedTarget === 'all' || 
      (f.asset && (f.asset === selectedTarget || f.asset.endsWith('.' + selectedTarget)))
    return matchesSeverity && matchesSite
  })

  // Count findings by severity for the selected site
  const counts = findings.reduce((acc, f) => {
    const matchesSite = selectedTarget === 'all' || 
      (f.asset && (f.asset === selectedTarget || f.asset.endsWith('.' + selectedTarget)))
    if (matchesSite) {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1
    }
    return acc
  }, {})

  function downloadCSVReport() {
    if (filtered.length === 0) return

    // CSV headers
    const headers = ['Type', 'Severity', 'Description', 'Asset', 'Detected At']
    
    // CSV rows
    const rows = filtered.map(f => [
      f.type,
      f.severity.toUpperCase(),
      f.description,
      f.asset || f.asset_id,
      f.detected_at ? new Date(f.detected_at).toLocaleString() : '—'
    ])

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    const siteName = selectedTarget === 'all' ? 'all_sites' : selectedTarget.replace(/\./g, '_')
    const severityName = filter === 'all' ? 'all_severities' : filter
    
    link.setAttribute('href', url)
    link.setAttribute('download', `surfaceiq_findings_${siteName}_${severityName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <SEOHelmet title="Findings" />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Findings</h1>
          <p className="page-subtitle">
            {selectedTarget === 'all' 
              ? `${findings.length} total findings` 
              : `${filtered.length} findings for ${selectedTarget}`}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchFindings} disabled={loading} style={{ fontSize: 13 }}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Severity summary cards for selected site */}
      <div className="grid grid-4 gap-4" style={{ marginBottom: 24 }}>
        {['critical', 'high', 'medium', 'low'].map(s => (
          <div key={s} className="stat-card">
            <div className="stat-label">{s}</div>
            <div className="stat-value" style={{ color: `var(--color-${s})` }}>
              {counts[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: Site dropdown + Severity filters + Download Report */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Site Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>Site:</label>
            <select
              className="input"
              value={selectedTarget}
              onChange={e => setSelectedTarget(e.target.value)}
              style={{ width: 220, height: 38, cursor: 'pointer' }}
            >
              <option value="all">All Monitored Sites</option>
              {targets.map(t => (
                <option key={t.id} value={t.root_domain}>
                  {t.root_domain}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {severities.map(s => (
              <button
                key={s}
                className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(s)}
                style={{ textTransform: 'capitalize', padding: '6px 12px', fontSize: 13 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Download Button */}
        <button
          className="btn btn-primary"
          onClick={downloadCSVReport}
          disabled={filtered.length === 0}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          📥 Download CSV Report ({filtered.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚨</div>
          <div className="empty-state-title">No findings yet</div>
          <p style={{ fontSize: 14 }}>
            {selectedTarget === 'all' 
              ? 'Run a scan to detect vulnerabilities and misconfigurations.' 
              : `No findings found matching the criteria for ${selectedTarget}.`}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Asset</th>
                  <th>Detected</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{f.type}</td>
                    <td>
                      <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 300 }}>{f.description}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {f.asset_id}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {f.detected_at ? new Date(f.detected_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}