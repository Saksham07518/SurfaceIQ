import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Sidebar, MobileNavbar } from './components/shared/Navbar'

import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets    from './pages/Assets'
import Scans     from './pages/Scans'
import Findings  from './pages/Findings'

import './styles/global.css'

function ProtectedLayout() {
  return (
    <div className="app-shell">
      {/* Tablet + laptop sidebar */}
      <Sidebar />

      {/* Mobile top navbar */}
      <MobileNavbar />

      {/* Page content */}
      <main className="main-content" id="main-content">
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/assets"   element={<Assets />} />
          <Route path="/scans"    element={<Scans />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <RequireAuth>
            <ProtectedLayout />
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}