/**
 * Tests de la logique pure de plan/isPro extraite de AuthContext.js
 *
 * Les deux fonctions ci-dessous reproduisent fidèlement la logique de :
 *   - loadProfile()  → calcul de isPro
 *   - getPlanInfo()  → calcul du plan affiché et des jours restants
 *
 * Aucun mock Supabase, aucun hook React — logique pure uniquement.
 */

// ---------------------------------------------------------------------------
// Helpers extraits de AuthContext.js
// ---------------------------------------------------------------------------

/**
 * Reproduit le calcul de isPro dans loadProfile().
 * @param {object} data - Profil utilisateur (champs: plan, trial_started_at, subscription_end_date)
 * @param {number} [now] - Timestamp en ms (Date.now()), injectable pour les tests
 */
function computeIsPro(data, now = Date.now()) {
  if (!data) return false

  const trialValid =
    data.plan === 'trial' &&
    !!data.trial_started_at &&
    Math.floor((now - new Date(data.trial_started_at).getTime()) / 86400000) < 14

  const canceledPendingValid =
    data.plan === 'canceled_pending' &&
    !!data.subscription_end_date &&
    new Date(data.subscription_end_date) > new Date(now)

  return data.plan === 'pro' || data.plan === 'active' || canceledPendingValid || trialValid
}

/**
 * Reproduit getPlanInfo() de AuthContext.js.
 * @param {object|null} profile - Profil utilisateur
 * @param {number} [now] - Timestamp en ms (Date.now()), injectable pour les tests
 */
function getPlanInfo(profile, now = Date.now()) {
  if (!profile) return { plan: 'trial', daysLeft: 14, expired: false }

  if (profile.plan === 'pro' || profile.plan === 'active') {
    return { plan: 'pro', daysLeft: null, expired: false }
  }

  if (profile.plan === 'canceled_pending') {
    if (!profile.subscription_end_date) return { plan: 'canceled', daysLeft: 0, expired: true }
    const endDate = new Date(profile.subscription_end_date)
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now) / 86400000))
    return {
      plan: daysLeft > 0 ? 'pro' : 'canceled',
      daysLeft,
      expired: daysLeft === 0,
      canceledPending: true,
    }
  }

  if (profile.plan === 'canceled') {
    return { plan: 'canceled', daysLeft: 0, expired: true }
  }

  // plan === 'trial' (ou valeur inconnue)
  if (!profile.trial_started_at) return { plan: 'trial', daysLeft: 0, expired: true }
  const start = new Date(profile.trial_started_at)
  const daysUsed = Math.floor((now - start.getTime()) / 86400000)
  const daysLeft = Math.max(0, 14 - daysUsed)
  return { plan: 'trial', daysLeft, expired: daysLeft === 0 }
}

// ---------------------------------------------------------------------------
// Utilitaires de date pour les tests
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000

/** Retourne un ISO string dans le passé (il y a N jours) */
function daysAgo(n) {
  return new Date(Date.now() - n * MS_PER_DAY).toISOString()
}

/** Retourne un ISO string dans le futur (dans N jours) */
function daysFromNow(n) {
  return new Date(Date.now() + n * MS_PER_DAY).toISOString()
}

// ---------------------------------------------------------------------------
// Tests — computeIsPro (logique de loadProfile)
// ---------------------------------------------------------------------------

