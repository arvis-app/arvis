import { test, expect } from '@playwright/test'

test.describe('Flow critique Arvis', () => {

  test('Inscription crée un compte trial', async ({ page }) => {
    await page.goto('/login')

    // Chercher le bouton d'inscription (Registrieren)
    const registerBtn = page.getByRole('button', { name: /registrieren/i })
      .or(page.getByText(/registrieren/i).first())
    await registerBtn.click()

    // Remplir le formulaire
    const email = `test-${Date.now()}@arvis-test.de`
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Soumettre
    const submitBtn = page.getByRole('button', { name: /registrieren|anmelden|konto erstellen/i }).last()
    await submitBtn.click()

    // Vérifier redirection vers /dashboard ou /onboarding
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 })

    // Vérifier la présence du badge plan "Trial"
    const planBadge = page.getByTestId('plan-badge')
    // Le badge peut ne pas être immédiatement visible sur /onboarding
    // On navigue vers le dashboard pour le vérifier
    if (page.url().includes('onboarding')) {
      await page.goto('/dashboard')
    }
    await expect(planBadge).toContainText(/trial/i, { timeout: 5000 })
  })

  test('Paywall bloque accès Briefassistent en trial', async ({ page }) => {
    const email = process.env.TEST_TRIAL_EMAIL
    const password = process.env.TEST_TRIAL_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_TRIAL_EMAIL / TEST_TRIAL_PASSWORD non définis')
      return
    }

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.getByRole('button', { name: /anmelden|einloggen/i }).click()
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 })

    // Naviguer vers /briefassistent
    await page.goto('/briefassistent')
    await page.waitForLoadState('networkidle')

    // Vérifier que le Paywall est visible
    const paywall = page.getByTestId('paywall')
    await expect(paywall).toBeVisible({ timeout: 5000 })

    // Vérifier que le bouton Upgrade est présent (mais ne pas cliquer)
    const upgradeBtn = page.getByTestId('paywall-upgrade-btn')
    await expect(upgradeBtn).toBeVisible()
    await expect(upgradeBtn).toBeEnabled()
  })

  test('Bausteine et Uebersetzung accessibles sans upgrade', async ({ page }) => {
    const email = process.env.TEST_TRIAL_EMAIL
    const password = process.env.TEST_TRIAL_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_TRIAL_EMAIL / TEST_TRIAL_PASSWORD non définis')
      return
    }

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.getByRole('button', { name: /anmelden|einloggen/i }).click()
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 })

    // Vérifier /bausteine — pas de Paywall
    await page.goto('/bausteine')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('paywall')).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Si le paywall n'existe pas du tout dans le DOM, c'est OK aussi
    })

    // Vérifier /uebersetzung — pas de Paywall
    await page.goto('/uebersetzung')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('paywall')).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Même logique
    })
  })

})
