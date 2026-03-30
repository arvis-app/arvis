# CONTEXTE PROJET — Arvis
_Dernière mise à jour : 31 mars 2026_

---

## Le projet

**Arvis** — SaaS de documentation médicale assistée par IA pour médecins hospitaliers allemands.

- **GitHub** : `https://github.com/arvis-app/arvis`
- **URL production** : `https://arvis-app.de` (www.arvis-app.de via Cloudflare)
- **Utilisateur** : Amine, médecin non-technique — parle français à Claude, explications simples
- Outil strictement personnel : pas de partage entre collègues, pas de stockage de données patients identifiants

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React 19 + React Router v7 + **Vite 6** |
| Styles | CSS custom (variables `--bg`, `--orange`, etc.), pas de framework |
| Backend | Supabase (Auth + Postgres + Edge Functions Deno + Storage) |
| Paiement | Stripe (Checkout, Billing Portal, Webhooks) |
| Deploy | Vercel (auto-deploy sur git push) + Cloudflare (DNS) |
| Monitoring | Sentry (`VITE_SENTRY_DSN`) |
| Build | `npm run build` → `build/` (~6s, 0 erreurs) |
| Dev | `npm run dev` → port 3000 |

**Couleur principale** : `#e87722` (orange) — Fonts : Inter + Bricolage Grotesque (titres)

---

## Structure des fichiers

```
arvis/
├── public/
│   └── landing_page.html          ← Landing page statique (Vercel route /)
├── src/
│   ├── App.js                     ← Routes React + PrivateRoute + PublicRoute
│   ├── supabaseClient.js          ← Client Supabase + invokeEdgeFunction() helper
│   ├── context/
│   │   └── AuthContext.js         ← Auth state, profil, isPro, getPlanInfo(), refreshProfile()
│   ├── components/
│   │   ├── AppLayout.js           ← Sidebar + topbar
│   │   ├── Paywall.js             ← Bloque l'accès si pas Pro
│   │   ├── ErrorBoundary.js
│   │   └── ResetPasswordModal.js
│   └── pages/
│       ├── LoginPage.js           ← Login + Register + Forgot + Reset (4 onglets)
│       ├── Dashboard.js           ← Vue d'ensemble, météo, agenda, patients
│       ├── Scan.js                ← Scan + OCR + KI-Analyse (Paywall)
│       ├── MobileScan.js          ← Scan via QR code depuis téléphone
│       ├── BriefSchreiber.js      ← Rédaction/correction IA de courriers (Paywall)
│       ├── Bausteine.js           ← 1550 blocs médicaux réutilisables (Paywall)
│       ├── Uebersetzung.js        ← 1585 termes 6 langues (Paywall)
│       ├── Dateien.js             ← Gestionnaire fichiers PDF/images (Paywall)
│       ├── Profil.js              ← Profil + abonnement Stripe
│       ├── AdminStats.js          ← KPIs admin (accès restreint côté serveur)
│       ├── Impressum.js / Datenschutz.js / AGB.js ← Pages légales
│       └── ResetPasswordPage.js
└── supabase/
    └── functions/
        ├── ai-chat/               ← Chat IA OpenAI (--no-verify-jwt)
        ├── ai-whisper/            ← Transcription audio (--no-verify-jwt)
        ├── realtime-token/        ← Token WebSocket Realtime (--no-verify-jwt)
        ├── create-checkout-session/ ← Stripe Checkout (--no-verify-jwt)
        ├── create-portal-session/   ← Stripe Billing Portal (--no-verify-jwt)
        ├── stripe-webhook/          ← Webhooks Stripe (--no-verify-jwt)
        ├── get-plan-status/         ← isPro calculé côté serveur (--no-verify-jwt)
        └── admin-stats/             ← Stats admin UUID-protégées (--no-verify-jwt)
```

---

## Routes

