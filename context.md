# context.md — État du projet Arvis

Dernière mise à jour : 25 mars 2026 (session 5)

## Profil du créateur
- **Amine est médecin**, pas développeur. Il a construit Arvis sans formation en coding.
- Toujours expliquer de façon simple et concrète, sans jargon technique brut.
- Utiliser des analogies médicales ou du quotidien quand c'est utile.

## Qu'est-ce qu'Arvis ?
Application SaaS de documentation médicale assistée par IA pour le personnel médical allemand (médecins, infirmiers en hôpitaux). Permet de rédiger des courriers médicaux, scanner/analyser des documents, traduire, gérer des blocs de texte réutilisables et des fichiers.

URL de production : **https://arvis-app.de**

---

## Fonctionnalités implémentées ✅

### Auth
- Inscription / Connexion email+password
- Connexion Google OAuth
- Reset password par email (flux PKCE : `/reset-password` → formulaire nouveau mot de passe → redirect `/login`)
- Emails Supabase (confirmation, reset)

### App
- **Dashboard** — Vue d'ensemble
- **Brief Schreiber** — Rédaction de courriers médicaux via IA (GPT)
- **Scan & Analyse** — Scan de documents, OCR, analyse IA avec priorités 🔴🟡🟢
- **Bausteine** — Blocs de texte réutilisables personnalisés
- **Übersetzung** — Traduction médicale multilingue
- **Dateien** — Gestion de fichiers (upload, visualisation)
- **Profil** — Informations personnelles, changement de mot de passe, gestion abonnement

### Paiement Stripe (complet)
- Stripe Checkout pour nouveaux abonnés (mensuel 19€ / annuel 249€)
- Stripe Billing Portal pour abonnés existants (changer carte, annuler)
- Webhook Stripe → mise à jour automatique DB (`plan`, `card_brand`, `card_last4`, `subscription_end_date`)
- Détection client Stripe supprimé → recréation automatique
- **Coupons auto-appliqués** : récupère dynamiquement le 1er coupon actif Stripe, filtrable par `metadata.price_id` pour cibler un prix précis
- Refresh profil automatique au retour de Stripe (`?success=true`, polling 2s/20s)
- Badge "Gekündigt · Noch X Tage verbleibend" si annulation en cours (`canceled_pending`)

### Landing page
- `public/landing_page.html` — page statique servie à `/` via `vercel.json`
- Script JS inline : si utilisateur connecté → redirect auto vers `/dashboard`
- Utilisateurs non connectés voient la landing, puis `/login` pour accéder à l'app

### Paywall
- `src/components/Paywall.js` — bloque l'accès aux pages premium si pas Pro
- Affiche bouton upgrade → Stripe Checkout ou Billing Portal selon le cas

---

## Architecture technique

### Frontend
```
src/
├── App.js                    # Routes + PrivateRoute + PublicRoute
├── supabaseClient.js         # Client Supabase + invokeEdgeFunction()
├── context/
│   └── AuthContext.js        # user, profile, isPro, getPlanInfo(), refreshProfile()
├── components/
│   ├── AppLayout.js          # Sidebar + Topbar
│   ├── Paywall.js            # Garde d'accès premium
│   └── ErrorBoundary.js
├── pages/
│   ├── LoginPage.js
│   ├── ResetPasswordPage.js
│   ├── Dashboard.js
│   ├── Scan.js
│   ├── BriefSchreiber.js
│   ├── Bausteine.js
│   ├── Uebersetzung.js
│   ├── Dateien.js
│   ├── Profil.js
│   └── MobileScan.js
public/
└── landing_page.html         # Landing page statique
vercel.json                   # Route / → landing_page.html
```

### Edge Functions Supabase
| Fonction | JWT | Rôle |
|----------|-----|------|
| `create-checkout-session` | no-verify | Crée session Stripe Checkout |
| `create-portal-session` | no-verify | Ouvre Billing Portal |
| `stripe-webhook` | no-verify | Événements Stripe → DB |
| `ai-chat` | verify | Chat IA (OpenAI) |
| `ai-whisper` | verify | Transcription audio |
| `realtime-token` | verify | Token Supabase Realtime |

### Base de données (table `users`)
Colonnes clés : `id`, `email`, `first_name`, `last_name`, `title`, `clinic`, `plan`, `trial_started_at`, `stripe_customer_id`, `subscription_end_date`, `card_brand`, `card_last4`, `avatar_url`

---

## État des plans

