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
- **Frontend** : React 19 + React Router v7 + **Vite 6**, déployé sur **Vercel** à `arvis-app.de`
- **Backend** : Supabase (Auth, Postgres, Edge Functions Deno, Storage)
- **Paiement** : Stripe (Checkout Sessions, Billing Portal, Webhooks)
- **Build** : `npm run build` (Vite, output dans `build/`)
- **Dev** : `npm run dev` (Vite dev server, port 3000)
- **Deploy** : git push → Vercel auto-deploy

## Commandes essentielles
```bash
npm run build                    # build prod (Vite)
npm run dev                      # dev server local
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
| `supabase/functions/ai-chat/` | Chat IA (--no-verify-jwt, valide JWT en interne) |
| `supabase/functions/ai-whisper/` | Transcription audio (--no-verify-jwt) |
| `supabase/functions/realtime-token/` | Token OpenAI Realtime WebSocket (--no-verify-jwt) |

## Règle critique : Edge Functions JWT
`supabase.functions.invoke()` v2.99.2 **n'envoie PAS le JWT automatiquement**.
Toujours utiliser `invokeEdgeFunction()` depuis `src/supabaseClient.js` :
```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```
Ce helper fait `getSession()` (cache local) et passe explicitement `Authorization: Bearer <token>`.

## Edge Functions — flags de déploiement

**TOUTES les fonctions doivent être déployées avec `--no-verify-jwt`.**

Si une fonction est déployée **sans** ce flag, le gateway Supabase intercepte le preflight OPTIONS et retourne son propre header CORS (wildcard ou mauvaise origin), annulant le fix CORS www.arvis-app.de.

| Fonction | Flag | Raison |
|----------|------|--------|
| `create-checkout-session` | `--no-verify-jwt` | Valide JWT en interne via SERVICE_ROLE_KEY |
| `create-portal-session` | `--no-verify-jwt` | idem |
| `stripe-webhook` | `--no-verify-jwt` | Stripe n'envoie pas de JWT |
| `ai-chat` | `--no-verify-jwt` | Valide JWT en interne + CORS dynamique |
| `ai-whisper` | `--no-verify-jwt` | idem |
| `realtime-token` | `--no-verify-jwt` | idem |
| `get-plan-status` | `--no-verify-jwt` | idem |
| `admin-stats` | `--no-verify-jwt` | idem |

Vérifier après déploiement :
```bash
curl -s -I -X OPTIONS "https://jmanxlmzvfnhpgcxsqly.supabase.co/functions/v1/<fn>" \
  -H "Origin: https://www.arvis-app.de" | grep access-control-allow-origin
# Doit retourner : https://www.arvis-app.de
```

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
### Vercel (frontend) — préfixe `VITE_` obligatoire (Vite, pas CRA)
```
VITE_STRIPE_PRICE_MONTHLY=price_xxx
VITE_STRIPE_PRICE_YEARLY=price_xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...
```
Accès dans le code : `import.meta.env.VITE_*` (jamais `process.env.REACT_APP_*`)
### Supabase Secrets (edge functions)
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_COUPON_MONTHLY  (optionnel, remplacé par auto-fetch)
```

## Règle critique : invokeEdgeFunction()
Ne jamais utiliser `supabase.functions.invoke()` — ne transmet pas le JWT et masque les vraies erreurs. Toujours utiliser `invokeEdgeFunction()` de `src/supabaseClient.js` :
```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```

## Persistance localStorage (pages stateful)
Scan, Bausteine, Uebersetzung sauvegardent leur état dans `localStorage` pour survivre aux changements d'onglet. Préfixes de clés : `arvis_scan_*`, `arvis_bausteine_*`, `arvis_ueb_*`.

**Piège restauration** : L'effet `[selected]` qui fait `removeItem` quand `selected=null` s'exécute au premier rendu et efface la clé avant la restauration. Toujours utiliser un `restoredRef` ou stocker l'id dans un state React séparé initialisé depuis localStorage.