```
arvis-app.de/               → landing_page.html (statique, Vercel route)
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

## Base de données (Supabase)

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
| `ai_tokens_used` | integer | Tokens IA consommés ce mois |
| `ai_tokens_reset_at` | timestamptz | Date dernier reset mensuel |

### Autres tables (RLS activé sur toutes)

`bausteine`, `folders`, `notes`, `events`, `patients`, `scan_sessions`, `stripe_events_failed`, `stripe_events_processed`

RLS pattern : `auth.uid() = user_id` (ou `auth.uid() = id` pour `users`).

### Table à créer si absente

```sql
create table if not exists public.stripe_events_processed (
  event_id     text        primary key,
  processed_at timestamptz default now()
);
```

---

## Edge Functions

**Toutes déployées avec `--no-verify-jwt`** (sinon le gateway Supabase intercepte le preflight et retourne un CORS wildcard, annulant le fix www).

| Fonction | Rôle |
|----------|------|
| `ai-chat` | Chat IA OpenAI — valide JWT en interne, limite 20 msgs / 60k chars, budget 1M tokens/mois/user |
| `ai-whisper` | Transcription audio (Whisper) |
| `realtime-token` | Token WebSocket OpenAI Realtime |
| `create-checkout-session` | Crée session Stripe Checkout, applique coupons auto |
| `create-portal-session` | Ouvre Billing Portal Stripe |
| `stripe-webhook` | Événements Stripe → DB, idempotency via `stripe_events_processed` |
| `get-plan-status` | Retourne `{ is_pro }` calculé côté serveur |
| `admin-stats` | Stats KPI — accès réservé à `ADMIN_USER_ID` (UUID) vérifié côté serveur |

Vérification CORS après déploiement :
```bash
curl -s -I -X OPTIONS "https://jmanxlmzvfnhpgcxsqly.supabase.co/functions/v1/<fn>" \
  -H "Origin: https://www.arvis-app.de" | grep access-control-allow-origin
# Doit retourner : https://www.arvis-app.de
```

---

## Variables d'environnement

### Vercel (frontend) — `import.meta.env.VITE_*`

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

`supabase.functions.invoke()` n'envoie PAS le JWT. Toujours utiliser `invokeEdgeFunction()` de `src/supabaseClient.js` :

```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```

Le helper fait `getSession()` (cache local) et passe `Authorization: Bearer <token>` + log les erreurs non-JSON.

---

## Persistance localStorage / sessionStorage

| Page | Clé | Stockage |
|------|-----|----------|
| Scan | `arvis_scan_step`, `_panel`, `_mode`, `_limitReached` | `localStorage` (état UI) |
| Scan | `arvis_scan_aiHtml`, `_ocrText`, `_imgData` | `sessionStorage` (PHI — DSGVO Art. 9) |
| Bausteine | `arvis_bausteine_basket`, `_selected_id` | `localStorage` |
| Uebersetzung | `arvis_ueb_search`, `_cat`, `_langs`, `_selected` | `localStorage` |

**Piège restauration** : l'effet `[selected]` avec `removeItem` s'exécute au premier rendu avant la restauration. Solutions : `restoredRef` (Uebersetzung) ou `_pendingSelectedId` state initialisé depuis localStorage (Bausteine).

---

## Sécurité — checklist

1. **HTML dynamique** → `DOMPurify.sanitize()` avant tout `dangerouslySetInnerHTML`
2. **PHI (données médicales)** → jamais en `localStorage`, toujours `sessionStorage`
3. **Mutations Supabase client** → `.eq('user_id', user.id)` sur tout `update`/`delete` (même si RLS actif)
4. **Admin check** → UUID via `ADMIN_USER_ID` secret côté serveur (jamais côté client)

---

## Pièges connus

1. **CORS www** : `arvis-app.de` redirige (307) vers `www.arvis-app.de`. Toutes les Edge Functions doivent être `--no-verify-jwt` + avoir `https://www.arvis-app.de` dans `ALLOWED_ORIGINS`.
2. **sed sur macOS** : corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude.
3. **Stripe client supprimé** : `create-checkout-session` vérifie l'existence du client et le recrée si supprimé.
4. **Triple refresh Stripe** : au retour `?success=true`, polling 2s/20s jusqu'à détection `plan: pro`.
5. **Vite env vars** : préfixe `VITE_` obligatoire, accès via `import.meta.env.VITE_*` (jamais `process.env`).

---

## Règles de développement

1. Modifications **chirurgicales** — ne toucher que ce qui est demandé
2. Interface en **allemand** uniquement
3. Confirmations destructives → modale UI, jamais `confirm()` natif
4. **Aucun médicament ni dose** dans les bausteine — classes thérapeutiques uniquement
5. Placeholders dans les bausteine : `[_]`
6. Deploy : `git push` → Vercel auto-deploy

---

## Ce qui reste à faire

### Améliorations fonctionnelles
- [ ] Édition des bausteine custom (en plus de la suppression)
- [ ] Persistance favoris/custom côté serveur (Supabase)
- [ ] Notifications push mobile pour déclencher scan depuis PC

### Infrastructure future
- [ ] App mobile React Native
- [ ] Plateforme FSP/KP pour médecins étrangers (projet séparé)

---

## Compte de test

| | |
|-|-|
| Email | amine.mabtoul@outlook.fr |
| Mot de passe | test1144 |
| URL | https://arvis-app.de/login |

---

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML), ne pas modifier.
