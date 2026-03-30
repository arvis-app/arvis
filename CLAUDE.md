# CLAUDE.md — Arvis
_Dernière mise à jour : 31 mars 2026_

---

## Règles de conduite

Avant toute modification de code :
1. **Est-ce vraiment nécessaire ?** Si une protection existe déjà, ne pas ajouter une couche redondante.
2. **Est-ce que ça peut casser quelque chose ?** Tester mentalement les cas limites avant d'écrire.
3. En cas de doute : expliquer le pour/contre à Amine **avant** de toucher au code.
4. Modifications **chirurgicales** — ne toucher que ce qui est demandé.

## Profil utilisateur

- **Amine est médecin**, pas développeur. Il a construit ce projet sans formation en coding.
- Toujours expliquer simplement : pas de jargon sans explication, analogies concrètes, aller droit au but.
- Listes courtes et langage du quotidien plutôt que termes techniques bruts.

---

## Le projet

**Arvis** — SaaS de documentation médicale assistée par IA pour médecins hospitaliers allemands.

- **GitHub** : `https://github.com/arvis-app/arvis`
- **URL prod** : `https://arvis-app.de` (redirige vers `www.arvis-app.de` via Cloudflare)
- Outil strictement personnel : pas de partage entre collègues, pas de données patients identifiants

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React 19 + React Router v7 + **Vite 6** |
| Styles | CSS custom (variables `--bg`, `--orange` etc.), pas de framework |
| Backend | Supabase (Auth + Postgres + Edge Functions Deno + Storage) |
| Paiement | Stripe (Checkout, Billing Portal, Webhooks) |
| Deploy | Vercel (auto-deploy sur git push) + Cloudflare (DNS) |
| Monitoring | Sentry (`VITE_SENTRY_DSN`) |

**Couleur** : `#e87722` (orange) — **Fonts** : Inter + Bricolage Grotesque (titres)

## Commandes essentielles

```bash
npm run dev                                             # dev local (port 3000)
npm run build                                           # build prod → build/
npx supabase functions deploy <fn> --no-verify-jwt      # déployer une edge function
npx supabase secrets set KEY=VAL                        # ajouter un secret Supabase
git add <fichiers> && git commit -m "..." && git push   # deploy Vercel auto
```

---

## Structure des fichiers

```
arvis/
├── public/landing_page.html          ← Landing page statique (Vercel route /)
├── src/
│   ├── App.js                        ← Routes + PrivateRoute + PublicRoute
│   ├── supabaseClient.js             ← Client Supabase + invokeEdgeFunction()
│   ├── context/AuthContext.js        ← Auth state, profil, isPro, refreshProfile()
│   ├── components/
│   │   ├── AppLayout.js              ← Sidebar + topbar
│   │   └── Paywall.js                ← Bloque accès si pas Pro
│   └── pages/
│       ├── LoginPage.js              ← Login + Register + Forgot + Reset (4 onglets)
│       ├── Dashboard.js
│       ├── Scan.js                   ← Scan + OCR + KI-Analyse (Paywall)
│       ├── MobileScan.js             ← Scan via QR code (téléphone)
│       ├── BriefSchreiber.js         ← Rédaction/correction IA courriers (Paywall)
│       ├── Bausteine.js              ← 1550 blocs médicaux (Paywall)
│       ├── Uebersetzung.js           ← 1585 termes 6 langues (Paywall)
│       ├── Dateien.js                ← Gestionnaire fichiers (Paywall)
│       ├── Profil.js                 ← Profil + abonnement Stripe
│       └── AdminStats.js             ← KPIs admin (accès UUID-protégé)
└── supabase/functions/
    ├── ai-chat/                      ← Chat IA OpenAI
    ├── ai-whisper/                   ← Transcription audio
    ├── realtime-token/               ← Token WebSocket Realtime
    ├── create-checkout-session/      ← Stripe Checkout
    ├── create-portal-session/        ← Stripe Billing Portal
    ├── stripe-webhook/               ← Webhooks Stripe → DB
    ├── get-plan-status/              ← isPro calculé côté serveur
    └── admin-stats/                  ← Stats KPI admin
```

