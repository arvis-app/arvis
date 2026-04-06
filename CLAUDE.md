# CLAUDE.md — Arvis
_Dernière mise à jour : 6 avril 2026_

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
    └── send-bug-report/             ← Bug report → DB + email via Resend
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
| `stripe-webhook` | Événements Stripe → DB, idempotency via `stripe_events_processed` |
| `get-plan-status` | Retourne `{ is_pro }` calculé côté serveur |
| `admin-stats` | Stats KPI — accès restreint à `ADMIN_USER_ID` (UUID) côté serveur |
| `send-bug-report` | Bug report → sauvegarde `bug_reports` table + email via Resend à `support@arvis-app.de` |

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

`sessionStorage` = effacé à la fermeture de l'onglet/fenêtre. `localStorage` = persistant indéfiniment.

| Page | Clé | Stockage | Raison |
|------|-----|----------|--------|
| Scan | `arvis_scan_step`, `_panel`, `_mode`, `_limitReached` | `sessionStorage` | UI temporaire — ne doit pas persister entre sessions |
| Scan | `arvis_scan_aiHtml`, `_ocrText`, `_imgData` | `sessionStorage` | PHI — DSGVO Art. 9 |
| Bausteine | `arvis_bausteine_basket`, `_selected_id` | `sessionStorage` | UI temporaire |
| Bausteine | `arvis_bausteine_migrated_v1` | `localStorage` | Flag migration one-shot |
| Uebersetzung | `arvis_ueb_search`, `_cat`, `_langs`, `_selected` | `sessionStorage` | UI temporaire |

**Piège restauration** : l'effet `[selected]` avec `removeItem` s'exécute au premier rendu avant la restauration. Solutions : `restoredRef` (Uebersetzung) ou `_pendingSelectedId` state initialisé depuis sessionStorage (Bausteine).

---

## Sécurité — checklist avant chaque fonctionnalité

1. **HTML dynamique** → `DOMPurify.sanitize()` avant tout `dangerouslySetInnerHTML`
2. **PHI (données médicales)** → jamais en `localStorage`, toujours `sessionStorage`
3. **Mutations Supabase client** → `.eq('user_id', user.id)` sur tout `update`/`delete` (même si RLS actif)
4. **Admin check** → UUID via `ADMIN_USER_ID` secret côté serveur, jamais côté client

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

---

## Scan KI-Analyse — System Prompt

Le prompt est dans `src/pages/Scan.js` (`const SYSTEM_PROMPT`). Structure :
- **Raisonnement interne** (5 axes, non affichés) : Medikation, Klinische Kohärenz, Dokumentation & Daten, Nachsorge & Prävention, Selbstprüfung
- **Sortie** : Zusammenfassung (### sections 1–7, médication en tableau markdown) + ### Nicht übersehen (liste plate 🔴🟡🟢)
- **Format Nicht übersehen** : `🔴 **Problemstelle** Mécanisme → Handlungsempfehlung` (2–4 phrases par item, alternatives concrètes)
- **Température** : `0.2` (déterministe, évite les oublis)
- **Modèle** : `gpt-4o`, `max_tokens: 4000`
- **Tableau médication** : le renderer `markdownToHtml()` supporte les lignes `|...|` (header skippé, données en colonnes alignées)

## Bug melden

- **Accès** : chevron SVG ▾ à gauche de l'avatar topbar → menu dropdown → "Bug melden"
- **Modal** dans `AppLayout.js` : email (pré-rempli), textarea, upload max 5 photos / 10 MB total
- **Photos** stockées dans bucket Supabase Storage `bug-reports` (public, RLS `auth.uid()`)
- **Edge function** `send-bug-report` : sauvegarde dans table `bug_reports` + envoie email via Resend à `support@arvis-app.de`
- **Fallback** : si `RESEND_API_KEY` absent → sauvegarde DB quand même, pas d'email

---

## Ce qui reste à faire

_(rien pour l'instant)_

---

## Compte de test

- **Email** : amine.mabtoul@outlook.fr — **MDP** : test1144
- **URL** : https://arvis-app.de/login

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML), ne pas modifier.
