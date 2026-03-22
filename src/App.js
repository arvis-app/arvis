import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage      from './pages/LoginPage'
import AppLayout      from './components/AppLayout'
import Dashboard      from './pages/Dashboard'
import Scan           from './pages/Scan'
import BriefSchreiber from './pages/BriefSchreiber'
import Bausteine      from './pages/Bausteine'
import Uebersetzung   from './pages/Uebersetzung'
import Dateien        from './pages/Dateien'
import Paywall        from './components/Paywall'
import Profil         from './pages/Profil'
import MobileScan     from './pages/MobileScan'
import ErrorBoundary      from './components/ErrorBoundary'
import ResetPasswordPage  from './pages/ResetPasswordPage'
import LandingPage        from './pages/LandingPage'
import './App.css'

function PrivateRoute({ children }) {
  const { user, loading, isResettingPassword } = useAuth()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  if (isResettingPassword) return <Navigate to="/reset-password" replace />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading, isResettingPassword } = useAuth()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  if (isResettingPassword) return children
  return user ? <Navigate to="/app/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing page — toujours accessible */}
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* App — protégée */}
      <Route path="/app" element={
        <PrivateRoute><AppLayout /></PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="scan"           element={<Paywall><ErrorBoundary><Scan /></ErrorBoundary></Paywall>} />
        <Route path="briefschreiber" element={<Paywall><ErrorBoundary><BriefSchreiber /></ErrorBoundary></Paywall>} />
        <Route path="bausteine"      element={<Paywall><ErrorBoundary><Bausteine /></ErrorBoundary></Paywall>} />
        <Route path="uebersetzung"   element={<Paywall><ErrorBoundary><Uebersetzung /></ErrorBoundary></Paywall>} />
        <Route path="dateien"        element={<Paywall><ErrorBoundary><Dateien /></ErrorBoundary></Paywall>} />
        <Route path="profil"         element={<ErrorBoundary><Profil /></ErrorBoundary>} />
        <Route path="mobile-scan/:token" element={<MobileScan />} />
      </Route>

      {/* Raccourcis directs sans /app/ préfixe */}
      <Route path="/dashboard"      element={<PrivateRoute><Navigate to="/app/dashboard" replace /></PrivateRoute>} />
      <Route path="/scan"           element={<PrivateRoute><Navigate to="/app/scan" replace /></PrivateRoute>} />
      <Route path="/briefschreiber" element={<PrivateRoute><Navigate to="/app/briefschreiber" replace /></PrivateRoute>} />
      <Route path="/bausteine"      element={<PrivateRoute><Navigate to="/app/bausteine" replace /></PrivateRoute>} />
      <Route path="/uebersetzung"   element={<PrivateRoute><Navigate to="/app/uebersetzung" replace /></PrivateRoute>} />
      <Route path="/dateien"        element={<PrivateRoute><Navigate to="/app/dateien" replace /></PrivateRoute>} />
      <Route path="/profil"         element={<PrivateRoute><Navigate to="/app/profil" replace /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
