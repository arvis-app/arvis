import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage      from './pages/LoginPage'
import AppLayout      from './components/AppLayout'
import Dashboard      from './pages/Dashboard'
import Paywall        from './components/Paywall'
import ErrorBoundary      from './components/ErrorBoundary'
import NotFound    from './pages/NotFound'
import './App.css'

// Code splitting : pages premium chargées à la demande
const Scan           = lazy(() => import('./pages/Scan'))
const BriefSchreiber = lazy(() => import('./pages/BriefSchreiber'))
const Bausteine      = lazy(() => import('./pages/Bausteine'))
const Uebersetzung   = lazy(() => import('./pages/Uebersetzung'))
const Dateien        = lazy(() => import('./pages/Dateien'))
const Profil         = lazy(() => import('./pages/Profil'))
const MobileScan     = lazy(() => import('./pages/MobileScan'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const Impressum      = lazy(() => import('./pages/Impressum'))
const Datenschutz    = lazy(() => import('./pages/Datenschutz'))
const AGB            = lazy(() => import('./pages/AGB'))
const AdminStats     = lazy(() => import('./pages/AdminStats'))

function PrivateRoute({ children }) {
  const { user, loading, isResettingPassword } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  if (isResettingPassword) return <Navigate to="/reset-password" replace />
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search)
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, loading, isResettingPassword } = useAuth()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  if (isResettingPassword) return children // rester sur /login pendant le reset
  return user ? <Navigate to="/dashboard" replace /> : children
}

const LazyFallback = () => <div className="app-loader"><div className="spinner" /></div>

function AppRoutes() {
  return (
    <Suspense fallback={<LazyFallback />}>
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/reset-password" element={<ErrorBoundary><ResetPasswordPage /></ErrorBoundary>} />
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
        <Route path="mobile-scan/:token" element={<ErrorBoundary><MobileScan /></ErrorBoundary>} />
      </Route>
      <Route path="/impressum"   element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="/agb"         element={<AGB />} />
      <Route path="/admin/stats" element={<PrivateRoute><ErrorBoundary><AdminStats /></ErrorBoundary></PrivateRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
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
