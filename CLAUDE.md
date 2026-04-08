# CLAUDE.md — Arvis
_Dernière mise à jour : 8 avril 2026 (soir)_

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
| **Scan / OCR + KI-Analyse** | Scanne un document médical (ordonnance, compte-rendu, résultats), extrait le texte via OCR, puis l'IA l'analyse et génère un résumé structuré en allemand |
| **BriefSchreiber** | Rédige ou corrige des courriers médicaux professionnels en allemand via IA (arztbrief, Überweisung, etc.) |
| **Bausteine** | Bibliothèque de 1 550 blocs de texte médicaux réutilisables, organisés par spécialité — permet d'assembler rapidement des comptes-rendus standardisés |
| **Übersetzung** | Dictionnaire médical multilingue de 1 585 termes traduits en 6 langues (DE, FR, EN, AR, TR, RU) — pour communiquer avec des patients allophones |
| **Dateien** | Gestionnaire de fichiers PDF/images — stockage, organisation, accès rapide aux documents patients |
| **Dashboard** | Vue d'ensemble : météo, agenda, gestion des patients |
| **MobileScan** | Permet de scanner depuis le téléphone via QR code, en envoyant le document au PC |

**Public cible :** Médecins hospitaliers en Allemagne (Assistenzärzte, Fachärzte).

**Modèle économique :** Trial 14 jours gratuit → abonnement 19€/mois ou 249€/an.

**Langue de l'interface :** Allemand uniquement (les médecins allemands sont les utilisateurs finaux).

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

**Couleur** : `#D94B0A` (orange) — **Fonts** : Inter + Bricolage Grotesque (titres)

## Identité visuelle

### Couleurs
- **Orange principal** : `#D94B0A` — couleur de marque, boutons CTA, accents (variable CSS `--orange`)
- **Variables CSS** : `--orange`, `--bg`, etc. (CSS custom, pas de framework)
- **Teal/bleu** : présent dans le logo et le panneau gauche de la LoginPage (fond sombre teal/brun)

### Typographie
- **Inter** — font principale, texte courant
- **Bricolage Grotesque** — titres et en-têtes

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
├── public/landing_page.html          ← Landing page statique (Vercel route /)
├── src/
│   ├── App.js                        ← Routes + PrivateRoute + PublicRoute
│   ├── supabaseClient.js             ← Client Supabase + invokeEdgeFunction()
│   ├── context/AuthContext.js        ← Auth state, profil, isPro, refreshProfile()
│   ├── components/
│   │   ├── AppLayout.js              ← Sidebar + topbar + Bug melden modal
│   │   ├── Paywall.js                ← Bloque accès si pas Pro
│   │   ├── ErrorBoundary.js          ← Capture les erreurs React
│   │   └── ResetPasswordModal.js     ← Modale reset mot de passe
│   └── pages/
│       ├── LoginPage.js              ← Login + Register + Forgot + Reset (4 onglets)
│       ├── Dashboard.js              ← Vue d'ensemble, météo, agenda, patients
│       ├── Scan.js                   ← Scan + OCR + KI-Analyse (Paywall)
│       ├── MobileScan.js             ← Scan via QR code (téléphone)
│       ├── BriefSchreiber.js         ← Rédaction/correction IA courriers (Paywall)
│       ├── Bausteine.js              ← 1550 blocs médicaux (Paywall)
│       ├── Uebersetzung.js           ← 1585 termes 6 langues (Paywall)
│       ├── Dateien.js                ← Gestionnaire fichiers (Paywall)
│       ├── Profil.js                 ← Profil + abonnement Stripe
│       ├── AdminStats.js             ← KPIs admin (accès UUID-protégé)
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
| `welcome_email_sent` | boolean | Flag anti-doublon mail welcome |
| `trial_reminder_sent` | boolean | Flag anti-doublon mail trial J-3 |
| `trial_expired_sent` | boolean | Flag anti-doublon mail trial expiré |

### Autres tables (RLS activé sur toutes)

`bausteine`, `user_bausteine_favs`, `folders`, `notes`, `events`, `patients`, `scan_sessions`, `stripe_events_failed`, `stripe_events_processed`, `bug_reports`

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

