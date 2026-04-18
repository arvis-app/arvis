# CLAUDE.md — Arvis
_Dernière mise à jour : 17 avril 2026_

> **Conventions critiques à ne pas oublier :**
> - Toujours travailler sur `main` — pas de branches
> - Paramètre tokens OpenAI : `max_completion_tokens` (pas `max_tokens`) — voir Règles de développement
> - `invokeEdgeFunction()` utilise `fetch()` natif — ne jamais utiliser `supabase.functions.invoke()`
> - `DOMPurify.sanitize()` sur tout `dangerouslySetInnerHTML` — sans exception

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

**Origine du nom :** Contraction de **Jarvis** (l'assistant IA d'Iron Man) + **Arzt** (médecin en allemand). L'idée : un assistant intelligent dédié aux médecins, comme Jarvis l'était pour Tony Stark.

- **GitHub** : `https://github.com/arvis-app/arvis`
- **URL prod** : `https://arvis-app.de` (redirige vers `www.arvis-app.de` via Cloudflare)
- Outil strictement personnel : pas de partage entre collègues, pas de données patients identifiants

### Description & utilité

Arvis est conçu pour **réduire la charge administrative des médecins hospitaliers** en Allemagne. Le travail médical génère une quantité massive de documentation (courriers, comptes-rendus, traductions, analyses) qui prend du temps sur les soins. Arvis automatise cette partie grâce à l'IA.

**Fonctionnalités principales :**

| Fonctionnalité | Description |
|----------------|-------------|
| **Scan / OCR + KI-Analyse** | Scanne un document médical via GPT-4o Vision (pas de Tesseract) — extraction texte OCR et analyse IA structurée en allemand |
| **Briefassistent** | Rédige ou corrige des courriers médicaux professionnels en allemand via IA (arztbrief, Überweisung, etc.) |
| **Bausteine** | Bibliothèque de 1 564 blocs de texte médicaux réutilisables, organisés par spécialité — permet d'assembler rapidement des comptes-rendus standardisés |
| **Übersetzung** | Dictionnaire médical multilingue de 1 585 termes traduits en 6 langues (DE, FR, EN, AR, TR, RU) — pour communiquer avec des patients allophones |
| **Chat** | Chat IA médical (GPT-5.4) — assistant Facharztniveau, historique persisté en Supabase, system prompt invisible |
| **MobileScan** | Permet de scanner depuis le téléphone via QR code, en envoyant le document au PC |

**Public cible :** Médecins hospitaliers en Allemagne (Assistenzärzte, Fachärzte).

**Modèle économique :** Trial 14 jours gratuit → abonnement 29€/mois (19€/mois pour les 3 premiers mois) ou 249€/an.

**Langue de l'interface :** Allemand uniquement (les médecins allemands sont les utilisateurs finaux).

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React 19 + React Router v7 + **Vite 6** |
| Styles | CSS custom (variables `--bg`, `--orange` etc.), pas de framework |
| Backend | Supabase (Auth + Postgres + Edge Functions Deno + Storage) |
| IA | OpenAI — `gpt-5.4-mini` (Scan, Brief), `gpt-5.4` (Chat), `gpt-4o-realtime` (Brief vocal) |
| Paiement | Stripe (Checkout, Billing Portal, Webhooks) |
| Deploy | Vercel (auto-deploy sur git push `main`) + Cloudflare (DNS) |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` — injectés dans `src/index.js` via `<Analytics />` et `<SpeedInsights />` |
| Monitoring | Sentry (`VITE_SENTRY_DSN`) |

**Couleur** : `#D94B0A` (orange) — **Font** : Inter (partout, via Google Fonts CDN)

## Identité visuelle

### Couleurs
- **Orange principal** : `#D94B0A` — couleur de marque, boutons CTA, accents (variable CSS `--orange`)
- **Variables CSS** : `--orange`, `--bg`, etc. (CSS custom, pas de framework)
- **Teal/bleu** : présent dans le logo et le panneau gauche de la LoginPage (fond sombre teal/brun)

### Typographie
- **Inter** — **unique font** (partout — app + landing + pages légales). Weights 400/500/600/700. Chargée via Google Fonts CDN (lien dans `index.html` + `landing_page.html`).
- **Plus de DM Sans ni Bricolage Grotesque** (suppression avril 2026 — cf. refonte sober).
- Weight 800 **proscrit** (ancien usage Bricolage hero).

### Logo
- Robot avec tête circulaire, couleur **orange `#D94B0A`**
- Deux yeux blancs avec pupilles
- Sourire
- Oreillettes sur les côtés
- **Lignes ECG/heartbeat** s'étendant horizontalement des deux côtés (référence médicale)
- Fichier : `arvis_logo.png`

### Ton & design
- Interface **sobre et professionnelle**, orientée usage médical
- Pas de framework CSS — design distinct et maîtrisé via variables CSS custom
- Langue de l'interface : **allemand uniquement**

### LoginPage
- Panneau **gauche** : features Arvis sur fond sombre teal/brun
- Panneau **droit** : formulaire (4 onglets : Anmelden / Registrieren / Forgot / Reset)
- Liens légaux en bas du panneau droit : Impressum · Datenschutz · AGB
- Google Login disponible

## Design — Refonte sober (en cours)

**Contexte** : un Oberarzt a réagi "ça a l'air fake" en voyant Arvis en aveugle. Diagnostic : aesthetic trop **"vibe coding AI"** — la refonte vise le sobre pro médical (Superhuman / Linear / Doctolib), pas la dense médicale moche (Orbis / iMedOne).

**Règle centrale** : l'orange `--orange` (`#B24E24`, terracotta désaturé) occupe **≤10% de la surface visible**. Accent uniquement (boutons, liens, focus), jamais en fond de section ou bandeau.

**Priorités de refonte** :
1. Landing page `public/landing_page.html` — premier trust signal
2. Scan — pilote du design system (en cours, cf. case study dans DESIGN.md)
3. Briefassistent
4. Chat, Bausteine, Uebersetzung, Profil

**Tous les détails** (tokens CSS complets, patterns composants, anti-patterns, règles boutons, audit page par page) sont dans **[DESIGN.md](./DESIGN.md)** — source de vérité du système visuel. À ouvrir avant toute modification de style.

## Commandes essentielles

```bash
npm run dev                                             # dev local (port 3000)
npm run build                                           # build prod → build/
npx supabase functions deploy <fn> --no-verify-jwt      # déployer une edge function
npx supabase secrets set KEY=VAL                        # ajouter un secret Supabase
git add <fichiers> && git commit -m "..." && git push   # deploy Vercel auto
```

