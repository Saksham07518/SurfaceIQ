import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useNavigate } from 'react-router-dom'
import SEOHelmet from '../components/shared/SEOHelmet'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      navigate('/')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SEOHelmet title="Login" />

      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#000000',
              margin: '0 auto 16px',
            }}>S</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>
              SurfaceIQ
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {/* Card */}
          <div className="card">
            <form onSubmit={handleSubmit}>

              {/* Error */}
              {error && (
                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 14,
                  color: 'var(--color-critical)',
                }}>{error}</div>
              )}

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 500,
                  color: 'var(--color-text-muted)', marginBottom: 6,
                }}>Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 500,
                  color: 'var(--color-text-muted)', marginBottom: 6,
                }}>Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  minLength={6}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', padding: '10px 16px', fontSize: 15 }}
                disabled={loading}
              >
                {loading
                  ? <><div className="spinner" /> {isSignUp ? 'Creating account...' : 'Signing in...'}</>
                  : isSignUp ? 'Create account' : 'Sign in'
                }
              </button>

            </form>

            {/* Toggle sign in / sign up */}
            <p style={{
              textAlign: 'center', marginTop: 20,
              fontSize: 14, color: 'var(--color-text-muted)',
            }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => { setIsSignUp(s => !s); setError('') }}
                style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: 14 }}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

// Turn Firebase error codes into readable messages
function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}