`supabase.functions.invoke()` **n'envoie PAS le JWT** et masque les vraies erreurs. Toujours :
```js
const data = await invokeEdgeFunction('nom-fonction', { param: valeur })
```
Le helper (`src/supabaseClient.js`) fait `getSession()` et passe `Authorization: Bearer <token>`. Retry automatique (max 3×, backoff exponentiel), skip sur erreurs 4xx.

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
| Scan | `arvis_scan_isAnalyzing`, `_pendingOcr` | `sessionStorage` | Flags pour auto-retry IA si onglet changé mid-scan |
| Bausteine | `arvis_bausteine_selected_id` | `sessionStorage` | UI temporaire |
| Bausteine | `arvis_bausteine_migrated_v1` | `localStorage` | Flag migration one-shot |
| Uebersetzung | `arvis_ueb_search`, `_cat`, `_langs`, `_selected` | `sessionStorage` | UI temporaire |

**Restauration Scan** : tous les states Scan sont initialisés depuis sessionStorage au montage (pas de clear au mount). Si `arvis_scan_isAnalyzing=true` au remontage ET `arvis_scan_pendingOcr` existe → l'IA repart automatiquement avec le texte OCR sauvegardé.

**Onglets AI/OCR indépendants** : en mode AI, `ocrText` est aussi sauvegardé (le texte OCR est de toute façon calculé). Switching entre onglets affiche le résultat correspondant sans rescanner.

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
8. **CSP** : `unsafe-inline` retiré de `script-src` (gardé dans `style-src`), SRI sur Tesseract.js et PDF.js
9. **Erreurs** : toujours `logError(context, error)` dans les catch — jamais `console.error` seul
10. **Konto löschen** : edge function `delete-user-account` (Stripe + Storage + DB + Auth) — modale confirmation "LÖSCHEN" dans Profil.js

---

## Paywall (`src/components/Paywall.js`)

Les onglets de la sidebar sont **toujours cliquables** — le blocage se fait uniquement dans `Paywall.js` (wrapper autour de chaque page premium). Ne jamais remettre `pointerEvents: none` dans la sidebar.

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
6. Deploy : `git push` → Vercel auto-deploy
7. **Code splitting** : `React.lazy()` sur toutes les pages sauf Dashboard et LoginPage — `ErrorBoundary` sur les routes sensibles
8. **Offline** : bannière "Keine Internetverbindung" dans AppLayout.js
9. **Tests** : `npm test` → Vitest (jsdom), 40+ tests unitaires — CI via `.github/workflows/ci.yml`

---

## Pièges connus