**Supabase CLI** : installé (`v2.75.0`), projet linké (`jmanxlmzvfnhpgcxsqly`). Tu peux déployer les edge functions directement sans demander — pas besoin de confirmation.

---

## Structure des fichiers

```
arvis/
├── public/landing_page.html          ← Landing page statique (Vercel route /) — hero : 1 seul bouton CTA "Jetzt kostenlos testen" (le bouton "Demo ansehen" a été supprimé)
├── src/
│   ├── App.js                        ← Routes + PrivateRoute + PublicRoute + preloadPage()
│   ├── supabaseClient.js             ← Client Supabase + invokeEdgeFunction()
│   ├── context/AuthContext.js        ← Auth state, profil, isPro, refreshProfile()
│   ├── components/
│   │   ├── AppLayout.js              ← Sidebar (ordre : Scan, Brief, Chat, Bausteine, Übersetzung) + topbar + Bug melden modal
│   │   ├── Paywall.js                ← Bloque accès si pas Pro
│   │   ├── ErrorBoundary.js          ← Capture les erreurs React
│   │   └── ResetPasswordModal.js     ← Modale reset mot de passe
│   └── pages/
│       ├── LoginPage.js              ← Login + Register + Forgot + Reset (4 onglets)
│       ├── Scan.js                   ← Scan + OCR + KI-Analyse (Paywall) — page d'entrée après login
│       ├── MobileScan.js             ← Scan via QR code (téléphone)
│       ├── Briefassistent.js         ← Rédaction/correction IA courriers (Paywall)
│       ├── Chat.js                   ← Chat IA médical GPT-5.4 (Paywall)
│       ├── Bausteine.js              ← 1564 blocs médicaux (Paywall)
│       ├── Uebersetzung.js           ← 1585 termes 6 langues (Paywall)
│       ├── Profil.js                 ← Profil + abonnement Stripe
│       ├── AdminStats.js             ← KPIs admin (accès UUID-protégé)
│       ├── Onboarding.js             ← Flow d'onboarding (créé mais pas encore intégré dans App.js)
│       ├── NotFound.js               ← Page 404 (route `*` dans App.js)
│       ├── Impressum.js              ← Mentions légales
│       ├── Datenschutz.js            ← Politique de confidentialité (DSGVO)
│       ├── AGB.js                    ← Conditions générales
│       └── ResetPasswordPage.js      ← Page reset mot de passe (lien email)
└── supabase/functions/
    ├── ai-chat/                      ← Chat IA OpenAI
    ├── ai-whisper/                   ← Transcription audio
    ├── realtime-token/               ← Token WebSocket Realtime
    ├── create-checkout-session/      ← Stripe Checkout
    ├── create-portal-session/        ← Stripe Billing Portal
    ├── stripe-webhook/               ← Webhooks Stripe → DB
    ├── get-plan-status/              ← isPro calculé côté serveur
    ├── admin-stats/                  ← Stats KPI admin
    ├── send-bug-report/              ← Bug report → DB + email via Resend
    ├── send-notification-email/      ← Mail transactionnel (welcome, trial, abo)
    ├── check-trial-emails/           ← Cron daily : mails trial J-3 + J-0
    └── _shared/email-templates.ts    ← Templates HTML partagés (5 types)
```

## Routes

```
arvis-app.de/               → landing_page.html (statique)
arvis-app.de/login          → LoginPage.js (public)
arvis-app.de/reset-password → ResetPasswordPage.js (public)
arvis-app.de/scan           → Scan.js (PrivateRoute + Paywall) — page d'entrée après login
arvis-app.de/briefassistent → Briefassistent.js (PrivateRoute + Paywall)
arvis-app.de/chat           → Chat.js (PrivateRoute + Paywall)
arvis-app.de/bausteine      → Bausteine.js (PrivateRoute + Paywall)
arvis-app.de/uebersetzung   → Uebersetzung.js (PrivateRoute + Paywall)
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

Prix : **29€/mois** (19€/mois pour les 3 premiers mois) (`price_1TFjM6FPxR7QFABJwnMbND3B`) / **249€/an** (`price_1TFjM7FPxR7QFABJk5I1uBaC`)

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
| `welcome_email_sent` | boolean | Flag anti-doublon mail welcome |
| `trial_reminder_sent` | boolean | Flag anti-doublon mail trial J-3 |
| `trial_expired_sent` | boolean | Flag anti-doublon mail trial expiré |

### Autres tables (RLS activé sur toutes)

`bausteine`, `user_bausteine_favs`, `chat_conversations`, `folders`, `notes`, `events`, `patients`, `scan_sessions`, `stripe_events_failed`, `stripe_events_processed`, `bug_reports`

**`chat_conversations`** — historique des conversations chat IA. Colonnes : `id` (uuid PK), `user_id` (uuid FK auth.users ON DELETE CASCADE), `title` (text, 60 premiers caractères du 1er message), `messages` (jsonb, array de `{role, content}`), `created_at`, `updated_at`. RLS : `auth.uid() = user_id`. Index : `(user_id)`, `(user_id, updated_at desc)`.

**`user_bausteine_favs`** — favoris Bausteine (standards ET custom). Colonnes : `user_id` (uuid), `baustein_id` (text, ex: `"auf_001"` ou UUID custom). Clé primaire composite `(user_id, baustein_id)`. RLS : `auth.uid() = user_id`.

> Note : la colonne `is_fav` dans `bausteine` est conservée pour rétrocompatibilité mais n'est plus utilisée en écriture — migration one-shot vers `user_bausteine_favs` au premier chargement de la page Bausteine.

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
| `stripe-webhook` | Événements Stripe → DB + mails abo confirmé/annulé via Resend |
| `get-plan-status` | Retourne `{ is_pro }` calculé côté serveur |
| `admin-stats` | Stats KPI — accès restreint à `ADMIN_USER_ID` (UUID) côté serveur |
| `send-bug-report` | Bug report → sauvegarde `bug_reports` table + email via Resend à `support@arvis-app.de` |
| `send-notification-email` | Mail transactionnel (welcome, trial_reminder, trial_expired, subscription_confirmed/cancelled) |
| `check-trial-emails` | Cron daily 9h — envoie mails trial J-3 et J-0 via Resend |

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
RESEND_API_KEY=re_xxxxx
```

---

## Règle critique : invokeEdgeFunction()