| `plan` | `isPro` | Affichage Profil |
|--------|---------|-----------------|
| `trial` (daysLeft > 0) | ✅ | Badge vert "Trial · Noch X Tage" |
| `trial` (daysLeft = 0) | ❌ | Badge rouge "Abgelaufen" → Paywall |
| `pro` | ✅ | Badge vert "Aktiv" |
| `canceled_pending` | ✅ | Badge ambre "Gekündigt · Noch X Tage" |
| `canceled` | ❌ | Badge rouge → Paywall |

---

## Fait en session 2 (22 mars 2026) ✅
- **Sidebar logout** : le footer sidebar ne déconnecte plus accidentellement — avatar/nom → `/profil`, icône seule → logout
- **Profil mobile** : panels empilés portrait (Infos → Billing → Password) via `.profil-layout` class
- **CSS cleanup** : règles mortes `body.menu-open` supprimées, box-shadow corrigé sur `.app-layout.menu-open`
- **Bausteine mobile** : sélecteurs fragiles `#page-bausteine > div > div` remplacés par `.bausteine-left` / `.bausteine-right`
- **MobileScan multi-photos** : prise de plusieurs pages une par une, upload immédiat, bouton "Weitere Seite" + "Fertig", assemblage PDF côté PC via `pdf-lib`
- **Normalisation EXIF** : toutes les photos mobiles passent par canvas avant PDF → orientation portrait garantie
- **Scan.js multi-photos mobile direct** : bouton "Foto aufnehmen" sur téléphone accumule les pages dans un overlay avant d'envoyer
- **Redirect post-login** : après login, redirection vers l'URL d'origine (fix QR code → login → retour MobileScan)

## Fait en session 3 (23 mars 2026) ✅
- **Audit complet** du projet : sécurité, UX, qualité du code
- **Fix XSS** dans `Dateien.js` : ajout de `sanitizeHtml()` avant injection dans `innerHTML`
- **Fix `canceled_pending`** : les 3 edge functions IA (`ai-chat`, `ai-whisper`, `realtime-token`) reconnaissent maintenant ce plan comme Pro jusqu'à `subscription_end_date`
- **Fix HTTP status** dans `create-portal-session` : erreur retourne maintenant 400 au lieu de 200
- **Fix CORS** : toutes les edge functions remplacent `*` par une whitelist `arvis-app.de` + `localhost:3000`
- **Commentaire WebSocket** dans `BriefSchreiber.js` : documente pourquoi le token éphémère est dans le subprotocol (contrainte OpenAI)

## Compte de test
- **Email** : amine.mabtoul@outlook.fr
- **Mot de passe** : test1144
- URL : https://arvis-app.de/login

---

## Fait en session 4-5 (25 mars 2026) ✅

### Typographie
- **+2px sur toutes les font-sizes** de l'app (App.css + tous les .js inline styles)
- Patterns couverts : `font-size: Xpx` (CSS), `fontSize: X` et `fontSize:X` (JS inline styles sans espace)

### AppLayout / Topbar
- **Centrage "Arvis"** dans la topbar quand sidebar ouverte : `.topbar-center-icon` fixé avec `max-width:0; overflow:hidden` pour ne pas occuper d'espace invisible

### Bausteine
- Ratio des colonnes ajusté à **40/60** (liste de blocs / éditeur)

### Landing page — Mockups
- Agrandissement des cards mockup PC (features + section scan + section brief schreiber)
- Card Translate : labels `Fachbegriff` / `Українська` ne se chevauchent plus (`width:85px;flex-shrink:0`)
- Card Brief Schreiber : boutons Kopieren + Word à largeur égale
- Section Brief Schreiber : boutons Kopieren (orange) + Word (bleu) ajoutés dans le mockup
- Curseur clignotant supprimé de la card Brief Schreiber

### Landing page — Autres
- Nav header : couleur des liens = couleur "Arvis" (`var(--text)`)
- Bouton "Kopieren · An Brief Schreiber" : orange plein sans `opacity:0.6`
- Card Scan : saut de ligne entre `—` et `KI-Analyse`
- Dashboard mockup topbar : logo maison SVG → `arvis-icon.svg`
- Bouton copy scan : fond orange plein + texte blanc (plus de ghost button)

---

## Fait en session 6 (26 mars 2026) ✅