1. **CORS www** : `arvis-app.de` redirige (307) → `www.arvis-app.de`. Toutes les Edge Functions doivent être `--no-verify-jwt` + avoir `https://www.arvis-app.de` dans `ALLOWED_ORIGINS`.
2. **sed sur macOS** : corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude.
3. **Stripe client supprimé** : `create-checkout-session` vérifie et recrée le client si supprimé.
4. **Triple refresh Stripe** : au retour `?success=true`, polling 2s/20s jusqu'à `plan: pro`.
5. **Vercel rewrites vs routes** : utiliser `routes` (pas `rewrites`) pour surcharger `/`.
6. **`npx supabase db push` peut échouer** si l'historique des migrations local et remote sont désynchronisés. Solution : `npx supabase migration repair --status applied <timestamp>` pour marquer la migration comme déjà appliquée, puis réessayer. Alternative : exécuter le SQL directement dans le SQL Editor Supabase.
7. **Date des events Calendrier** : JS `Date.getMonth()` est 0-indexé, PostgreSQL DATE est 1-indexé. Toujours construire les clés de date avec `toDateKey(y, m0, d)` (dans Dashboard.js) qui fait `m0 + 1` et `padStart(2,'0')` → format ISO `YYYY-MM-DD`. Ne jamais stocker `getMonth()` directement.
8. **Favicons Safari** : les SVG favicons (`<link rel="icon" type="image/svg+xml">`) ne fonctionnent pas dans Safari — aucune icône affichée. Utiliser PNG + ICO uniquement. `arvis-icon.svg` est la version bold (stroke-width:100px) — source pour régénérer les PNG via Illustrator → Export for Screens. `favicon.ico` généré via Pillow depuis icon-16/32/48.png. Fichiers actifs : `favicon.ico`, `icon-16/32/96/152/167/192/512.png`.
11. **Apple Touch Icon (iOS share sheet)** : doit être full-bleed — robot blanc sur fond orange `#D94B0A`, sans padding, 180×180px. Fichier : `public/apple-touch-icon.png`. Safari met l'icône en cache agressivement — changer le nom de fichier pour invalider le cache.
12. **Couleur orange** : `#D94B0A` est la couleur officielle Arvis (variable CSS `--orange`). Ne jamais utiliser `#e87722` — c'était une erreur. La couleur est présente dans `index.html`, `landing_page.html`, `manifest.json`, `Impressum.js`, `Datenschutz.js`, `AGB.js`.
9. **Landing page mobile — inline styles** : `public/landing_page.html` est massivement inline-stylé. Les sélecteurs CSS `div[style*="font-size:..."]` ne fonctionnent pas fiablement sur Safari. La bonne approche : ajouter une `class` aux éléments cibles, puis cibler via CSS. Pour réduire proportionnellement tout le contenu d'un mockup : `zoom: 0.75` sur le container (affecte layout + rendu, contrairement à `transform: scale`).
13. **iOS sticky hover** : le bloc `@media (hover: none)` dans `App.css` ne doit PAS cibler `button:hover` générique — ça rend les boutons invisibles sur iOS (le `:hover` reste actif après un tap). Cibler uniquement les classes spécifiques (`.btn-secondary:hover`, `.btn-action:hover`, etc.).
10. **Landing page mobile — feature cards** : les containers mockup dans les feature cards ont la classe `feat-demo-wrap` → `zoom: 0.75` appliqué dans `@media (max-width: 768px)`. Le grid interne Brief Schreiber a la classe `brief-2cols`. Footer mobile : `.footer-links` doit avoir `position: static; transform: none;` sur mobile sinon il se superpose au logo.
14. **config.toml vs Supabase Dashboard** : `supabase/config.toml` configure les templates email en local uniquement. Pour la prod, configurer aussi dans Supabase Dashboard > Authentication > Email Templates. Templates actifs : `confirm-signup.html`, `recovery.html`, `email-change.html`.
15. **Chunk Vite introuvable sur mobile (Safari)** : après un déploiement, un téléphone avec `index.html` en cache tente de charger des chunks avec d'anciens hash → Vercel renvoie `index.html` (`text/html`) → Safari throw `TypeError: 'text/html' is not a valid JavaScript MIME type`. Fix : `window.addEventListener('vite:preloadError', () => window.location.reload())` dans `src/index.js` — rechargement automatique qui récupère le bon `index.html`.

---

## Sentry

- **Fichier init** : `src/index.js` — DSN via `VITE_SENTRY_DSN`, `environment: import.meta.env.MODE`
- **Intégrations** : `browserTracingIntegration()` (perf, 20% sample) + `replayIntegration()` (replay vidéo sur erreur, 100%)
- **Helper** : `src/utils/logger.js` → `logError(context, error, extra)` — à utiliser dans tous les `catch`
- **Branché dans** : `supabaseClient.invokeEdgeFunction`, `Dashboard`, `Scan`, `AdminStats`, `Dateien`, `Bausteine`, `MobileScan`, `Paywall`, `ErrorBoundary`
- **Ne pas utiliser** `console.error` seul dans les catch — toujours passer par `logError()`

---

## Scan KI-Analyse — System Prompt