**Ne jamais utiliser `supabase.functions.invoke()`** — lève des `FunctionsFetchError` aléatoires depuis `@supabase/supabase-js` v2.99.x et n'envoie pas le JWT. Toujours :
```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```
Le helper (`src/supabaseClient.js`) utilise `fetch()` natif avec `getSession()` → `Authorization: Bearer <token>` + `apikey` header. Retry automatique (max 3×, backoff exponentiel), skip sur erreurs 4xx.

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

`sessionStorage` = effacé à la fermeture de l'onglet/fenêtre. `localStorage` = persistant indéfiniment.

| Page | Clé | Stockage | Raison |
|------|-----|----------|--------|
| Scan | `arvis_scan_step`, `_panel`, `_mode`, `_limitReached` | `sessionStorage` | Restauré au retour sur l'onglet (navigation SPA) |
| Scan | `arvis_scan_aiHtml`, `_ocrText`, `_imgData` | `sessionStorage` | PHI — DSGVO Art. 9, restauré au retour |
| Scan | `arvis_scan_history` | `sessionStorage` | Historique 5 derniers scans (aiHtml + ocrText + thumbnail) |
| Scan | `arvis_scan_isAnalyzing` | `sessionStorage` | Flag analyse en cours (supprimé : auto-retry Tesseract n'existe plus) |
| Bausteine | `arvis_bausteine_selected_id` | `sessionStorage` | UI temporaire |
| Bausteine | `arvis_bausteine_migrated_v1` | `localStorage` | Flag migration one-shot |
| Uebersetzung | `arvis_ueb_search`, `_cat`, `_langs`, `_selected` | `sessionStorage` | UI temporaire |

**Restauration Scan** : tous les states Scan sont initialisés depuis sessionStorage au montage (pas de clear au mount).

**Onglets AI/OCR indépendants** : les deux modes utilisent GPT-4o Vision. Switching entre onglets affiche le résultat correspondant sans rescanner.

**Piège restauration** : l'effet `[selected]` avec `removeItem` s'exécute au premier rendu avant la restauration. Solutions : `restoredRef` (Uebersetzung) ou `_pendingSelectedId` state initialisé depuis sessionStorage (Bausteine).

---

## Sécurité — checklist avant chaque fonctionnalité

1. **HTML dynamique** → `DOMPurify.sanitize()` avant tout `dangerouslySetInnerHTML`
2. **PHI (données médicales)** → jamais en `localStorage`, toujours `sessionStorage` — `sessionStorage.clear()` au logout
3. **Mutations Supabase client** → `.eq('user_id', user.id)` sur tout `update`/`delete` (même si RLS actif)
4. **Admin check** → UUID via `ADMIN_USER_ID` secret côté serveur, jamais côté client
5. **Edge Functions** : CORS conditionnel (localhost seulement si `ALLOW_LOCALHOST=true`), erreurs censurées (`{ error: 'Internal server error' }`), JWT validé en interne
6. **Rate limiting IA** : 1M tokens/mois + 100k tokens/heure par user (colonnes `ai_tokens_used`, `ai_hourly_tokens`)
7. **Emails** : `escapeHtml()` sur tout contenu dynamique (`firstName`, `message`, `photoUrls`)
8. **CSP** : `unsafe-inline` retiré de `script-src` (gardé dans `style-src`), SRI sur PDF.js
9. **Erreurs** : toujours `logError(context, error)` dans les catch — jamais `console.error` seul
10. **Konto löschen** : edge function `delete-user-account` (Stripe + Storage + DB + Auth) — modale confirmation "LÖSCHEN" dans Profil.js
11. **Blocklist emails jetables** : `src/utils/disposable-domains.js` — 300+ domaines temp mail bloqués à l'inscription (`isDisposableEmail()` appelé dans `register()` avant `signUp`). Erreur affichée dans le formulaire LoginPage. Pour ajouter un domaine : l'ajouter au `Set` dans le fichier

---

## Paywall (`src/components/Paywall.js`)

Les onglets de la sidebar sont **toujours cliquables** — le blocage se fait uniquement dans `Paywall.js` (wrapper autour de chaque page premium). Ne jamais remettre `pointerEvents: none` dans la sidebar.

**Mein Profil n'est PAS dans la sidebar** — accessible uniquement via l'avatar en haut à droite (dropdown). Ne pas le remettre dans la sidebar, c'est redondant.

Messages selon le plan :
- `trial` expiré → "Ihre 14-tägige Testphase ist abgelaufen"
- `canceled` → "Ihr Abonnement wurde gekündigt"

Bouton "Jetzt upgraden" :
- Si `stripe_customer_id` existe → Billing Portal (réactivation)
- Sinon → Stripe Checkout (nouvel abonnement)

---

## Règles de développement

1. Modifications **chirurgicales** — ne toucher que ce qui est demandé
2. Interface en **allemand** uniquement
3. Confirmations destructives → modale UI, jamais `confirm()` natif
4. **Aucun médicament ni dose** dans les bausteine — classes thérapeutiques uniquement
5. Placeholders dans les bausteine : `[_]`
6. **Pas de branches** — toujours travailler directement sur `main`. `git push` → Vercel auto-deploy.
7. **Paramètre tokens OpenAI** : utiliser `max_completion_tokens` (pas `max_tokens`) — l'edge function `ai-chat` accepte les deux pour rétrocompatibilité (`requestedCompletionTokens ?? requestedTokens`), mais `max_completion_tokens` est le paramètre correct pour les modèles gpt-5.x. Exception : `Chat.js` envoie encore `max_tokens` (legacy, fonctionne car l'edge function normalise).
8. **Code splitting** : `React.lazy()` sur toutes les pages sauf LoginPage — `ErrorBoundary` sur les routes sensibles. **Preload au hover** : `preloadPage(path)` exporté depuis `App.js`, appelé `onMouseEnter` sur les NavLinks sidebar → le chunk est téléchargé avant le clic
9. **Offline** : bannière "Keine Internetverbindung" dans AppLayout.js
10. **Tests** : `npm test` → Vitest (jsdom), 40+ tests unitaires — CI via `.github/workflows/ci.yml`
11. **DOMPurify** : `DOMPurify.sanitize()` sur TOUT `dangerouslySetInnerHTML` sans exception — protection XSS obligatoire. Présent dans Scan.js, Chat.js, Briefassistent.js, Bausteine.js.

---

## Pièges connus

