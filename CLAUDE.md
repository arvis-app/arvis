# CLAUDE.md — Arvis

## Règle de conduite — À lire en priorité

Avant toute modification de code :
1. **Est-ce vraiment nécessaire ?** Si une protection existe déjà (ex: JWT valide les requêtes), ne pas ajouter une couche redondante qui peut casser.
2. **Est-ce que ça peut casser quelque chose ?** Tester mentalement les cas limites (URLs, valeurs null, dépendances) avant d'écrire.
3. En cas de doute : expliquer le pour/contre à Amine **avant** de toucher au code.

## Profil utilisateur — À lire en priorité
- **Amine est médecin**, pas développeur. Il a construit ce projet sans formation en coding.
- **Toujours expliquer simplement** : pas de jargon technique sans explication, utiliser des analogies concrètes, aller droit au but.
- Si un concept technique est nécessaire, l'expliquer comme à quelqu'un qui ne code pas — en une phrase claire, avec un exemple concret si possible.
- Privilégier les **listes courtes** et le **langage du quotidien** plutôt que les termes techniques bruts.

## Stack technique
- **Frontend** : React 19 + React Router v7 (Create React App), déployé sur **Vercel** à `arvis-app.de`
- **Backend** : Supabase (Auth, Postgres, Edge Functions Deno, Storage)
- **Paiement** : Stripe (Checkout Sessions, Billing Portal, Webhooks)
- **Build** : `npx react-scripts build`
- **Deploy** : git push → Vercel auto-deploy

## Commandes essentielles
```bash
npx react-scripts build          # build prod
npx supabase functions deploy <fn> --no-verify-jwt  # déployer une edge function
npx supabase secrets set KEY=VAL # ajouter un secret
npx supabase db push             # pousser une migration SQL
git add <fichiers> && git commit -m "..." && git push  # deploy
```

## Architecture des routes
```
arvis-app.de/               → landing_page.html (Vercel route, statique)
arvis-app.de/login          → LoginPage.js (React, public)
arvis-app.de/reset-password → ResetPasswordPage.js (React, public)
arvis-app.de/dashboard      → Dashboard.js (React, PrivateRoute)
arvis-app.de/scan           → Scan.js (React, PrivateRoute + Paywall)
arvis-app.de/briefschreiber → BriefSchreiber.js (React, PrivateRoute + Paywall)
arvis-app.de/bausteine      → Bausteine.js (React, PrivateRoute + Paywall)
arvis-app.de/uebersetzung   → Uebersetzung.js (React, PrivateRoute + Paywall)
arvis-app.de/dateien        → Dateien.js (React, PrivateRoute + Paywall)
arvis-app.de/profil         → Profil.js (React, PrivateRoute)
```
Le routing `/` est géré par `vercel.json` (routes) avant React.

## Fichiers clés
| Fichier | Rôle |
|---------|------|
| `src/supabaseClient.js` | Client Supabase + `invokeEdgeFunction()` helper |
| `src/context/AuthContext.js` | Auth state, profil, isPro, getPlanInfo(), refreshProfile() |
| `src/App.js` | Routes React, PrivateRoute, PublicRoute |
| `src/components/AppLayout.js` | Sidebar + topbar de l'app |
| `src/components/Paywall.js` | Bloque l'accès si pas Pro |
| `src/pages/Profil.js` | Gestion profil + abonnement Stripe |
| `public/landing_page.html` | Landing page statique (avec script redirect si connecté) |
| `vercel.json` | Route `/` → `landing_page.html`, reste → `index.html` |
| `supabase/functions/create-checkout-session/` | Crée session Stripe Checkout |
| `supabase/functions/create-portal-session/` | Ouvre Billing Portal Stripe |
| `supabase/functions/stripe-webhook/` | Reçoit événements Stripe → maj DB |
| `supabase/functions/ai-chat/` | Chat IA (verify_jwt: true) |
| `supabase/functions/ai-whisper/` | Transcription audio (verify_jwt: true) |
| `supabase/functions/realtime-token/` | Token Realtime (verify_jwt: true) |

## Règle critique : Edge Functions JWT
`supabase.functions.invoke()` v2.99.2 **n'envoie PAS le JWT automatiquement**.
Toujours utiliser `invokeEdgeFunction()` depuis `src/supabaseClient.js` :
```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```
Ce helper fait `refreshSession()` et passe explicitement `Authorization: Bearer <token>`.

## Edge Functions — flags de déploiement
- `create-checkout-session` → `--no-verify-jwt` (gateway désactivé, fonction valide JWT elle-même via SERVICE_ROLE_KEY)
- `create-portal-session` → `--no-verify-jwt`
- `stripe-webhook` → `--no-verify-jwt` (Stripe n'envoie pas de JWT)
- `ai-chat`, `ai-whisper`, `realtime-token` → verify_jwt: true (défaut)

## Table `users` (colonnes importantes)
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | = auth.users.id |
| `plan` | text | `trial`, `pro`, `canceled_pending`, `canceled` |
| `trial_started_at` | timestamptz | début du trial (14 jours) |
| `stripe_customer_id` | text | ID client Stripe |
| `subscription_end_date` | timestamptz | date fin abo (si canceled_pending) |
| `card_brand` | text | `visa`, `mastercard`, `paypal`, `sepa`... |
| `card_last4` | text | 4 derniers chiffres |

## Logique des plans
- `trial` + daysLeft > 0 → **isPro = true** (accès complet)
- `trial` + daysLeft = 0 → **isPro = false** (Paywall)
- `pro` → **isPro = true**
- `canceled_pending` → **isPro = true** (accès jusqu'à `subscription_end_date`)
- `canceled` → **isPro = false** (Paywall)

## Stripe Webhook
URL : `https://jmanxlmzvfnhpgcxsqly.supabase.co/functions/v1/stripe-webhook`
Événements écoutés : `customer.subscription.created/updated/deleted`, `payment_method.attached`, `setup_intent.succeeded`, `customer.updated`

Détection annulation en cours :
- `status: active` + `cancel_at` (timestamp) → `canceled_pending`
- `cancel_at_period_end: true` → aussi `canceled_pending`
- `status: canceled` → `canceled`

## Coupons Stripe (auto-appliqués au checkout)
La fonction `create-checkout-session` récupère dynamiquement le 1er coupon valide depuis Stripe.
Priorité de matching :
1. `coupon.metadata.price_id === priceId` → coupon pour un prix précis
2. `coupon.applies_to.products` contient le produit → coupon pour un produit
3. Aucune restriction → applicable partout

Pour cibler un prix précis : dans Stripe Dashboard → coupon → Metadata → `price_id: price_xxx`

## Variables d'environnement
### Vercel (frontend)
```
REACT_APP_STRIPE_PRICE_MONTHLY=price_xxx
REACT_APP_STRIPE_PRICE_YEARLY=price_xxx
```
### Supabase Secrets (edge functions)
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_COUPON_MONTHLY  (optionnel, remplacé par auto-fetch)
```

## Pièges connus
1. **Client Stripe supprimé** : `create-checkout-session` vérifie l'existence du client avant usage et le recrée si supprimé.
2. **Triple refresh** : Au retour de Stripe (`?success=true`), polling toutes les 2s pendant 20s max jusqu'à détection `plan: pro`.
3. **sed sur macOS** corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude.
4. **Vercel rewrites vs routes** : `rewrites` appliqués après filesystem → utiliser `routes` pour surcharger `/`.
