import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import Impressum   from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import AGB         from './pages/AGB'
import AdminStats  from './pages/AdminStats'
import NotFound    from './pages/NotFound'
import './App.css'

function PrivateRoute({ children }) {
  const { user, loading, isResettingPassword } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  if (isResettingPassword) return <Navigate to="/reset-password" replace />
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

function PublicRoute({ children }) {
  const { user, loading, isResettingPassword } = useAuth()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  if (isResettingPassword) return children // rester sur /login pendant le reset
  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={
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
      <Route path="/impressum"   element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="/agb"         element={<AGB />} />
      <Route path="/admin/stats" element={<PrivateRoute><AdminStats /></PrivateRoute>} />
      <Route path="*" element={<NotFound />} />
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
