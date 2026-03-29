import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, invokeEdgeFunction } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null)
  const [profile, setProfile]             = useState(null)
  const [isPro, setIsPro]                 = useState(false) // false par défaut — sécurisé
  const [loading, setLoading]             = useState(true)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  // Charger le profil depuis Supabase
  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (!error && data) {
      setProfile(data)

      // isPro vient du serveur (edge function get-plan-status) — non manipulable côté client.
      // En cas d'échec de l'edge function, on tombe back sur un calcul local conservateur.
      try {
        const planStatus = await invokeEdgeFunction('get-plan-status', {})
        setIsPro(planStatus.is_pro === true)
      } catch (edgeErr) {
        console.warn('get-plan-status indisponible — accès refusé par sécurité:', edgeErr)
        setIsPro(false)
      }
    } else {
      // Pas de profil — créer automatiquement (Google OAuth ou inscription incomplète)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const meta = authUser.user_metadata || {}
        const firstName = meta.given_name || meta.full_name?.split(' ')[0] || ''
        const lastName  = meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || ''
        await supabase.from('users').upsert({
          id: userId,
          email: authUser.email,
          first_name: firstName,
          last_name: lastName,
          plan: 'trial',
          trial_started_at: new Date().toISOString(),
          onboarding_completed: false,
        })
        return loadProfile(userId)
      }
      setIsPro(false)
    }

    return data
  }

  useEffect(() => {
    // Détecter un flux PASSWORD_RECOVERY depuis l'URL (hash ou query param)
    const hash   = new URLSearchParams(window.location.hash.replace('#', ''))
    const search = new URLSearchParams(window.location.search)
    const isRecovery = hash.get('type') === 'recovery' || search.get('type') === 'recovery'
    if (isRecovery) setIsResettingPassword(true)

    // Vérifier la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        if (isRecovery) {
          setLoading(false) // ne pas charger le profil, on reste sur le form reset
        } else {
          loadProfile(session.user.id).finally(() => setLoading(false))
        }
      } else {
        setLoading(false)
      }
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Si l'utilisateur est sur /reset-password, ne pas interférer avec le flux de reset
      const onResetPage = window.location.pathname === '/reset-password'

      if (event === 'PASSWORD_RECOVERY') {
        setUser(session.user)
        setIsResettingPassword(true)
        setLoading(false)
        return
      }
      if (event === 'SIGNED_IN') {
        // Retour OAuth Google : l'URL contient ?code= (PKCE) ou #access_token (implicit)
        const isOAuthCallback = window.location.search.includes('code=') || window.location.hash.includes('access_token')
        if (isOAuthCallback) {
          const savedRedirect = sessionStorage.getItem('redirectAfterLogin')
          if (savedRedirect) {
            sessionStorage.removeItem('redirectAfterLogin')
            try {
              const url = new URL(savedRedirect, window.location.origin)
              if (url.origin === window.location.origin) {
                window.location.replace(url.pathname + url.search)
              } else {
                window.location.replace('/dashboard')
              }
            } catch {
              window.location.replace('/dashboard')
            }
            return
          }
        }
      }
      if (session) {
        setUser(session.user)
        // Ne pas charger le profil ni réinitialiser isResettingPassword sur la page reset
        if (!onResetPage) {
          loadProfile(session.user.id)
          setIsResettingPassword(false)
        }
      } else {
        setUser(null)
        setProfile(null)
        setIsPro(false)
        setIsResettingPassword(false) // Toujours réinitialiser au signOut
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function register(email, password, firstName, lastName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } }
    })
    if (error) throw error

    // Créer le profil dans users
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        plan: 'trial',
        trial_started_at: new Date().toISOString()
      })
    }
    return data
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://arvis-app.de' }
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!user) return
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) setProfile(data)
    return { data, error }
  }

  // Rafraîchir le profil (ex: après un paiement Stripe réussi)
  async function refreshProfile() {
    if (!user) return
    await loadProfile(user.id)
  }

  // Calcul du plan / trial
  function getPlanInfo() {
    if (!profile) return { plan: 'trial', daysLeft: 14, expired: false }
    if (profile.plan === 'pro' || profile.plan === 'active') return { plan: 'pro', daysLeft: null, expired: false }
    if (profile.plan === 'canceled_pending') {
      if (!profile.subscription_end_date) return { plan: 'canceled', daysLeft: 0, expired: true }
      const endDate  = new Date(profile.subscription_end_date)
      const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))
      return { plan: daysLeft > 0 ? 'pro' : 'canceled', daysLeft, expired: daysLeft === 0, canceledPending: true }
    }
    if (profile.plan === 'canceled') return { plan: 'canceled', daysLeft: 0, expired: true }
    if (!profile.trial_started_at) return { plan: 'trial', daysLeft: 0, expired: true }
    const start    = new Date(profile.trial_started_at)
    const daysUsed = Math.floor((Date.now() - start.getTime()) / 86400000)
    const daysLeft = Math.max(0, 14 - daysUsed)
    return { plan: 'trial', daysLeft, expired: daysLeft === 0 }
  }

  // Initiales de l'utilisateur
  function getInitials() {
    if (!profile) return 'A'
    const f = profile.first_name?.[0] || ''
    const l = profile.last_name?.[0]  || ''
    return (f + l).toUpperCase() || 'A'
  }

  // Nom d'affichage court
  function getDisplayName() {
    if (!profile) return ''
    const parts = [profile.title, profile.first_name ? profile.first_name[0] + '.' : '', profile.last_name].filter(Boolean)
    return parts.join(' ')
  }

  // Salutation selon l'heure
  function getGreeting() {
    const h = new Date().getHours()
    const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
    return `${greeting}, ${profile?.first_name || ''}`
  }

  return (
    <AuthContext.Provider value={{
      user, profile, isPro, loading, isResettingPassword,
      login, register, loginWithGoogle, logout, updateProfile, refreshProfile,
      getPlanInfo, getInitials, getDisplayName, getGreeting, loadProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
