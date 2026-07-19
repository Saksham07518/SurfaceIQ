import { useState } from 'react'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import SEOHelmet from '../components/shared/SEOHelmet'

export default function Dashboard() {
  const { user } = useAuth()
  const [domain, setDomain]   = useState('')
  const [label, setLabel]     = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  async function handleAddTarget(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isValidDomain(domain)) {
      setError('Please enter a valid domain e.g. example.com')
      return
    }

    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('No auth token found')

      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          root_domain: domain.trim().toLowerCase(),
          label: label.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to add target')
      }

      setSuccess(`✓ Target "${domain}" added successfully!`)
      setDomain('')
      setLabel('')
    } catch (err) {
      setError(err.message || 'Failed to add target. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SEOHelmet title="Dashboard" />

      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Add a target domain to start monitoring</p>
      </div>

      {/* Add target form */}
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
          Add Target Domain
        </h2>

        <form onSubmit={handleAddTarget}>

          {error && (
            <div style={{
              background: '#1a1a1a', border: '1px solid #333333',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 14, color: 'var(--color-critical)',
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: '#1a1a1a', border: '1px solid #333333',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 14, color: 'var(--color-low)',
            }}>{success}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 500,
              color: 'var(--color-text-muted)', marginBottom: 6,
            }}>Root Domain *</label>
            <input
              className="input"
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              required
            />
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Only scan domains you own or have permission to test.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 500,
              color: 'var(--color-text-muted)', marginBottom: 6,
            }}>Label <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="My website"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" /> Adding...</>
              : '+ Add Target'
            }
          </button>
        </form>
      </div>

      {/* What happens next */}
      <div className="card mt-6" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          How it works
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '1', title: 'Add a domain',      desc: 'Enter a root domain you own above.' },
            { step: '2', title: 'Run a scan',         desc: 'Go to Scans and trigger a scan — we\'ll discover all subdomains, probe live hosts, and analyse TLS certificates.' },
            { step: '3', title: 'Review findings',    desc: 'See all vulnerabilities and misconfigurations ranked by severity.' },
            { step: '4', title: 'Track changes',      desc: 'Every scan is diffed against the previous one — new assets and new findings are highlighted.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--color-accent)', color: '#000000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>{step}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function isValidDomain(value) {
  return /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(value.trim().toLowerCase())
}