1. **CORS www** : `arvis-app.de` redirige (307) → `www.arvis-app.de`. Toutes les Edge Functions doivent être `--no-verify-jwt` + avoir `https://www.arvis-app.de` dans `ALLOWED_ORIGINS`.
2. **sed sur macOS** : corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude.
3. **Stripe client supprimé** : `create-checkout-session` vérifie et recrée le client si supprimé.
4. **Triple refresh Stripe** : au retour `?success=true`, polling 2s/20s jusqu'à `plan: pro`.
5. **Vercel rewrites vs routes** : utiliser `routes` (pas `rewrites`) pour surcharger `/`.
6. **`npx supabase db push` peut échouer** si l'historique des migrations local et remote sont désynchronisés. Solution : `npx supabase migration repair --status applied <timestamp>` pour marquer la migration comme déjà appliquée, puis réessayer. Alternative : exécuter le SQL directement dans le SQL Editor Supabase.
8. **Favicons Safari** : les SVG favicons (`<link rel="icon" type="image/svg+xml">`) ne fonctionnent pas dans Safari — aucune icône affichée. Utiliser PNG + ICO uniquement. `arvis-icon.svg` est la version bold (stroke-width:100px) — source pour régénérer les PNG via Illustrator → Export for Screens. `favicon.ico` généré via Pillow depuis icon-16/32/48.png. Fichiers actifs : `favicon.ico`, `icon-16/32/96/152/167/192/512.png`.
11. **Apple Touch Icon (iOS share sheet)** : doit être full-bleed — robot blanc sur fond orange `#D94B0A`, sans padding, 180×180px. Fichier : `public/apple-touch-icon.png`. Safari met l'icône en cache agressivement — changer le nom de fichier pour invalider le cache.
12. **Couleur orange** : `#D94B0A` est la couleur officielle Arvis (variable CSS `--orange`). Ne jamais utiliser `#e87722` — c'était une erreur. La couleur est présente dans `index.html`, `landing_page.html`, `manifest.json`, `Impressum.js`, `Datenschutz.js`, `AGB.js`.
9. **Landing page mobile — inline styles** : `public/landing_page.html` est massivement inline-stylé. Les sélecteurs CSS `div[style*="font-size:..."]` ne fonctionnent pas fiablement sur Safari. La bonne approche : ajouter une `class` aux éléments cibles, puis cibler via CSS. Pour réduire proportionnellement tout le contenu d'un mockup : `zoom: 0.75` sur le container (affecte layout + rendu, contrairement à `transform: scale`).
13. **iOS sticky hover** : le bloc `@media (hover: none)` dans `App.css` ne doit PAS cibler `button:hover` générique — ça rend les boutons invisibles sur iOS (le `:hover` reste actif après un tap). Cibler uniquement les classes spécifiques (`.btn-secondary:hover`, `.btn-action:hover`, `.btn-action-secondary:hover`, `.btn-danger:hover`).
10. **Landing page mobile — feature cards** : les containers mockup dans les feature cards ont la classe `feat-demo-wrap` → `zoom: 0.75` appliqué dans `@media (max-width: 768px)`. Le grid interne Briefassistent a la classe `brief-2cols`. Footer mobile : `.footer-links` doit avoir `position: static; transform: none;` sur mobile sinon il se superpose au logo.
14. **config.toml vs Supabase Dashboard** : `supabase/config.toml` configure les templates email en local uniquement. Pour la prod, configurer aussi dans Supabase Dashboard > Authentication > Email Templates. Templates actifs : `confirm-signup.html`, `recovery.html`, `email-change.html`.
15. **Chunk Vite introuvable sur mobile (Safari)** : après un déploiement, un téléphone avec `index.html` en cache tente de charger des chunks avec d'anciens hash → Vercel renvoie `index.html` (`text/html`) → Safari throw `TypeError: 'text/html' is not a valid JavaScript MIME type`. Fix : `window.addEventListener('vite:preloadError', () => window.location.reload())` dans `src/index.js` — rechargement automatique qui récupère le bon `index.html`.
16. **Redirect après login (PublicRoute race condition)** : `handleLogin` appelait `navigate(savedRedirect)` puis `PublicRoute` re-rendait avec `<Navigate to="/scan">` qui l'écrasait. Fix : la logique de redirection post-login est entièrement dans `PublicRoute` — il lit `redirectAfterLogin` depuis sessionStorage et redirige là, sinon `/scan`. `handleLogin` ne navigate plus du tout. Critique pour le flux QR MobileScan : scan sans auth → login → retour vers `/mobile-scan/:token`.
17. **CORS "Load failed" dans le navigateur** : si une Edge Function renvoie "Load failed" dans le navigateur mais répond correctement via curl, c'est un problème CORS — curl ignore CORS, le navigateur non. Cause typique : `apikey` manquant dans `Access-Control-Allow-Headers`. Le header correct pour toutes les fonctions est `'authorization, x-client-info, apikey, content-type'` (comme dans `get-plan-status`). Ne jamais utiliser seulement `'authorization, content-type'`.
18. **Profil "Kein Titel"** : `profile.title` est `""` (empty string) quand l'utilisateur choisit "Kein Titel". Utiliser `??` (nullish coalescing) et non `||` pour le fallback — `||` traite `""` comme falsy et remet "Dr.".
20. **Scan bouton direct (sans QR)** : le bouton "Weiter" dans Scan mobile direct (pas MobileScan QR) doit être noir `#1C1C1E` avec label "Weiter zur Anonymisierung" — même style que le scan via QR code.
21. **Screenshots propres pour vidéo promo** : utiliser **Chrome DevTools** (pas Safari — Safari étend les scroll containers et produit des captures trop longues). Méthode : clic droit sur l'élément → "Capture node screenshot". CSS critique : `.app-layout { min-height: 100vh; overflow-x: clip }` + `.result-text { overflow-x: auto; max-width: 100% }`. Ne jamais mettre `height: 100vh` sur `.app-layout` ni `overflow: hidden/clip` sur `html`/`body`.
22. **Scan — barre d'étapes supprimée** : la barre horizontale "Dokument laden → Anonymisieren → Analysieren → Ergebnis" a été supprimée — redondante (le contenu montre l'étape active). Le flow est intuitif sans elle. Ne pas la remettre.
23. **Alignement vertical des panneaux** : les panneaux de toutes les pages doivent avoir leur **bordure basse au même niveau**. Briefassistent : `.brief-panel { height: calc(100vh - 280px) }`. Scan : `#panelUpload { height: calc(100vh - 222px) }` (58px de moins car pas de `.brief-modes`). `.scan-layout { align-items: stretch }` pour que la colonne droite s'étire. Si on ajoute/supprime un élément au-dessus des panneaux → ajuster le `calc()` pour réaligner les bas.
24. **Sous-items Scan — format `* ` obligatoire** : le parseur `markdownToHtml()` dans `Scan.js` détecte les sous-items via `/^\* /` (astérisque + espace), les lignes commençant par `- ` ou `– ` sont traitées comme des items de liste plate, PAS comme sous-items sous une Diagnose/Modalité. Le SYSTEM_PROMPT doit donc imposer `* ` de façon explicite et répétée (GPT-4o a tendance à revenir à `- ` naturellement). Si les sous-items n'apparaissent plus groupés sous leur parent → vérifier que le prompt n'a pas été assoupli sur ce point.
25. **Boucle infinie dans `markdownToHtml()`** : dans la branche sous-items, toujours faire `i++` AVANT le `continue` — sinon la ligne suivante n'est jamais consommée et le parseur tourne en rond sur la même ligne jusqu'à freezer l'onglet. Bug rencontré lors de l'implémentation initiale des sous-items (commit 83b99a0).
26. **Mobile Scan/Bausteine — alignement des colonnes empilées (16/04/2026)** : sur `@media (max-width: 785px)`, `.scan-left` (padding-right:32px) et `.scan-right` (padding-left:32px + border-left) créaient un décalage à gauche en stack mobile → reset des paddings à 0 + border-left supprimée + `border-top` séparateur entre les deux colonnes empilées. Pour Bausteine ≤700px : ajout de `order:1` sur `.bausteine-left` et `order:2` sur `.bausteine-right` pour garantir liste au-dessus de preview.
27. **Bausteine — perte de saisie dans le modal d'édition (16/04/2026)** : le `useEffect` d'init de `NeuBausteinModal` dépendait de `[open, editingBaustein, categories]`. Quand `bausteine_data.js` finit de charger en arrière-plan (peut prendre plusieurs secondes), `baudataVersion` change → `allData`/`categories` recomputés → nouvelle référence → useEffect refire → `setText(editingBaustein.text)` ÉCRASE le brouillon en cours et reset tous les champs. **Fix** : dépendances → `[open, editingBaustein?.id]` (avec eslint-disable-next-line). Ne réinitialise que sur ouverture du modal OU changement de baustein édité.
28. **Briefassistent desktop — chaîne flex/grid ne propageait pas la hauteur (16/04/2026)** : la chaîne `#page-brief (flex:1)` → `.brief-layout (display:grid, flex:1)` → `.brief-panel (height:100%)` ne donnait pas une hauteur définie aux panneaux → ils restaient courts → bouton Diktieren+KI analysieren pas en bas de l'écran. **Fix** : `.brief-layout { grid-template-rows: minmax(0, 1fr) }` + `.brief-panel { height: calc(100vh - 44px) !important; min-height: calc(100vh - 44px) !important }` + action row en `position: absolute; bottom: 24px`. Sélecteurs préfixés `#page-brief` pour spécificité. Toutes les règles avec `!important` car le base CSS (line ~962) défi un `height: calc(100vh - 220px)` qu'il faut surcharger. **La topbar fait exactement 44px** — `calc(100vh - 80px)` était faux (36px de trop court), corrigé le 17/04/2026.

