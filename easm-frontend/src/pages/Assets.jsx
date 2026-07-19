import { useState, useEffect } from 'react'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import SEOHelmet from '../components/shared/SEOHelmet'

export default function Assets() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('assets') // assets | targets
  const [assets, setAssets]       = useState([])
  const [targets, setTargets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all') // all | live | dead
  const [deleting, setDeleting]   = useState(null)

  async function fetchData() {
    if (!user) return
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      // Fetch both targets and assets in parallel
      const [targetsRes, assetsRes] = await Promise.all([
        fetch('/api/targets', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/assets', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (targetsRes.ok && assetsRes.ok) {
        const targetsData = await targetsRes.json()
        const assetsData = await assetsRes.json()
        setTargets(targetsData.targets || [])
        setAssets(assetsData.assets || [])
      }
    } catch (err) {
      console.error('Error fetching EASM data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  async function handleDeleteTarget(id) {
    if (!confirm('Remove this target domain and stop monitoring?')) return
    setDeleting(id)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('No auth token found')

      const res = await fetch(`/api/targets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to delete target')
      }
      // Refresh list
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete target.')
    } finally {
      setDeleting(null)
    }
  }

  // Filter & Search Logic
  const filteredTargets = targets.filter(t => {
    const matchesSearch =
      t.root_domain?.toLowerCase().includes(search.toLowerCase()) ||
      t.label?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'live' && t.status === 'live') ||
      (filter === 'dead' && t.status !== 'live')
    return matchesSearch && matchesFilter
  })

  const filteredAssets = assets.filter(a => {
    const matchesSearch =
      a.hostname?.toLowerCase().includes(search.toLowerCase()) ||
      a.ip?.toLowerCase().includes(search.toLowerCase()) ||
      a.root_domain?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'live' && a.status === 'live') ||
      (filter === 'dead' && a.status !== 'live')
    return matchesSearch && matchesFilter
  })

  const liveAssetsCount = assets.filter(a => a.status === 'live').length
  const deadAssetsCount = assets.length - liveAssetsCount

  return (
    <>
      <SEOHelmet title="Assets" description="Discovered subdomains, live hosts, and IPs." />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-subtitle">
            {assets.length} hosts discovered across {targets.length} target domains
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading} style={{ fontSize: 13 }}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
        <button
          onClick={() => { setActiveTab('assets'); setSearch(''); setFilter('all'); }}
          style={{
            padding: '10px 4px',
            fontSize: 15,
            fontWeight: 600,
            color: activeTab === 'assets' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'assets' ? '2px solid var(--color-accent)' : '2px solid transparent',
          }}
        >
          Discovered Subdomains ({assets.length})
        </button>
        <button
          onClick={() => { setActiveTab('targets'); setSearch(''); setFilter('all'); }}
          style={{
            padding: '10px 4px',
            fontSize: 15,
            fontWeight: 600,
            color: activeTab === 'targets' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'targets' ? '2px solid var(--color-accent)' : '2px solid transparent',
          }}
        >
          Monitored Roots ({targets.length})
        </button>
      </div>

      {/* Stats (only show for assets) */}
      {activeTab === 'assets' && (
        <div className="grid grid-3" style={{ marginBottom: 24, maxWidth: 600 }}>
          <div className="stat-card">
            <div className="stat-label">Total Subdomains</div>
            <div className="stat-value">{assets.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Live Hosts</div>
            <div className="stat-value">{liveAssetsCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{deadAssetsCount}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          className="input"
          type="text"
          placeholder={activeTab === 'assets' ? "Search subdomains, IPs, roots…" : "Search domains…"}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'live', 'dead'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize', fontSize: 13, padding: '6px 14px' }}
            >
              {f === 'dead' ? 'Inactive' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : activeTab === 'assets' ? (
        // Assets View
        filteredAssets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div className="empty-state-title">No assets found</div>
            <p className="text-sm">Run a scan on your targets to discover subdomains.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Web Server</th>
                  <th>TLS Issuer</th>
                  <th className="hide-mobile">TLS Days</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(asset => (
                  <tr key={asset.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>
                        {asset.hostname}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {asset.ip || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${asset.status === 'live' ? 'badge-live' : 'badge-dead'}`}>
                        {asset.status === 'live' ? '● Live' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {asset.server ? (
                        <span className="font-mono text-xs">{asset.server}</span>
                      ) : asset.status === 'live' ? (
                        <span style={{ color: 'var(--color-text-muted)' }}>Yes (no header)</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {asset.tls_issuer || '—'}
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 13 }}>
                      {asset.tls_days_remaining !== undefined ? (
                        <span style={{
                          color: asset.tls_days_remaining < 15 ? 'var(--color-critical)' : 'inherit',
                          fontWeight: asset.tls_days_remaining < 30 ? 600 : 400
                        }}>
                          {asset.tls_days_remaining}d
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // Targets View
        filteredTargets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No targets monitored</div>
            <p className="text-sm">Add target domains on the Dashboard.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th className="hide-mobile">Added</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map(t => (
                  <tr key={t.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: 13 }}>
                        {t.root_domain}
                      </span>
                    </td>
                    <td>{t.label || '—'}</td>
                    <td>
                      <span className={`badge ${t.status === 'live' ? 'badge-live' : 'badge-dead'}`}>
                        {t.status === 'live' ? '● Scanned' : '○ Pending'}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => handleDeleteTarget(t.id)}
                        disabled={deleting === t.id}
                      >
                        {deleting === t.id ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}