import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

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
      const start = data.trial_started_at ? new Date(data.trial_started_at) : new Date()
      const daysUsed = Math.floor((Date.now() - start.getTime()) / 86400000)
      const daysLeft = Math.max(0, 14 - daysUsed)

      setIsPro(data.plan === 'pro' || data.plan === 'active' || (data.plan === 'trial' && daysLeft > 0))
    } else {
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
      if (event === 'PASSWORD_RECOVERY') {
        // L'utilisateur a cliqué sur le lien de reset → on l'authentifie et on affiche le form
        setUser(session.user)
        setIsResettingPassword(true)
        setLoading(false)
        return
      }
      if (session) {
        setUser(session.user)
        loadProfile(session.user.id)
        setIsResettingPassword(false)
      } else {
        setUser(null)
        setProfile(null)
        setIsPro(false)
        setIsResettingPassword(false)
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
      options: { redirectTo: window.location.origin }
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
    if (profile.plan === 'canceled') return { plan: 'canceled', daysLeft: 0, expired: true }
    const start    = profile.trial_started_at ? new Date(profile.trial_started_at) : new Date()
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
