import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage   from './pages/LoginPage'
import AppLayout   from './components/AppLayout'
import Dashboard   from './pages/Dashboard'
import Scan        from './pages/Scan'
import BriefSchreiber from './pages/BriefSchreiber'
import Bausteine   from './pages/Bausteine'
import Uebersetzung from './pages/Uebersetzung'
import Dateien     from './pages/Dateien'
import Paywall         from './components/Paywall'
import Profil      from './pages/Profil'
import MobileScan  from './pages/MobileScan'
import './App.css'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loader"><div className="spinner" /></div>
  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/" element={
        <PrivateRoute><AppLayout /></PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="scan"         element={<Paywall><Scan /></Paywall>} />
        <Route path="briefschreiber" element={<Paywall><BriefSchreiber /></Paywall>} />
        <Route path="bausteine"    element={<Paywall><Bausteine /></Paywall>} />
        <Route path="uebersetzung" element={<Paywall><Uebersetzung /></Paywall>} />
        <Route path="dateien"      element={<Dateien />} />
        <Route path="profil"       element={<Profil />} />
        <Route path="mobile-scan/:token" element={<MobileScan />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