---

## Sentry

- **Fichier init** : `src/index.js` — DSN via `VITE_SENTRY_DSN`, `environment: import.meta.env.MODE`
- **Intégrations** : `browserTracingIntegration()` (perf, 20% sample) + `replayIntegration()` (replay vidéo sur erreur, 100%)
- **Helper** : `src/utils/logger.js` → `logError(context, error, extra)` — à utiliser dans tous les `catch`
- **Branché dans** : `supabaseClient.invokeEdgeFunction`, `Scan`, `AdminStats`, `Bausteine`, `MobileScan`, `Chat`, `Paywall`, `ErrorBoundary`
- **Ne pas utiliser** `console.error` seul dans les catch — toujours passer par `logError()`
- **Erreurs Supabase** : les objets erreur Supabase (type `{ message, details, hint, code }`) ne se sérialisent pas avec `String(error)` → produit `"[object Object]"`. `logError()` utilise `error?.message || JSON.stringify(error)` pour extraire un message lisible. Ne jamais passer directement un objet Supabase à `Sentry.captureException()` — toujours via `logError()`.

---

## Scan — Architecture Vision (GPT-4o)

**Tesseract.js a été supprimé.** Tout passe par GPT Vision (images envoyées en base64).

- **Deux modes** : KI-Analyse (analyse structurée) et OCR seul (extraction texte brut)
- **Compression** : `compressForVision(dataUrl)` — redimensionne à max 1200px wide, JPEG 0.85
- **Multi-page** : toutes les images envoyées dans un seul message `content` array (text + image_url)
- **Modèle (les deux modes)** : `gpt-5.4-mini`, `max_completion_tokens: 4000`, `temperature: 0.2` pour KI-Analyse
- **Edge function** : `ai-chat` — modèles whitelist : `gpt-5.4-mini`, `gpt-5.4`, `gpt-4o`, `gpt-4o-mini` (défaut: `gpt-5.4-mini`). Accepte content arrays avec `image_url` (base64 data URLs, max 5 MB total)
- **Coût** : ~2100 tokens/page en high-detail

## Scan KI-Analyse — System Prompt

