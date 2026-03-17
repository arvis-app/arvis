import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Charger le profil depuis Supabase
  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (!error && data) setProfile(data)
    return data
  }

  useEffect(() => {
    // Vérifier la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
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

  // Calcul du plan / trial
  function getPlanInfo() {
    if (!profile) return { plan: 'trial', daysLeft: 14, expired: false }
    if (profile.plan === 'pro') return { plan: 'pro', daysLeft: null, expired: false }
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
      user, profile, loading,
      login, register, loginWithGoogle, logout, updateProfile,
      getPlanInfo, getInitials, getDisplayName, getGreeting, loadProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