describe('computeIsPro — logique de loadProfile()', () => {
  // ── plan: trial ──────────────────────────────────────────────────────────

  describe('plan: trial', () => {
    test('daysLeft > 0 → isPro = true', () => {
      const profile = { plan: 'trial', trial_started_at: daysAgo(5) }
      expect(computeIsPro(profile)).toBe(true)
    })

    test('daysLeft = 0 (trial commencé il y a exactement 14 jours) → isPro = false', () => {
      // daysUsed = Math.floor(14 * MS / MS) = 14 → pas < 14 → false
      const profile = { plan: 'trial', trial_started_at: daysAgo(14) }
      expect(computeIsPro(profile)).toBe(false)
    })

    test('trial expiré depuis longtemps → isPro = false', () => {
      const profile = { plan: 'trial', trial_started_at: daysAgo(30) }
      expect(computeIsPro(profile)).toBe(false)
    })

    test('trial sans trial_started_at → isPro = false (sécurité)', () => {
      const profile = { plan: 'trial', trial_started_at: null }
      expect(computeIsPro(profile)).toBe(false)
    })

    test('premier jour du trial (démarré il y a 0 jours) → isPro = true', () => {
      const profile = { plan: 'trial', trial_started_at: daysAgo(0) }
      expect(computeIsPro(profile)).toBe(true)
    })

    test('dernier jour valide (démarré il y a 13 jours) → isPro = true', () => {
      // daysUsed = 13 → 13 < 14 → true
      const profile = { plan: 'trial', trial_started_at: daysAgo(13) }
      expect(computeIsPro(profile)).toBe(true)
    })
  })

  // ── plan: pro ────────────────────────────────────────────────────────────

  describe('plan: pro', () => {
    test('plan pro → isPro = true', () => {
      expect(computeIsPro({ plan: 'pro' })).toBe(true)
    })

    test('plan active (alias pro) → isPro = true', () => {
      expect(computeIsPro({ plan: 'active' })).toBe(true)
    })
  })

  // ── plan: canceled_pending ───────────────────────────────────────────────

  describe('plan: canceled_pending', () => {
    test('subscription_end_date dans le futur → isPro = true', () => {
      const profile = {
        plan: 'canceled_pending',
        subscription_end_date: daysFromNow(10),
      }
      expect(computeIsPro(profile)).toBe(true)
    })

    test('subscription_end_date dans le passé → isPro = false', () => {
      const profile = {
        plan: 'canceled_pending',
        subscription_end_date: daysAgo(1),
      }
      expect(computeIsPro(profile)).toBe(false)
    })

    test('subscription_end_date absent → isPro = false', () => {
      const profile = { plan: 'canceled_pending', subscription_end_date: null }
      expect(computeIsPro(profile)).toBe(false)
    })
  })

  // ── plan: canceled ───────────────────────────────────────────────────────

  describe('plan: canceled', () => {
    test('plan canceled → isPro = false', () => {
      expect(computeIsPro({ plan: 'canceled' })).toBe(false)
    })
  })

  // ── cas limites ──────────────────────────────────────────────────────────

  describe('cas limites', () => {
    test('profil null → isPro = false', () => {
      expect(computeIsPro(null)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Tests — getPlanInfo
// ---------------------------------------------------------------------------

describe('getPlanInfo()', () => {
  // ── pas de profil ────────────────────────────────────────────────────────

  test('profil null → trial avec 14 jours par défaut', () => {
    const info = getPlanInfo(null)
    expect(info).toEqual({ plan: 'trial', daysLeft: 14, expired: false })
  })

  // ── plan: pro / active ───────────────────────────────────────────────────

  test('plan pro → daysLeft null, non expiré', () => {
    const info = getPlanInfo({ plan: 'pro' })
    expect(info).toEqual({ plan: 'pro', daysLeft: null, expired: false })
  })

  test('plan active → identique à pro', () => {
    const info = getPlanInfo({ plan: 'active' })
    expect(info).toEqual({ plan: 'pro', daysLeft: null, expired: false })
  })

  // ── plan: trial ──────────────────────────────────────────────────────────

  test('trial sans trial_started_at → expiré immédiatement', () => {
    const info = getPlanInfo({ plan: 'trial', trial_started_at: null })
    expect(info).toEqual({ plan: 'trial', daysLeft: 0, expired: true })
  })

  test('trial démarré il y a 0 jours → 14 jours restants', () => {
    const info = getPlanInfo({ plan: 'trial', trial_started_at: daysAgo(0) })
    expect(info.plan).toBe('trial')
    expect(info.daysLeft).toBe(14)
    expect(info.expired).toBe(false)
  })

  test('trial démarré il y a 5 jours → 9 jours restants', () => {
    const info = getPlanInfo({ plan: 'trial', trial_started_at: daysAgo(5) })
    expect(info.plan).toBe('trial')
    expect(info.daysLeft).toBe(9)
    expect(info.expired).toBe(false)
  })

  test('trial démarré il y a 13 jours → 1 jour restant', () => {
    const info = getPlanInfo({ plan: 'trial', trial_started_at: daysAgo(13) })
    expect(info.plan).toBe('trial')
    expect(info.daysLeft).toBe(1)
    expect(info.expired).toBe(false)
  })

  test('trial démarré il y a 14 jours → daysLeft = 0, expiré', () => {
    const info = getPlanInfo({ plan: 'trial', trial_started_at: daysAgo(14) })
    expect(info.plan).toBe('trial')
    expect(info.daysLeft).toBe(0)
    expect(info.expired).toBe(true)
  })

  test('trial démarré il y a 30 jours → daysLeft = 0, expiré', () => {
    const info = getPlanInfo({ plan: 'trial', trial_started_at: daysAgo(30) })
    expect(info.plan).toBe('trial')
    expect(info.daysLeft).toBe(0)
    expect(info.expired).toBe(true)
  })

  // ── plan: canceled_pending ───────────────────────────────────────────────

  test('canceled_pending sans subscription_end_date → traité comme canceled', () => {
    const info = getPlanInfo({ plan: 'canceled_pending', subscription_end_date: null })
    expect(info).toEqual({ plan: 'canceled', daysLeft: 0, expired: true })
  })

  test('canceled_pending avec end_date dans 10 jours → plan pro, 10 jours', () => {
    const info = getPlanInfo({
      plan: 'canceled_pending',
      subscription_end_date: daysFromNow(10),
    })
    expect(info.plan).toBe('pro')
    expect(info.daysLeft).toBe(10)
    expect(info.expired).toBe(false)
    expect(info.canceledPending).toBe(true)
  })

  test('canceled_pending avec end_date dans le passé → canceled, 0 jours, expiré', () => {
    const info = getPlanInfo({
      plan: 'canceled_pending',
      subscription_end_date: daysAgo(3),
    })
    expect(info.plan).toBe('canceled')
    expect(info.daysLeft).toBe(0)
    expect(info.expired).toBe(true)
    expect(info.canceledPending).toBe(true)
  })

  // ── plan: canceled ───────────────────────────────────────────────────────

  test('plan canceled → canceled, 0 jours, expiré', () => {
    const info = getPlanInfo({ plan: 'canceled' })
    expect(info).toEqual({ plan: 'canceled', daysLeft: 0, expired: true })
  })

  // ── cohérence isPro vs getPlanInfo ───────────────────────────────────────

  describe('cohérence entre computeIsPro et getPlanInfo', () => {
    const cases = [
      { plan: 'trial', trial_started_at: daysAgo(5) },
      { plan: 'trial', trial_started_at: daysAgo(14) },
      { plan: 'pro' },
      { plan: 'canceled_pending', subscription_end_date: daysFromNow(10) },
      { plan: 'canceled_pending', subscription_end_date: daysAgo(1) },
      { plan: 'canceled' },
    ]

    test.each(cases)('plan=$plan → isPro cohérent avec getPlanInfo', (profile) => {
      const isPro = computeIsPro(profile)
      const info = getPlanInfo(profile)
      // isPro = true ↔ plan affiché est 'pro' OU trial non expiré
      const infoSaysPro = info.plan === 'pro' || (info.plan === 'trial' && !info.expired)
      expect(isPro).toBe(infoSaysPro)
    })
  })
})