Le prompt est dans `src/pages/Scan.js` (`const SYSTEM_PROMPT`). Structure :
- **Raisonnement interne** (5 axes, non affichés) : Medikation, Klinische Kohärenz, Dokumentation & Daten, Nachsorge & Prävention, Selbstprüfung
- **Sortie** : Zusammenfassung (### sections 1–7, médication en tableau markdown) + ### Nicht übersehen (liste plate 🔴🟡🟢)
- **Format Nicht übersehen** : `🔴 **Problemstelle** Mécanisme → Handlungsempfehlung` (2–4 phrases par item, alternatives concrètes)
- **Température** : `0.2` (déterministe, évite les oublis)
- **Modèle** : `gpt-5.4-mini`, `max_completion_tokens: 4000`
- **Tableau médication** : 3 colonnes `| Medikament (Dosis) | morgens-mittags-abends | ggf. Dauer |` — pas de colonne nachts si 0, pas de Darreichungsform (pas de "Tabletten", "retard", etc.)
- **Tri médication par classe thérapeutique** (21 catégories, ordre clinique imposé dans le prompt) : 1. Antikoagulation/TAH → 2. Betablocker → 3. Herzinsuffizienz-spez. (Entresto, Ivabradin) → 4. ACE/Sartane → 5. Andere Antihypertensiva → 6. Antiarrhythmika → 7. Diuretika → 8. Elektrolyte → 9. Gliflozine → 10. Antidiabetika → 11. Stoffwechsel-Medikation **inkl. ALLE Supplementationen** (Statine, Allopurinol, Vitamin D, B12, Folsäure, Eisen, Zink) → 12. Schilddrüse → 13. Pulmo → 14. Magen-Darm → 15. Analgetika (de la plus forte à la plus faible) → 16. Ko-Analgetika → 17. Neuro (Antiepileptika/Neuroleptika/Parkinson/Antidepressiva) → 18. Urologie → 19. Antibiotika → **médicaments non-classables** → 20. Heparine → 21. Insulin. **Aucune zwischenüberschrift, aucun groupe-header, aucune ligne vide** — un seul tableau continu trié.
- **Colonne `ggf. Dauer`** : restreinte à **pausiert / abgesetzt / durée restante** uniquement (ex: "für 5 Tage", "noch 3 Tage", "bis 18.04.2026"). **Cellule vide** dans tous les autres cas — pas de "nüchtern", pas d'indication ("H.p.-Eradikation"), pas de "wie Vormedikation", pas de Startdatum/Applikationsart.
- **Diagnosen** : reprise **verbatim** du document — aucune numérotation, aucune abréviation, aucune omission. Toutes les Diagnosen présentes doivent figurer, groupées en "Hauptdiagnose(n)" et "Weitere Diagnose(n)". Une Diagnose par ligne (ligne principale sans tiret ni bullet). Détails associés (OP-Datum, Prozedur, Verlauf, Symptômes) en **sous-items `* `** (Sternchen + espace, **jamais `- `**) directement sous la Diagnose. Les sous-items sont rendus avec indentation, puce `•`, couleur `var(--text-2)` et police plus petite — mais la ligne grise de gauche s'étend jusqu'au bas du dernier sous-item pour grouper visuellement Diagnose + détails en un seul bloc. La Diagnose principale est en **`font-weight:600`** (bold).
- **Enrichissement des Diagnosen** : pour chaque Diagnose, GPT doit **scanner tout le document** (Therapie, Verlauf, Procedere, OP-Bericht, Befunde, Bildgebung, Konsile, Medikation, Anamnèse) et rapatrier sous la Diagnose **uniquement les infos cliniquement pertinentes** qui définissent le statut, la thérapie ou la conduite à tenir. Exemples : Femurfraktur → OP-Datum + verfahren (TFNa) ; Pneumonie → Erreger + Antibiose+Dauer ; VHF → Antikoagulation+CHA₂DS₂-VASc ; OP/Z.n. → Datum+Prozedur ; Onko → Stadium+TNM+Histologie+Therapie. **EXCLU** : CRP-Verlauf, valeurs labo en série, mesures quotidiennes, Beobachtungsnotizen, Normalbefunde. Règle d'or : "*Im Zweifel WENIGER ist mehr — nur das, was ein Facharzt auf einen Blick über diese Diagnose wissen muss.*"
- **Wichtige Befunde** : structuré par **modalité** — chaque modalité sur sa propre ligne **sans tiret et sans deux-points** (Labor, Sono Abdomen, CT Thorax, Röntgen Thorax, EKG, MRT, Echokardiographie, Histologie — selon ce qui est dans le document), suivie des valeurs/findings en sous-items `* `. Les valeurs labo liées peuvent être groupées par virgules sur une même ligne (ex: `* Kreatinin 1,8 mg/dl, GFR 38 ml/min`). Rendu natif : chaque modalité = bloc plain-text-else avec bordure gauche (`padding:7px 12px, margin-top:4px`), sous-items compacts en dessous (`gap:1px, line-height:1.5, font-size:12px`) → labs visuellement serrés sous Labor, espacement normal entre Labor/Sono/CT. **Ne pas ajouter de compactage CSS global** (`inBefunde` flag) — tout le serrage vient du passage "lignes plates → sous-items".
- **Médication** : exhaustive — chaque médicament du document doit apparaître dans le tableau, même si incomplet ou lisible partiellement.
- **Copie** : `copyResult()` utilise `ClipboardItem` avec `text/html` + `text/plain` — collage dans Word conserve gras, titres, tableaux, espacement. Collage dans ORBIS/KIS reçoit le texte brut avec tableaux tab-separated. Fallback `writeText` si `ClipboardItem` non supporté
- **Word** : `downloadAsWord()` (dans `src/utils/downloadWord.js`) parse le HTML du `aiSummaryDiv` — titres en vrais Heading Word, **bold** conservé, tableaux avec bordures, listes à puces, espacement. Mode OCR/Brief = texte brut simple. **Récursion dans les wrappers `flex-column`** (blocs Diagnose + sous-items, Modalité + valeurs) : la fonction descend dans les children pour émettre chaque ligne plate ET chaque sous-item avec préfixe `- ` (via l'attribut `data-subitem="1"` posé dans `markdownToHtml()`). Sans cette récursion, les sous-items étaient perdus à l'export Word.
- **Boutons copier par section** : chaque titre `###` est suivi d'un wrapper `data-sec-body` qui englobe tout le contenu de la section, et le titre porte un petit bouton copier (`data-copy-sec`). Event delegation sur `aiSummaryDiv` : `handleSectionCopy()` récupère le wrapper via `querySelector('[data-sec-body]')`, marche le DOM avec `sectionBodyToText()` (helper qui traverse récursivement et préfixe les `data-subitem` avec `- `), et copie en `text/plain`. Permet de ne copier que Diagnosen, ou Wichtige Befunde, etc. — sans toucher au reste du résultat.

## Scan — Anonymisierung obligatoire (DSGVO)

L'étape Schwärzen est **bloquante** — `proceedToAnalysis()` refuse de lancer l'analyse tant que l'une des deux conditions n'est pas remplie :
1. Au moins UN blackout posé (sur n'importe quelle page si PDF multi-pages)
2. Checkbox cochée : *"Ich bestätige: Es gibt keine zu anonymisierenden Patientendaten auf {allen Seiten dieses Dokuments | diesem Dokument}."*

**État** : `noDataConfirmed` (boolean), reset à chaque nouveau document chargé (`loadFile()` PDF + image).

**UI** :
- Bandeau rouge en haut du panneau Anonymisieren : "Bitte alle Patientendaten schwärzen, bevor Sie fortfahren."
- Si `pdfTotal > 1` → sous-titre rouge bold majuscules : "⚠ Auf ALLEN N Seiten anwenden" (pour éviter qu'ils oublient les autres pages)
- Checkbox sous le bandeau (orange accent)
- Bouton "Analysieren" : `disabled={!canProceed}` + style gris si désactivé + tooltip "Bitte zuerst schwärzen oder bestätigen, dass keine Patientendaten vorhanden sind"
- Garde côté JS dans `proceedToAnalysis` (defense in depth) : si conditions pas remplies → `setErrorMsg(...)` et return.

**Détection blackouts toutes pages** : `blackouts.length > 0 || Object.values(blackoutsByPageRef.current).some(a => a && a.length > 0)`. La checkbox sert de trace défendable côté DSGVO en cas de litige.

## Scan — Historique de session

- **Stocké dans** `arvis_scan_history` (sessionStorage, max 5 entrées)
- **Structure** : `{ id, time, label, aiHtml, ocrText, mode, thumb }` — `thumb` = miniature JPEG 300px wide du document scanné
- **UI** : chips horizontaux au-dessus du scan-layout, visibles dès le 2e scan
- **Au clic** : restaure aiHtml + ocrText + miniature dans le panneau preview → pas de rescan nécessaire
- **Effacé** à la fermeture de l'onglet (sessionStorage)
- **Min-height résultat** : `minHeight: 900` sur le panneau résultat quand affiché (évite résultat trop court en paysage)

## Briefassistent — Korrektur Prompt

Le prompt Korrektur est dans `src/pages/Briefassistent.js` (`buildPrompt()`, mode `korrektur`). Règles clés :
- **Prose** pour Anamnese, Befunde, Bildgebung, Procedere — phrases complètes et connectées, pas de fragments
- **Liste** pour Medikation et Diagnosen
- **Medikation** : format `Wirkstoff Dosis – Schema` — pas de Darreichungsform (pas de "Tabletten", "retard", etc.), ligne vide entre chaque médicament pour l'espacement
- **Laborwerte** compacts en 1–2 phrases, valeurs + unités, **aucune interprétation**
- **Dates** gardées en format original (`02.04.` pas `02. April`)
- **Abréviations** : `KI` après médicament + dose = Kurzinfusion (pas Kontraindikation)
- **Ton** : Facharzt — concis, sachlich, pas de sur-explication (le lecteur est médecin)
- Constructions-types fournies dans le prompt : Anamnese ("stellte sich vor… berichtet über…"), Befunde ("Die Untersuchung ergab…"), Procedere ("Es erfolgte… Der Patient erhielt…")

## Briefassistent — Modèle IA

- **Modèle** : `gpt-5.4-mini` via edge function `ai-chat`
- **Paramètres** : `max_completion_tokens: 3000` pour Korrektur/Umformulierung/Zusammenfassung
- **Vocal (Diktat)** : WebSocket OpenAI Realtime `gpt-4o-realtime-preview-2024-12-17` via token from `realtime-function` edge function

## Briefassistent — Layout (renommage 16/04/2026)

- **Renommé** depuis `BriefSchreiber` → `Briefassistent` partout : fichier `src/pages/Briefassistent.js`, route `/briefassistent`, classe CSS `.btn-send-briefassistent`, labels UI ("Briefassistent" partout), landing page (`#briefassistent` anchor + h3), emails transactionnels, tests Playwright. Pas de redirect legacy car `pas de user actif`.
- **Pas de `.page-header` externe** — la title row "Briefassistent" + bouton **Zurücksetzen** vit **À L'INTÉRIEUR** du panneau gauche (`.brief-panel:first-child`), même pattern que Scan (`.scan-left`). FontSize 17.
- **Label panneau droit** : "Ergebnis" (et non "KI-Ergebnis") — empty state : "Ergebnis erscheint hier".
- **Hauteur panneau desktop** : sur `@media (min-width: 1101px)`, `.brief-panel { height: calc(100vh - 44px) !important; min-height: calc(100vh - 44px) !important; }`. Le `!important` est obligatoire car la chaîne `flex` → `grid` → `100%` ne propageait pas correctement la hauteur. **44px = hauteur exacte de la topbar** — `.brief-layout` démarre directement à 44px du viewport top, sans header intermédiaire. Voir piège #28.
- **Action row Diktieren+KI analysieren** : `position: absolute; left: 24px; right: 24px; bottom: 24px` à l'intérieur de `.brief-panel:first-child` (qui a `position: relative; padding-bottom: 80px; overflow: hidden`). Garantie d'être tout en bas du panneau peu importe le contenu du textarea.
- **Min-height textarea** : `#page-brief .brief-textarea { min-height: calc(100vh - 280px) !important }` — force le textarea à pousser le panneau en hauteur.

## Chat — KI-Assistent

- **Modèle** : `gpt-5.4` via edge function `ai-chat`, `max_tokens: 4000` (legacy — fonctionne car l'edge function normalise vers `max_completion_tokens`)
- **System prompt** : invisible, prépendé à chaque requête — rôle Facharzt, Fachsprache, pas de suggestions/offres en fin de réponse, max 300 mots pour questions ouvertes, abréviations courantes OK mais pas excessives
- **Historique** : persisté dans table `chat_conversations` (Supabase), max 18 derniers messages envoyés à l'API (limite edge function = 20 msgs)
- **Sauvegarde** : debounced 800ms après chaque réponse IA, conversation créée au 1er message
- **Conversation chips** : bandeau horizontal scrollable (flèches + drag-to-scroll pour souris), max 50 conversations chargées
- **Bouton copier** : à côté de chaque bulle (gauche pour user, droite pour assistant), visible au hover desktop, toujours visible sur mobile (`@media (hover: none)`)
- **Markdown** : `markdownToHtml()` gère #/##/###, bold, italic, inline code, bullet lists, `---` (hr), lignes vides
- **HTML** : `DOMPurify.sanitize()` sur toutes les réponses assistant
- **Layout** : `position: absolute; inset: 0` pour éviter conflit scroll avec `.main-content`
- **CSS** : classes `chat-dot`, `chat-copy-btn`, `chat-msg-row`, `chat-new-btn` dans `App.css`
- **Erreurs** : gestion spécifique limit_reached, rate_limited, session expirée dans le catch
- **Suppression conversation** : icône × sur chaque chip, supprime en Supabase avec `.eq('user_id', user.id)`

## MobileScan — UX

- Flow : QR code → scan photo(s) → **"Weiter zur Anonymisierung"** (bouton noir `#1C1C1E`) → transfert → anonymisation sur le PC → analyse
- Le bouton "Weiter" a été renommé et mis en noir pour clarifier que l'anonymisation intervient AVANT l'envoi (évite la confusion "ça va uploader directement")
- Tant que aucune photo n'est prise : bouton label caméra orange "Foto aufnehmen" → après 1+ photos : label orange outline "Weitere Seite aufnehmen" + bouton noir "Weiter zur Anonymisierung"

## Bausteine — Placeholders éditables

Trois syntaxes coexistent dans `renderPlaceholders()` (ordre des regex important) :

| Syntaxe | Comportement |
|---------|-------------|
| `[_]` ou `(_)` | **Champ libre** — clic = curseur, saisie libre |
| `(opt1 / opt2 / opt3)` | **Choix unique** — popup boutons + "Andere Option…" |
| `(opt1 + opt2 + opt3)` | **Multi-cases (NEW 16/04)** — popup checkboxes + "Übernehmen". Items joints avec `, ` dans l'ordre original. |

**Règle de discrimination** : la regex multi requiert ≥1 `+` et **interdit `/`** (`[^()/]`) → permet à GPT/aux auteurs de mélanger les deux syntaxes dans le même baustein sans conflit. Chip multi → `data-multi="1"`. État popup étendu : `{ visible, choices, x, y, multi, selected[] }`. `applyMultiPopup()` filtre `popup.choices` par `popup.selected.includes()` pour préserver l'ordre original.

**Edit modal (NeuBausteinModal)** :
- `maxWidth: 880px` (au lieu de 520) + `rows={14}` sur le textarea — confort de saisie pour longs bausteine
- **PIÈGE résolu** : les dépendances du useEffect d'init sont `[open, editingBaustein?.id]` (PAS `[open, editingBaustein, categories]`). Sinon, quand `bausteine_data.js` finit de charger en arrière-plan → `categories` recomputé (nouvelle ref) → useEffect refire → `setText(editingBaustein.text)` ÉCRASE le brouillon en cours. Voir piège #27.

**Layout** : 40/60 (liste / preview). Sur desktop, liste à `height: calc(100vh - 200px)`, panneau preview (`.bausteine-right`) à `height: calc(100vh - 140px) + overflow:hidden` avec wrapper interne `flex:1, min-height:0` → preview text scroll en interne, boutons "Kopieren" + "An Briefassistent" toujours visibles en bas.

**Boutons** : **Kopieren** (outline orange) → `getPlainText()`. **An Briefassistent** → texte brut envoyé via sessionStorage `arvis_brief_input` puis `navigate('/briefassistent')`.

**Warenkorb supprimé** — flow : sélectionner → remplir placeholders → copier.

**Mobile (≤700px)** : grid stack 1fr avec `order:1` sur left + `order:2` sur right pour garantir liste au-dessus de la preview.

## Bug melden

- **Accès** : chevron SVG ▾ à gauche de l'avatar topbar → menu dropdown → "Bug melden"
- **Modal** dans `AppLayout.js` : email (pré-rempli), textarea, upload max 5 photos / 10 MB total
- **Photos** stockées dans bucket Supabase Storage `bug-reports` (public, RLS `auth.uid()`)
- **Edge function** `send-bug-report` : sauvegarde dans table `bug_reports` + envoie email via Resend à `support@arvis-app.de`
- **Fallback** : si `RESEND_API_KEY` absent → sauvegarde DB quand même, pas d'email

## Mails automatiques transactionnels

Tous via **Resend** depuis `noreply@arvis-app.de`. Templates HTML partagés dans `_shared/email-templates.ts` (même design que `confirm-signup.html` : wrapper 560px, card blanche, CTA orange `#D94B0A`).

| Mail | Trigger | Edge function |
|------|---------|---------------|
| **Willkommen** | Inscription (`register()` dans AuthContext) | `send-notification-email` |
| **Trial J-3** | Cron daily 9h (pg_cron → pg_net) | `check-trial-emails` |
| **Trial expiré** | Même cron | `check-trial-emails` |
| **Abo bestätigt** | Stripe webhook (`plan = 'pro'`) | `stripe-webhook` |
| **Abo gekündigt** | Stripe webhook (`plan = 'canceled_pending'`) | `stripe-webhook` |

**Tracking anti-doublon** : colonnes `welcome_email_sent`, `trial_reminder_sent`, `trial_expired_sent` (boolean) sur table `users`.

**Cron** : `cron.schedule('check-trial-emails', '0 9 * * *', ...)` via pg_cron + pg_net (SQL Editor Supabase).

---

## Idées futures (backlog)

### Notaufnahme-Seite (priorité haute)

Nouvelle page dédiée aux **Assistenzärzte / Ärzte aux urgences** pour générer en un coup l'Aufnahme Orbis + une analyse clinique assistée.

**Formulaire d'entrée** :
- Sexe, âge
- Symptomatik / Beschwerden (Leitsymptom + détails)
- Anamnèse (aktuelle Anamnese, Vorerkrankungen, Medikation, Allergien, Sozialanamnese)
- Körperliche Untersuchung (par systèmes ou prose libre)
- Vitale Parameter (RR, HF, SpO₂, Temp, AF, BZ, Schmerzen NRS)
- Examens complémentaires : champs texte + **uploads photos** (Labor, EKG, Röntgen, Sono, CT)
- Medikation / Hausmedikation + donnée en Notaufnahme

**Sortie IA** (double) :
1. **Texte Orbis** prêt à copier — Aufnahmebrief court, format hospitalier allemand standard
2. **Analyse clinique** : DD (diagnostics différentiels) classés par probabilité, Procedere proposé, **"Was fehlt noch?"** — liste de ce qui n'a pas été vérifié/documenté (labos manquants, examens à compléter, red flags non adressés)

**Pourquoi** : Assistenzärzte aux urgences passent ~30% de leur temps en documentation. C'est la cible la plus douloureuse → *killer feature* pour Arvis.

### Onglets EKG et Röntgen dans Scan (priorité moyenne)

Prompts spécialisés par modalité (plutôt que le prompt Scan générique) :
- **EKG** : rythme, axe, intervalles (PQ, QRS, QT), ischémie/infarctus, blocs, hypertrophie
- **Röntgen Thorax** : infiltrats, épanchement, silhouette cardiaque, os, corps étrangers, position sondes/cathéters

Peut aussi être intégré comme sections "Befunde" dans la Notaufnahme-Seite (uploads avec analyse ciblée), évitant la duplication.

---

## Compte de test

- **Email** : amine.mabtoul@outlook.fr — **MDP** : test1144
- **URL** : https://arvis-app.de/login

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML), ne pas modifier.