### Audit & corrections de bugs
- **Audit complet** du projet : sécurité, performance, UX, code qualité
- **Fix XSS** dans `BriefSchreiber.js` : `sanitizeHtml()` ajouté avant injection `innerHTML` (contenu localStorage)
- **Fix polling Stripe** dans `Profil.js` : réduit de 20s → 10s (5 tentatives), message `showToast` si timeout
- **Fix `window._calClickedDate`** dans `Dashboard.js` : supprimé, remplacé par le state React déjà en place
- **Fix fallback `window._begriffe`** dans `Uebersetzung.js` : message d'erreur rouge après 8s si données non chargées
- **Fix topbar mobile** (`App.css`) : logo sorti de la sidebar masqué (`display:none`), `topbar-center-icon` forcé visible → logo + "Arvis" centrés comme desktop sidebar fermée

### Nettoyage code
- **Variables inutilisées supprimées** : `mediaRef`, `chunksRef` (BriefSchreiber), `DEFAULT_PATIENTS` (Dashboard), `logout`, `displayName` (Profil), `showToast`, `copyAll`, `toast`/`setToast` (Uebersetzung)
- **Regex `\[` inutile** corrigée dans `renderPlaceholders` (BriefSchreiber)
- **`window._calClickedDate`** et 2 références `window.xxx` supprimées de Dashboard.js
- **`console.error` contextualisé** : préfixe `[NomFichier]` ajouté dans AuthContext, Bausteine, Dateien, Dashboard, AppLayout, BriefSchreiber, Scan

### Nouvelles fonctionnalités
- **Page 404** (`src/pages/NotFound.js`) : "Seite nicht gefunden", bouton retour dashboard, route catch-all `*`
- **Page stats admin** (`src/pages/AdminStats.js`) : accessible à `/admin/stats` (protégée par email admin), affiche total utilisateurs, nouveaux cette semaine, taux de conversion, répartition par plan
- **`.env.example`** créé avec les variables Stripe documentées
- **`aria-labels`** ajoutés sur 7 boutons icônes (sidebar toggle, zoom, copier, supprimer événement…)
- **Tests unitaires** (`src/__tests__/planLogic.test.js`) : 26 tests couvrant toute la logique trial/pro/canceled_pending/canceled
- **Templates email allemand** (`supabase/templates/`) : `confirm-signup.html` + `recovery.html` avec logo Arvis, couleurs brand, entités HTML pour caractères spéciaux — implantés dans Supabase Dashboard
- **Sentry intégré** : `@sentry/react` installé, init dans `src/index.js`, `ErrorBoundary` capture les erreurs React, helper `src/utils/logger.js` → activer en prod via `REACT_APP_SENTRY_DSN` dans Vercel

---

## Fait en session 7 (26 mars 2026) ✅

### ESLint — nettoyage complet (0 warnings en build)
- **Bausteine.js** : supprimé `useCallback` inutilisé, supprimé `escHtml` inutilisée, corrigé 2 escapes inutiles (`\.` `\/`), ajouté `categories` dans deps useEffect, remplacé `dataReady` par `baudataVersion` (trigger correct pour `window.BAUSTEINE_DATA`), nettoyé deps `useMemo`
- **Dateien.js** : supprimé `useCallback` et `genId` inutilisés, commentaire `eslint-disable` sur useEffect intentionnellement vide, fix `no-loop-func` dans breadcrumb via `const currentPathId`
- **Scan.js** : supprimé `useCallback` inutilisé, supprimé état `qrToken` (jamais lu), corrigé 4 `\/` inutiles dans les regex de `cleanOcrText`
- **LoginPage.js** : remplacé 4 `<a href="#">` par `<button type="button">` stylés (fix accessibilité `jsx-a11y/anchor-is-valid`)

### Autres
- **Tab title** : landing page `<title>` simplifié à `Arvis` (supprimé le sous-titre)
- **Sentry** : DSN ajouté sur Vercel (`REACT_APP_SENTRY_DSN`), alertes email testées et confirmées ✅

### Sécurité & Build (Vite)
- **Supabase RLS** : policies ajoutées et activées sur `scan_sessions` et `users` (toutes les tables sont désormais protégées).
- **Security Headers** : ajout de `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, et `Permissions-Policy` dans `vercel.json`.
- **Migration Vite 6** : remplacement complet de Create React App (`react-scripts`) par Vite. Build 10x plus rapide et **0 vulnérabilités**. Variables d'environnement migrées de `REACT_APP_` vers `VITE_`.

---

## Ce qui reste à faire / améliorations possibles
- Tests automatisés d'intégration (Cypress/Playwright pour flows complets)
- Analytics avancées (feature usage, coûts OpenAI)