## Routes

```
arvis-app.de/               → landing_page.html (statique)
arvis-app.de/login          → LoginPage.js (public)
arvis-app.de/reset-password → ResetPasswordPage.js (public)
arvis-app.de/dashboard      → Dashboard.js (PrivateRoute)
arvis-app.de/scan           → Scan.js (PrivateRoute + Paywall)
arvis-app.de/briefschreiber → BriefSchreiber.js (PrivateRoute + Paywall)
arvis-app.de/bausteine      → Bausteine.js (PrivateRoute + Paywall)
arvis-app.de/uebersetzung   → Uebersetzung.js (PrivateRoute + Paywall)
arvis-app.de/dateien        → Dateien.js (PrivateRoute + Paywall)
arvis-app.de/profil         → Profil.js (PrivateRoute)
arvis-app.de/impressum / /datenschutz / /agb → public
```

Le routing `/` est géré par `vercel.json` (routes) avant React.

---

## Plans & abonnements

| Plan | isPro | Description |
|------|-------|-------------|
| `trial` + daysLeft > 0 | ✅ | Trial 14 jours actif |
| `trial` + daysLeft = 0 | ❌ | Trial expiré → Paywall |
| `pro` | ✅ | Abonnement actif |
| `canceled_pending` | ✅ | Annulé, accès jusqu'à `subscription_end_date` |
| `canceled` | ❌ | Annulé → Paywall |

Prix : **19€/mois** (`price_1TFjM6FPxR7QFABJwnMbND3B`) / **249€/an** (`price_1TFjM7FPxR7QFABJk5I1uBaC`)

---

## Base de données

### Table `users` — colonnes clés

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | = auth.users.id |
| `plan` | text | `trial`, `pro`, `canceled_pending`, `canceled` |
| `trial_started_at` | timestamptz | Début du trial |
| `stripe_customer_id` | text | ID client Stripe |
| `subscription_end_date` | timestamptz | Date fin abo (si canceled_pending) |
| `card_brand` / `card_last4` | text | Infos carte |
| `avatar_url` | text | URL avatar Storage |
| `clinic` | text | Nom de l'hôpital |
| `ai_tokens_used` | integer | Tokens IA consommés ce mois (reset 1er du mois) |
| `ai_tokens_reset_at` | timestamptz | Date dernier reset |

### Autres tables (RLS activé sur toutes)

`bausteine`, `folders`, `notes`, `events`, `patients`, `scan_sessions`, `stripe_events_failed`, `stripe_events_processed`

RLS pattern : `auth.uid() = user_id` (ou `auth.uid() = id` pour `users`).

### Table à créer si absente (SQL Editor Supabase)

```sql
create table if not exists public.stripe_events_processed (
  event_id     text        primary key,
  processed_at timestamptz default now()
);
```

---

## Edge Functions — règle critique

**TOUTES déployées avec `--no-verify-jwt`** — sinon le gateway Supabase intercepte le preflight OPTIONS et retourne un CORS wildcard, cassant le fix www.

| Fonction | Rôle |
|----------|------|
| `ai-chat` | Chat IA OpenAI — valide JWT en interne, limite 20 msgs / 60k chars, budget 1M tokens/mois/user |
| `ai-whisper` | Transcription audio (Whisper) |
| `realtime-token` | Token WebSocket OpenAI Realtime |
| `create-checkout-session` | Stripe Checkout, coupons auto-appliqués |
| `create-portal-session` | Billing Portal Stripe |
| `stripe-webhook` | Événements Stripe → DB, idempotency via `stripe_events_processed` |
| `get-plan-status` | Retourne `{ is_pro }` calculé côté serveur |
| `admin-stats` | Stats KPI — accès restreint à `ADMIN_USER_ID` (UUID) côté serveur |

Vérification CORS après déploiement :
```bash
curl -s -I -X OPTIONS "https://jmanxlmzvfnhpgcxsqly.supabase.co/functions/v1/<fn>" \
  -H "Origin: https://www.arvis-app.de" | grep access-control-allow-origin
# Doit retourner : https://www.arvis-app.de
```

---

## Variables d'environnement