Le prompt est dans `src/pages/Scan.js` (`const SYSTEM_PROMPT`). Structure :
- **Raisonnement interne** (5 axes, non affichés) : Medikation, Klinische Kohärenz, Dokumentation & Daten, Nachsorge & Prävention, Selbstprüfung
- **Sortie** : Zusammenfassung (### sections 1–7, médication en tableau markdown) + ### Nicht übersehen (liste plate 🔴🟡🟢)
- **Format Nicht übersehen** : `🔴 **Problemstelle** Mécanisme → Handlungsempfehlung` (2–4 phrases par item, alternatives concrètes)
- **Température** : `0.2` (déterministe, évite les oublis)
- **Modèle** : `gpt-4o`, `max_tokens: 4000`
- **Tableau médication** : 3 colonnes `| Medikament (Dosis) | Schema | ggf. Dauer |` — médicament et dose dans la même colonne. Le renderer `markdownToHtml()` supporte les lignes `|...|` (header skippé, données en colonnes alignées)
- **Diagnosen** : reprise **verbatim** du document — aucune numérotation, aucune abréviation, aucune omission. Toutes les Diagnosen présentes doivent figurer, groupées en "Hauptdiagnose(n)" et "Weitere Diagnose(n)". Une par ligne, sans tiret ni bullet.
- **Médication** : exhaustive — chaque médicament du document doit apparaître dans le tableau, même si incomplet ou lisible partiellement.

## Scan — Historique de session

- **Stocké dans** `arvis_scan_history` (sessionStorage, max 5 entrées)
- **Structure** : `{ id, time, label, aiHtml, ocrText, mode, thumb }` — `thumb` = miniature JPEG 300px wide du document scanné
- **UI** : chips horizontaux au-dessus des scan-steps, visibles dès le 2e scan
- **Au clic** : restaure aiHtml + ocrText + miniature dans le panneau preview → pas de rescan nécessaire
- **Effacé** à la fermeture de l'onglet (sessionStorage)

## Scan — OCR cleanOcrText

Post-traitement Tesseract dans `cleanOcrText()` :
- Pipes et antislashs supprimés (bruit de bordure)
- Symboles isolés en début de ligne supprimés
- **Puces mal reconnues** : `e `, `A `, `o ` isolés en début de ligne → convertis en `- ` (Tesseract lit souvent `•` comme `e` ou `A`)

## BriefSchreiber — Korrektur Prompt

Le prompt Korrektur est dans `src/pages/BriefSchreiber.js` (`buildPrompt()`, mode `korrektur`). Règles clés :
- **Prose** pour Anamnese, Befunde, Bildgebung, Procedere — phrases complètes et connectées, pas de fragments
- **Liste** pour Medikation et Diagnosen
- **Medikation** : format `Wirkstoff Dosis – Schema` — pas de Darreichungsform (pas de "Tabletten", "retard", etc.), ligne vide entre chaque médicament pour l'espacement
- **Laborwerte** compacts en 1–2 phrases, valeurs + unités, **aucune interprétation**
- **Dates** gardées en format original (`02.04.` pas `02. April`)
- **Abréviations** : `KI` après médicament + dose = Kurzinfusion (pas Kontraindikation)
- **Ton** : Facharzt — concis, sachlich, pas de sur-explication (le lecteur est médecin)
- Constructions-types fournies dans le prompt : Anamnese ("stellte sich vor… berichtet über…"), Befunde ("Die Untersuchung ergab…"), Procedere ("Es erfolgte… Der Patient erhielt…")

## MobileScan — UX

- Flow : QR code → scan photo(s) → **"Weiter zur Anonymisierung"** (bouton noir `#1C1C1E`) → transfert → anonymisation sur le PC → analyse
- Le bouton "Weiter" a été renommé et mis en noir pour clarifier que l'anonymisation intervient AVANT l'envoi (évite la confusion "ça va uploader directement")
- Tant que aucune photo n'est prise : bouton label caméra orange "Foto aufnehmen" → après 1+ photos : label orange outline "Weitere Seite aufnehmen" + bouton noir "Weiter zur Anonymisierung"

## Bausteine — Placeholders éditables

- Placeholders `[...]` rendus comme `<span class="ph-chip">` (même système que BriefSchreiber)
- Clic sur placeholder sans `/` → curseur remplace le chip (saisie libre)
- Clic sur placeholder avec `/` (ex: `[bejaht / verneint]`) → popup de choix + option "Andere eingeben…"
- Bouton **Kopieren** (grand, outline orange) copie le texte avec valeurs remplies via `getPlainText()`
- Bouton **An Brief Schreiber** envoie le texte brut au rédacteur IA
- Warenkorb supprimé — le flow est : sélectionner → remplir placeholders → copier
- Layout 40/60 (liste / preview)

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

## Compte de test

- **Email** : amine.mabtoul@outlook.fr — **MDP** : test1144
- **URL** : https://arvis-app.de/login

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML), ne pas modifier.