## Pièges connus
1. **CORS www** : `arvis-app.de` redirige (307) vers `www.arvis-app.de`. Toutes les Edge Functions doivent être déployées avec `--no-verify-jwt` et avoir `https://www.arvis-app.de` dans leur ALLOWED_ORIGINS. Vérifier après chaque déploiement (voir section "Edge Functions — flags").
2. **Client Stripe supprimé** : `create-checkout-session` vérifie l'existence du client avant usage et le recrée si supprimé.
3. **Triple refresh** : Au retour de Stripe (`?success=true`), polling toutes les 2s pendant 20s max jusqu'à détection `plan: pro`.
4. **sed sur macOS** corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude.
5. **Vercel rewrites vs routes** : `rewrites` appliqués après filesystem → utiliser `routes` pour surcharger `/`.

## Compte de test
- **Email** : amine.mabtoul@outlook.fr
- **Mot de passe** : test1144
- URL : https://arvis-app.de/login

## Changelog récent (Mars 2026)

### Pages légales
- **Datenschutz.js** : Version complète refaite — fusion e-recht24 + Arvis spécifique. 13 sections. Inclut : Hosting Vercel+AVV, Art. 9 DSGVO (données médicales), §25 TDDDG, Art. 21 WIDERSPRUCH en MAJUSCULES, Drittanbieter (Supabase/Stripe/OpenAI/Vercel), Google Fonts.
- **Impressum.js** : Conforme §5 TMG, complet (Haftung, Urheberrecht, Berufsrechtliche Angaben). Pas de modifications nécessaires.

### LoginPage.js
- Supprimé la barre du bas (footer avec Impressum/Datenschutz/AGB)
- Liens Impressum · Datenschutz · AGB déplacés **en bas du panneau droit** (intégrés dans le conteneur form)

### Logo
- Logo Arvis créé en PNG via Python/Pillow (`arvis_logo.png` dans Downloads)
- Robot : tête circulaire gradient teal→bleu, yeux blancs sans visière, sourire, oreillettes, lignes ECG horizontales
- Script Python : `/tmp/logo6.py`

### Typographie & Design (session 4-5, 25 mars 2026)
- **+2px sur toutes les font-sizes** : `App.css` (168 changements) + tous les `.js` inline styles (196 changements)
  - Patterns couverts : `font-size: Xpx` (CSS), `fontSize: X` et `fontSize:X` (JS inline)
- **Centrage "Arvis" dans topbar** : `.topbar-center-icon` utilisait `opacity:0` mais occupait toujours de l'espace → corrigé avec `max-width:0; overflow:hidden` quand sidebar ouverte
- **Bausteine layout** : ratio cards ajusté à 40/60 (liste/éditeur)

### Landing page (session 4-5, 25 mars 2026)
- **Mockup cards agrandies** : `min-height 240px→300px`, hauteur image `160px→200px`, font-sizes 11-12px→13-14px
- **Card Translate** : largeur labels `width:60px→85px;flex-shrink:0` (7 labels) pour éviter chevauchement Fachbegriff/Українська
- **Card Brief Schreiber** : boutons Kopieren + Word à largeur égale (`flex:1`)
- **Section Brief Schreiber mockup** : boutons Kopieren (orange) + Word (bleu #2B579A) ajoutés
- **Nav header** : couleur liens = couleur texte "Arvis" (`var(--text)` au lieu de `var(--text-3)`)
- **Curseur clignotant** supprimé de la card Brief Schreiber
- **Bouton "Kopieren · An Brief Schreiber"** : `opacity:0.6` supprimé → orange plein `var(--orange)` (#D94B0A)
- **Card Scan description** : saut de ligne ajouté entre `—` et `KI-Analyse`
- **Dashboard mockup topbar** : logo maison SVG remplacé par `<img src="/arvis-icon.svg">`
- **Bouton scan copy** : background `var(--orange-ghost)→var(--orange)`, couleur texte `var(--orange-dark)→white`