### Vercel (frontend) — `import.meta.env.VITE_*` (jamais `process.env`)

```
VITE_SUPABASE_URL=https://jmanxlmzvfnhpgcxsqly.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PRICE_MONTHLY=price_1TFjM6FPxR7QFABJwnMbND3B
VITE_STRIPE_PRICE_YEARLY=price_1TFjM7FPxR7QFABJk5I1uBaC
VITE_SENTRY_DSN=https://...
```

### Supabase Secrets (edge functions)

```
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MONTHLY=price_1TFjM6FPxR7QFABJwnMbND3B
STRIPE_PRICE_YEARLY=price_1TFjM7FPxR7QFABJk5I1uBaC
ADMIN_USER_ID=<uuid-admin>
```

---

## Règle critique : invokeEdgeFunction()

`supabase.functions.invoke()` **n'envoie PAS le JWT** et masque les vraies erreurs. Toujours :
```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```
Le helper (`src/supabaseClient.js`) fait `getSession()` et passe `Authorization: Bearer <token>`.

---

## Stripe Webhook

URL : `https://jmanxlmzvfnhpgcxsqly.supabase.co/functions/v1/stripe-webhook`
Événements : `customer.subscription.created/updated/deleted`, `payment_method.attached`, `setup_intent.succeeded`, `customer.updated`

Détection annulation :
- `status: active` + `cancel_at` → `canceled_pending`
- `cancel_at_period_end: true` → `canceled_pending`
- `status: canceled` → `canceled`

Coupons auto-appliqués au checkout (priorité) :
1. `coupon.metadata.price_id === priceId`
2. `coupon.applies_to.products` contient le produit
3. Pas de restriction → applicable partout

---

## Persistance localStorage / sessionStorage

| Page | Clé | Stockage |
|------|-----|----------|
| Scan | `arvis_scan_step`, `_panel`, `_mode`, `_limitReached` | `localStorage` (UI) |
| Scan | `arvis_scan_aiHtml`, `_ocrText`, `_imgData` | `sessionStorage` (PHI — DSGVO Art. 9) |
| Bausteine | `arvis_bausteine_basket`, `_selected_id` | `localStorage` |
| Uebersetzung | `arvis_ueb_search`, `_cat`, `_langs`, `_selected` | `localStorage` |

**Piège restauration** : l'effet `[selected]` avec `removeItem` s'exécute au premier rendu avant la restauration. Solutions : `restoredRef` (Uebersetzung) ou `_pendingSelectedId` state initialisé depuis localStorage (Bausteine).

---

## Sécurité — checklist avant chaque fonctionnalité

1. **HTML dynamique** → `DOMPurify.sanitize()` avant tout `dangerouslySetInnerHTML`
2. **PHI (données médicales)** → jamais en `localStorage`, toujours `sessionStorage`
3. **Mutations Supabase client** → `.eq('user_id', user.id)` sur tout `update`/`delete` (même si RLS actif)
4. **Admin check** → UUID via `ADMIN_USER_ID` secret côté serveur, jamais côté client

---

## Pièges connus

1. **CORS www** : `arvis-app.de` redirige (307) → `www.arvis-app.de`. Toutes les Edge Functions doivent être `--no-verify-jwt` + avoir `https://www.arvis-app.de` dans `ALLOWED_ORIGINS`.
2. **sed sur macOS** : corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude.
3. **Stripe client supprimé** : `create-checkout-session` vérifie et recrée le client si supprimé.
4. **Triple refresh Stripe** : au retour `?success=true`, polling 2s/20s jusqu'à `plan: pro`.
5. **Vercel rewrites vs routes** : utiliser `routes` (pas `rewrites`) pour surcharger `/`.

---

## Ce qui reste à faire

- [ ] Édition des bausteine custom (en plus de la suppression)
- [ ] Persistance favoris/custom côté serveur (Supabase)
- [ ] Notifications push mobile pour déclencher scan depuis PC
- [ ] App mobile React Native (futur)

---

## Compte de test

- **Email** : amine.mabtoul@outlook.fr — **MDP** : test1144
- **URL** : https://arvis-app.de/login

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML), ne pas modifier.
