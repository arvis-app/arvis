# CONTEXTE PROJET — Arvis
_Dernière mise à jour : 29 mars 2026_

---

## Le projet

**Arvis** — SaaS pour médecins hospitaliers allemands (anciennement MedAssist).

- **GitHub** : `https://github.com/arvis-app/arvis` (ancien : `amiinem7/arvis`)
Assistant IA personnel pour la documentation médicale. Outil strictement personnel — pas de partage entre collègues. Pas de stockage direct de données patients identifiants. Chaque médecin accède uniquement à son propre contenu.

- **URL production** : `arvis-app.de`
- **Stack** : React 19 + React Router v7 (Vite 6), Supabase (Auth + Postgres + Edge Functions Deno + Storage), Stripe (paiements), Vercel (deploy), Cloudflare (DNS + protection réseau)
- **Couleur principale** : Orange `#e87722` — Font : Inter + Bricolage Grotesque (titres)
- **Utilisateur** : médecin non-technique, parle français à Claude

---

## Architecture technique

```
arvis/
├── public/
│   └── landing_page.html       ← Landing page statique (Vercel route /)
├── src/
│   ├── App.js                  ← Routes React + PrivateRoute + PublicRoute
│   ├── supabaseClient.js       ← Client Supabase + invokeEdgeFunction() helper
│   ├── context/
│   │   └── AuthContext.js      ← Auth state, profil, isPro, getPlanInfo(), refreshProfile()
│   ├── components/
│   │   ├── AppLayout.js        ← Sidebar + topbar de l'app
│   │   ├── Paywall.js          ← Bloque l'accès si pas Pro
│   │   ├── ErrorBoundary.js
│   │   └── ResetPasswordModal.js
│   └── pages/
│       ├── LoginPage.js        ← Login + Register + Forgot + Reset (4 onglets)
│       ├── Dashboard.js
│       ├── Scan.js             ← Scan + OCR + KI (PrivateRoute + Paywall)
│       ├── BriefSchreiber.js   ← Correction IA briefs (PrivateRoute + Paywall)
│       ├── Bausteine.js        ← 1550 bausteine (PrivateRoute + Paywall)
│       ├── Uebersetzung.js     ← 1585 termes 6 langues (PrivateRoute + Paywall)
│       ├── Dateien.js          ← Gestionnaire fichiers (PrivateRoute + Paywall)
│       ├── MobileScan.js       ← Scan mobile
│       ├── Profil.js           ← Profil + abonnement Stripe
│       ├── Impressum.js        ← Page légale (§5 TMG)
│       ├── Datenschutz.js      ← Datenschutzerklärung complète (DSGVO + e-recht24 fusionné)
│       ├── AGB.js              ← Conditions générales
│       └── ResetPasswordPage.js
└── supabase/
    └── functions/
        ├── ai-chat/            ← Chat IA (verify_jwt: true)
        ├── ai-whisper/         ← Transcription audio (verify_jwt: true)
        ├── create-checkout-session/ ← Stripe Checkout (--no-verify-jwt)
        ├── create-portal-session/   ← Stripe Billing Portal (--no-verify-jwt)
        ├── stripe-webhook/          ← Webhooks Stripe (--no-verify-jwt)
        └── realtime-token/          ← Token Realtime
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
arvis-app.de/impressum      → Impressum.js (public)
arvis-app.de/datenschutz    → Datenschutz.js (public)
arvis-app.de/agb            → AGB.js (public)
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

---

## Table `users` (Supabase)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | = auth.users.id |
| `plan` | text | `trial`, `pro`, `canceled_pending`, `canceled` |
| `trial_started_at` | timestamptz | Début du trial |
| `stripe_customer_id` | text | ID client Stripe |
| `subscription_end_date` | timestamptz | Date fin abo (si canceled_pending) |
| `card_brand` | text | `visa`, `mastercard`, `paypal`, `sepa`... |
| `card_last4` | text | 4 derniers chiffres |

---

## Règle critique : Edge Functions JWT

`supabase.functions.invoke()` v2.99.2 **n'envoie PAS le JWT automatiquement**.
Toujours utiliser `invokeEdgeFunction()` depuis `src/supabaseClient.js`.

---

## Pages légales (état actuel — Mars 2026)

### Impressum (`/impressum`)
- Conforme § 5 TMG
- Adresse : Amine Mabtoul, Klinik für Geriatrische Rehabilitation, Burgstall 9, 72160 Horb am Neckar
- Contact : hello@arvis-app.de / +49 152 29231538
- Sections : Anbieter, Kontakt, Verantwortlich für den Inhalt, Berufsrechtliche Angaben, Haftung, Urheberrecht

### Datenschutzerklärung (`/datenschutz`)
**Version fusionnée e-recht24 + spécifique Arvis** (13 sections) :
1. Datenschutz auf einen Blick
2. Verantwortlicher (avec téléphone)
3. Hosting (Vercel Inc. + AVV)
4. Erhobene Daten & Verarbeitungszwecke (tableau + note Art. 9 DSGVO données médicales)
5. Server-Log-Dateien
6. Cookies (§ 25 TDDDG)
7. Kontaktaufnahme (formulaire + email/tel)
8. Drittanbieter (Supabase, Stripe, OpenAI, Vercel — avec AVV pour chacun)
9. Speicherdauer
10. Ihre Rechte (Art. 15-21 DSGVO)
11. Widerspruchsrecht Art. 21 **EN MAJUSCULES** (légalement obligatoire)
12. Sicherheit (TLS/HTTPS)
13. Widerspruch Werbe-E-Mails + Google Fonts

### AGB (`/agb`)
- Conditions générales existantes

---

## LoginPage — structure

- Panneau gauche : features Arvis sur fond sombre teal/brun
- Panneau droit : formulaire (4 onglets : Anmelden / Registrieren / Forgot / Reset)
- **Liens légaux** : Impressum · Datenschutz · AGB en bas du panneau droit (pas de barre séparée)
- Google Login disponible

---

## Logo Arvis (Mars 2026)

- Robot avec tête circulaire, gradient teal (#0ED0DC) → bleu (#0A52BA) vertical
- Deux yeux blancs avec pupilles (sans visière noire)
- Sourire
- Oreillettes sur les côtés
- Lignes ECG/heartbeat s'étendant horizontalement des deux côtés
- Format PNG généré via Python/Pillow
- Fichier : `arvis_logo.png`

---

## Données incluses

### Bausteine
- **1550 bausteine** médicaux dans `BAUSTEINE_DATA`
- Champs : `id`, `kategorie`, `titel`, `text`, `keywords`
- Zéro médicament ni dose — classes thérapeutiques uniquement
- Placeholders : `[_]`

### Begriffe
- **1585 termes** médicaux multilingues
- 6 langues : DE Fachbegriff, DE Allgemein, FR, EN, ES + Catégorie

---

## Règles de développement

1. **Modifications chirurgicales uniquement** — ne toucher que ce qui est demandé
2. Tout le texte de l'interface en **allemand**
3. Couleur principale : `#e87722` (orange)
4. Interface sobre et professionnelle, orientée usage médical
5. **Aucun médicament ni dose dans les bausteine**
6. Placeholders : `[_]`
7. Confirmations destructives : toujours via modale UI, jamais `confirm()` natif
8. Deploy : `git push` → Vercel auto-deploy
9. `sed` sur macOS corrompt les gros fichiers — toujours utiliser l'outil Edit de Claude

---

## Ce qui reste à faire

### En cours / prioritaire
- [ ] Tester le flow Stripe complet en production

### Améliorations fonctionnelles
- [ ] Édition des bausteine custom (en plus de la suppression)
- [ ] Persistance favoris/custom côté serveur (Supabase)
- [ ] Notifications push mobile pour déclencher scan depuis PC

### Infrastructure future
- [ ] App mobile React Native
- [ ] Projet séparé futur : plateforme FSP/KP pour médecins étrangers

---

## Comment démarrer une nouvelle conversation

1. Ouvrir `/Users/Amine/arvis` dans l'agent IA
2. Ce fichier `context.md` + `CLAUDE.md` sont déjà dans le projet
3. Décrire la modification souhaitée

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML, ne pas modifier)


# context.md — État du projet Arvis

Dernière mise à jour : 27 mars 2026

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
- Changement de mot de passe depuis le profil (vérifie l'ancien MDP au préalable)
- Changement d'adresse e-mail depuis le profil (envoi d'emails de confirmation sur ancienne + nouvelle adresse via Supabase Auth)
- Templates d'emails personnalisés (Confirmation, Reset Password, Changement d'E-mail) injectés dans Supabase.

### App
- **Dashboard** — Vue d'ensemble, météo/date, compteurs rapides, widget agenda, widget patients
- **Brief Schreiber** — Rédaction de courriers médicaux via IA (GPT), dictée vocale (Whisper)
- **Scan & Analyse** — Scan de documents (Mobile/Local), outils de caviardage (Schwärzen) intégrés dans le flux mobile QR (pinch-to-zoom, pan, crop manuel), OCR pur ou analyse IA structurée 🔴🟡🟢
- **Bausteine** — Blocs de texte médicaux réutilisables (1550+), avec personnalisation, favoris et recherche éclair
- **Übersetzung** — Traduction médicale multilingue (Fachbegriffe vs Allgemeinsprache) en 6 langues (FR, EN, ES, RU, UK)
- **Dateien** — Gestion de fichiers (upload PDFs, images), arborescence avec dossiers, filtres récents/favoris, preview direct
- **Profil** — Informations personnelles, photo (avatar), changement de mot de passe, changement d'e-mail, gestion abonnement Stripe

### Paiement Stripe (complet)
- Stripe Checkout pour nouveaux abonnés (mensuel 19€ / annuel 249€)
- Stripe Billing Portal pour abonnés existants (changer carte, annuler)
- Webhook Stripe → mise à jour automatique DB (`plan`, `card_brand`, `card_last4`, `subscription_end_date`)
- Détection client Stripe supprimé → recréation automatique
- **Coupons auto-appliqués** : récupère dynamiquement le 1er coupon actif Stripe, filtrable par `metadata.price_id`
- Refresh profil automatique au retour de Stripe (`?success=true`, polling 2s/10s)
- Badges d'alerte pour les forfaits : Trial, Actif, Annulé en attente (`canceled_pending`), Expiré

### Landing page
- `public/landing_page.html` — page de présentation (design Premium Vercel-like) servie à `/` via configuration par défaut.
- Routing : boutons d'actions redirigent proprement vers le routeur React (`/login`).
- Composants Visuels : mockups animés, fausse UI téléphone pour le scanner, tab-bars, sections Prix / DSGVO / How-it-works.

### Paywall
- `src/components/Paywall.js` — bloque l'accès aux pages premium si pas Pro
- Affiche bouton upgrade → Stripe Checkout ou Billing Portal

---

## Architecture technique

### Frontend
- **Framework** : React 19 + React Router 7 + Vite 6
- **Styles** : CSS custom (variables `--bg`, `--orange`, etc.) sans framework externe pour un design distinct
- **Build** : Vite 6 (0 vulnérabilités, build < 10s) = cible de sortie configurée sur `build/` (pour compatibilité avec les paramètres de projet Vercel existants)
- **Monitoring** : Sentry activé en prod (via VITE_SENTRY_DSN)

### Edge Functions Supabase (Backend/IA)
| Fonction | JWT | Rôle |
|----------|-----|------|
| `create-checkout-session` | no-verify | Crée session Stripe Checkout |
| `create-portal-session` | no-verify | Ouvre Billing Portal |
| `stripe-webhook` | no-verify | Événements Stripe → DB (erreurs DB loggées dans `stripe_events_failed`) |
| `ai-chat` | verify | Chat IA (OpenAI) pour l'analyse des scans et la rédaction |
| `ai-whisper` | verify | Transcription audio asynchrone |
| `realtime-token` | verify | Token Supabase Realtime (WebSocket pour l'IA en streaming) |
| `admin-stats` | no-verify | Stats admin (vérification email admin **côté serveur**) |
| `get-plan-status` | no-verify | Retourne `is_pro` calculé **côté serveur** (non manipulable client) |

### Base de données (RLS activé sur toutes les tables)
Colonnes clés `users` : `id`, `email`, `first_name`, `last_name`, `title`, `plan`, `trial_started_at`, `stripe_customer_id`, `subscription_end_date`, `card_brand`, `card_last4`, `avatar_url`, `clinic`, `ai_tokens_used`, `ai_tokens_reset_at`.
Tables protégées par RLS (`auth.uid() = user_id` ou `auth.uid() = id`) : `users`, `bausteine`, `folders`, `notes`, `events`, `patients`, `scan_sessions`, `stripe_events_failed`.

---

## Mises à jour récentes (Sessions 6 & 7 - Mars 2026) ✅

### 1. Tolérance Zéro sur les warnings (ESLint & Audits)
- Nettoyage rigoureux de tout le code : 0 erreurs, 0 avertissements.
- Hooks `useEffect` et `useMemo` stabilisés par des triggers logiques (ex: compteur `baudataVersion`) plutôt que des états asynchrones instables.
- Remplacement des balises `<a>` mortes par des `<button>` sémantiques.
- `npm audit fix` exécuté ; vulnérabilités bloquantes de *Create React App* éliminées via la migration Vite.

### 2. Migration vers Vite 6 🚀
- Suppression de l'ancien `react-scripts`.
- Configuration de `vite.config.js` (+ esbuild pour compatibilité JSX dans `.js`).
- Temps de build drastiquement réduit (de ~45s à ~6s).
- Variables d'environnement renommées de `REACT_APP_` vers `VITE_` sur le code local ET sur Vercel.

### 3. Fonctions Avancées et Sécurité 🔒
- **RLS Systématique** : Toutes les règles Supabase RLS (Row Level Security) ont été vérifiées, supprimées puis réécrites pour forcer l'usage exclusif de `user_id = auth.uid()`.
- **Scan Sessions** : RLS spécifique implémenté pour les codes QR, autorisant la lecture soit par les tokens applicatifs (l'application mobile est non authentifiée initialement).
- **HTTP Headers Vercel** (Anti-Clickjacking) : Implémentation de `X-Frame-Options: DENY`, `Permissions-Policy`, etc., dans `vercel.json`.
- **Changement d'Email** : Suppression de l'ancien champ mort "Klinik" dans la vue Profil, remplacé par une vraie gestion du changement d'adresse E-mail (avec appel direct à `supabase.auth.updateUser` et UI avertissant des envois d'emails de validation).
- Template `email-change.html` codé en HTML inline-styles injecté manuellement.
- Boutons "Anmelden" sur la landing page corrigés pour pointer vers `/login` et ainsi invoquer la vérification de session automatique du Routeur React.

### 4. Admin & Sentry 📊
- Implémentation globale d'`@sentry/react` et capture intelligente des erreurs.
- Page d'administration `AdminStats.js` conçue pour le suivi des KPI d'Arvis (Conversion, utilisateurs actifs), protégée par une condition simple sur l'email administrateur.

---

## Mises à jour récentes (Session 8 — 27 mars 2026) ✅

### 1. Budget cap OpenAI par utilisateur
- Colonne `ai_tokens_used` (integer, default 0) et `ai_tokens_reset_at` (timestamptz) ajoutées à la table `users`.
- `ai-chat` Edge Function : limite à **1 000 000 tokens/mois** par utilisateur (~400 actions/mois, coût ~$5 à Arvis).
- Reset automatique au 1er du mois (UTC). Si quota dépassé : HTTP 429 avec `{ error: "limit_reached" }`.
- Après chaque appel OpenAI réussi : `ai_tokens_used` incrémenté de `response.usage.total_tokens`.

### 2. Affichage des coûts IA dans AdminStats
- Nouvelle section **"KI-Kosten (geschätzt)"** dans `/admin/stats`.
- Top 10 utilisateurs par tokens consommés ce mois, coût estimé (0.000002 €/token), total.
- Ligne en orange si utilisation > 80% du quota.

### 3. Gestion du quota côté frontend
- `BriefSchreiber.js` et `Scan.js` : si réponse 429 `limit_reached`, affiche un bandeau informatif :
  *"Ihr monatliches KI-Kontingent ist erschöpft. Es wird am 1. des nächsten Monats erneuert."*
- Pas de bouton Upgrade ni d'appel à `create-portal-session` depuis ces composants.

### 4. Google OAuth — création automatique du profil
- `AuthContext.loadProfile` : si aucun profil trouvé pour l'user (cas Google OAuth), crée automatiquement l'entrée dans `users` depuis les métadonnées Google (`email`, `given_name`, `family_name`).
- Plan `trial` assigné automatiquement, `trial_started_at` initialisé.

### 5. Champ Krankenhaus dans Profil
- Champ **"Krankenhaus"** ajouté dans `Profil.js` sous le champ email.
- Sauvegardé dans `users.clinic`. La sidebar affichait déjà `profile?.clinic` — connexion automatique.

### 6. Tests Playwright (infrastructure prête)
- `@playwright/test` installé, `playwright.config.ts` créé (port 3000, headless, 0 retries).
- `tests/critical-flow.spec.ts` : 3 tests (inscription trial, Paywall /briefschreiber, accessibilité /bausteine + /uebersetzung).
- `data-testid="paywall"` et `data-testid="paywall-upgrade-btn"` ajoutés à `Paywall.js`.
- `data-testid="plan-badge"` ajouté dans `Profil.js`.
- Script `"test:e2e": "playwright test"` dans `package.json`.

### 7. Onboarding post-inscription (désactivé pour l'instant)
- `src/pages/Onboarding.js` créé (stepper 3 étapes, en allemand, sans mockups).
- Route `/onboarding` et redirect depuis `PrivateRoute` **commentées** — prêtes à réactiver.

---

## Mises à jour récentes (Session 5 — 25 mars 2026) ✅

### Schwärzen intégré dans le flux mobile QR (`MobileScan.js`)

Le caviardage (Schwärzen) était uniquement disponible dans le flux desktop (`Scan.js`). Il est maintenant entièrement intégré dans le flux mobile (scan via QR code sur téléphone).

**Fonctionnement du flux complet :**
1. L'utilisateur scanne le QR code depuis son téléphone
2. Le téléphone prend la photo et l'envoie via `MobileScan.js`
3. L'image s'affiche dans un canvas interactif avec les outils de caviardage
4. L'utilisateur peut caviarder les zones sensibles **avant** d'envoyer l'image à l'IA
5. L'image caviardée est envoyée pour OCR ou analyse

**Améliorations UI apportées :**
- **Pinch-to-zoom** : zoom tactile sur l'image avec 2 doigts (touch events natifs)
- **Pan limité** : déplacement de l'image dans le canvas sans sortir des bords
- **Fond card** : l'image s'affiche dans un conteneur avec fond distinct, shadow, border-radius — visuellement séparé du reste de l'interface
- **Bannière** : bandeau explicatif en haut de l'outil ("Caviardez les zones sensibles avant analyse")
- **Boutons** : actions Schwärzen / Annuler / Envoyer regroupés, styles cohérents avec le reste de l'app
- **Scroll** : le canvas est scrollable verticalement si l'image est haute
- **Hover mobile** : états hover adaptés au touch (`:active` au lieu de `:hover`) pour feedback tactile immédiat

---

## Mises à jour récentes (Session 9 — 27 mars 2026) ✅

### Corrections de sécurité critiques

#### 1. Protection admin côté serveur
- Nouvelle Edge Function `admin-stats` : vérifie le JWT, compare l'email admin **côté serveur** (service role). Un non-admin reçoit 403 depuis Supabase, indépendamment de tout JS client.
- `AdminStats.js` reécrit : n'interroge plus Supabase directement, appelle uniquement `invokeEdgeFunction('admin-stats', {})`.

#### 2. `isPro` calculé côté serveur
- Nouvelle Edge Function `get-plan-status` : lit `plan`, `trial_started_at`, `subscription_end_date` avec service role, retourne `{ is_pro: boolean }` calculé par le serveur.
- `AuthContext.js` : après chargement du profil, appelle `get-plan-status` et utilise le résultat serveur. Fallback local conservateur si l'edge function est indisponible (évite de bloquer les utilisateurs Pro).

#### 3. Stripe webhook résilient
- Chaque mise à jour DB dans son propre `try/catch`. Stripe reçoit toujours 200 après vérification de signature.
- Sur erreur DB : événement stocké dans `stripe_events_failed` pour traitement manuel.
- Nouvelle table `stripe_events_failed` (`event_id`, `event_type`, `customer_id`, `error_message`, `event_data`, `created_at`) — RLS activé, accessible uniquement via service role.

#### 4. RLS sur la table `users`
- Migration `20260327010000_rls_users.sql` : RLS activé sur `public.users`.
- Policies : SELECT/INSERT/UPDATE restreints à `auth.uid() = id`. Pas de DELETE.
- Tout utilisateur authentifié ne peut plus lire les données (email, `stripe_customer_id`, tokens IA) des autres utilisateurs.

---

## Mises à jour récentes (Session 10 — 27 mars 2026) ✅

### Migration repo GitHub & nettoyage général

#### 1. Nouveau repository GitHub
- Ancien : `https://github.com/amiinem7/arvis`
- Nouveau : `https://github.com/arvis-app/arvis`
- Remote Git local mis à jour : `git remote set-url origin https://github.com/arvis-app/arvis.git`
- Vercel reconnecté au nouveau repo (Settings → Git) → auto-deploy fonctionnel.

#### 2. Nettoyage des résidus Create React App (CRA)
- `CONTEXTE_Arvis.md` fusionné dans `context.md` puis supprimé.
- `README.md` entièrement réécrit (supprimé le contenu CRA, remplacé par doc Arvis/Vite).
- `package.json` : supprimé `eslintConfig: { extends: ["react-app"] }` et `browserslist` (inutiles avec Vite).
- `dompurify` réinstallé (`npm install dompurify`) — était dans `package.json` mais absent de `node_modules`.

#### 3. Build de validation
- `npm run build` → ✅ 573 modules, 8.5s, 0 erreurs, 0 vulnérabilités.

---

## Mises à jour récentes (Session 11 — 28 mars 2026) ✅

### Passage Stripe sandbox → Live

#### 1. Nouvelles clés Stripe Live
- `VITE_STRIPE_PUBLISHABLE_KEY` → `pk_live_...` (mis à jour dans `.env` local + Vercel)
- `VITE_STRIPE_PRICE_MONTHLY` → `price_1TFjM6FPxR7QFABJwnMbND3B` (live)
- `VITE_STRIPE_PRICE_YEARLY` → `price_1TFjM7FPxR7QFABJk5I1uBaC` (live)
- `STRIPE_SECRET_KEY` → `sk_live_...` (mis à jour dans secrets Supabase)
- `STRIPE_WEBHOOK_SECRET` → `whsec_live_...` (mis à jour dans secrets Supabase)

#### 2. Nouveau webhook Stripe Live créé
- URL : `https://jmanxlmzvfnhpgcxsqly.supabase.co/functions/v1/stripe-webhook`
- 6 events configurés : `customer.subscription.updated`, `customer.subscription.created`, `customer.subscription.deleted`, `payment_method.attached`, `setup_intent.succeeded`, `customer.updated`

#### 3. Correction sécurité — email admin hardcodé
- `admin-stats/index.ts` : supprimé le fallback `|| 'amine.mabtoul@outlook.fr'`
- Secret `ADMIN_EMAIL=admin@arvis-app.de` défini dans Supabase via `npx supabase secrets set`

---

## Ce qui reste à faire / améliorations possibles
- Activer l'onboarding quand les visuels seront prêts (réactiver import + route + redirect dans App.js).
- Lancer les tests Playwright en CI (ajouter `TEST_TRIAL_EMAIL` / `TEST_TRIAL_PASSWORD` dans les secrets).
- Affinage des prompts système IA (si les médecins font des retours sur la qualité de rédaction).

---

## Mises à jour récentes (Session 12 — 29 mars 2026) ✅

### Audit de sécurité complet — toutes les vulnérabilités corrigées

#### Frontend
- **H1** `vercel.json` : permission microphone `microphone=()` → `microphone=(self)` (dictée cassée en prod)
- **H2** `AuthContext.js` : `isPro` calculé côté serveur via `get-plan-status` ; fallback local depuis données DB si edge function indisponible (la sécurité réelle est dans les edge functions IA)
- **H4** `Profil.js` : avatar uploadé dans Supabase Storage (`avatars/{userId}/avatar.ext`) au lieu de base64 en DB
- **C4** `Scan.js` : DOMPurify.sanitize() sur le HTML retourné par l'IA
- **C5** `Scan.js` : supprimé `window._lastOcrText` (données patient sur objet global)
- **C6** `AuthContext.js` : validation same-origin sur le redirect OAuth (open redirect corrigé)
- **M1** `Scan.js`, `BriefSchreiber.js`, `Bausteine.js` : localStorage → sessionStorage pour les données médicales temporaires
- **M2** `Profil.js` : mot de passe minimum 6 → 12 caractères
- **M4** `Dateien.js` : SVG exclu des types d'images acceptés, DOMPurify sur les icônes SVG
- **H5** `vercel.json` : Content-Security-Policy ajouté (script/style/connect/frame/img/media/worker-src)

#### Edge Functions
- **H3** : CORS `*` → `https://arvis-app.de` sur toutes les fonctions (admin-stats, get-plan-status, ai-chat, etc.)
- **H7** : parsing Bearer sécurisé sur toutes les fonctions (`startsWith('Bearer ')` + `slice(7)`)
- **H8** `ai-chat` : allowlist modèles OpenAI côté serveur (`gpt-4o`, `gpt-4o-mini`)
- **C1** `create-checkout-session`, `create-portal-session` : origin et return_url hardcodés
- **C2** `ai-chat` : incrément tokens atomique via RPC PostgreSQL `increment_ai_tokens()` (race condition éliminée)
- **C3** `create-checkout-session` : price ID validé contre allowlist env vars
- **H7c** `ai-whisper` : validation fichier (instanceof File, 25MB max, MIME allowlist)
- **M5** : `canceled_pending` fail-closed sur ai-chat, ai-whisper, realtime-token

#### Base de données (migrations appliquées)
- `20260329000001` : fonction SQL `increment_ai_tokens(p_user_id, p_tokens)` — SECURITY DEFINER, atomique
- `20260329000002` : bucket `avatars` (public, 2MB, JPEG/PNG/WebP) + RLS par owner
- `20260329000003` : RLS `scan-images` — INSERT validé contre scan_sessions (token + status waiting + non expiré)

#### Bug post-lancement corrigés (30 mars 2026)
- **Déconnexion automatique** : `invokeEdgeFunction` appelait `refreshSession()` qui déclenchait un `SIGNED_OUT` en cas d'échec → remplacé par `getSession()` (lecture session en mémoire, sans réseau)
- **Paywall sur trial actif** : CORS incomplet dans `get-plan-status` (manquait `x-client-info`, `apikey`) + catch trop agressif (`setIsPro(false)`) → CORS corrigé + fallback local `computeLocalIsPro()` depuis données DB déjà chargées

#### Risque résiduel documenté (accepté)
- Token WebSocket OpenAI Realtime dans subprotocol WebSocket — proxy Edge Function non faisable sans latence inacceptable. Mitigations : token éphémère TTL ~60s, généré uniquement pour Pro authentifiés.

---

## Audit de sécurité & qualité (27 mars 2026)

### 🔴 CRITIQUE

1. ✅ **`supabaseClient.js`** — ~~Clé Supabase anon hardcodée dans le code source.~~ **Réglé** : clé déjà configurée comme variable d'environnement dans Vercel. (Note : la clé `anon` Supabase est publique par nature — elle est conçue pour être utilisée côté client et ne donne accès qu'aux données autorisées par le RLS.)

2. ✅ **`AdminStats.js`** — ~~Protection admin côté client uniquement.~~ **Réglé le 27/03/2026** : Edge Function `admin-stats` créée. Vérification email admin côté serveur via JWT + service role. Un non-admin reçoit 403 depuis le serveur. `AdminStats.js` n'interroge plus Supabase directement.

3. ✅ **`AuthContext.js` + `Paywall.js`** — ~~`isPro` calculé côté client.~~ **Réglé le 27/03/2026** : Edge Function `get-plan-status` créée. `isPro` est désormais retourné par le serveur (JWT vérifié + lecture DB service role). Fallback local conservateur si l'edge function est indisponible.

4. ✅ **`stripe-webhook`** — ~~Stripe reçoit un 400 sur erreur DB.~~ **Réglé le 27/03/2026** : chaque mise à jour DB dans un `try/catch` individuel. Sur erreur DB : événement inséré dans `stripe_events_failed` (nouvelle table) + Stripe reçoit toujours 200.

### 🟡 IMPORTANT

5. ✅ **`BriefSchreiber.js`** — ~~`sanitizeHtml()` maison ne bloque pas XSS.~~ **Réglé le 27/03/2026** : remplacé par `DOMPurify.sanitize()` (package `dompurify` installé). Bloque `<svg onload>`, `<img onerror>` et toutes les formes XSS connues.

6. ✅ **`Profil.js:107`** — ~~Closure stale sur `planInfo`.~~ **Réglé le 27/03/2026** : `isProRef` (useRef) toujours à jour via `useEffect([isPro])`. Le polling lit `isProRef.current` (valeur serveur actuelle). Max tentatives : 5→10 (20s total).

7. ✅ **`AuthContext.js`** — ~~OAuth vers `window.location.origin` dynamique.~~ **Réglé le 27/03/2026** : `redirectTo` fixé à `'https://arvis-app.de'`.

8. ✅ **`MobileScan.js`** — ~~Token QR réutilisable.~~ **Réglé le 27/03/2026** : validation en deux temps — au montage (status=waiting + non expiré) et dans `handleSend()` avant upload (race condition). États `already_used` et `expired` avec messages en allemand.

9. ⚠️ **`BriefSchreiber.js`** — Token OpenAI Realtime dans le subprotocol WebSocket. **Risque résiduel documenté** : proxy Edge Function impossible sans latence inacceptable pour la dictée temps réel. Mitigations en place : token éphémère TTL ~60s, généré uniquement pour Pro authentifiés, session mono-usage.

10. ✅ **`AdminStats.js:6`** — ~~Email admin hardcodé visible sur GitHub.~~ **Réglé le 28/03/2026** : fallback supprimé, secret `ADMIN_EMAIL=admin@arvis-app.de` défini dans Supabase.

11. ✅ **Table `users`** — ~~Pas de RLS sur `users`.~~ **Réglé le 27/03/2026** : migration `20260327010000_rls_users.sql` appliquée. RLS activé + policies SELECT/INSERT/UPDATE (`auth.uid() = id`). Pas de DELETE policy (suppression de compte non exposée côté client).

### 🟢 MINEUR

- `console.error()` partout au lieu de Sentry → erreurs silencieuses en prod
- Polling Profil sans `isMounted` guard → memory leak dans cas limite
- `renderPlaceholders` limite 80 chars silencieuse (UX confus si placeholder long)
- `Scan.js` monolithique (1054 lignes) — refactoriser en composants à terme
- localStorage sans namespace par `user_id` → collision possible en dev multi-users
- Pas de ESLint / Prettier configuré
- ~~`Permissions-Policy` dans `vercel.json` pourrait bloquer le micro~~ ✅ corrigé (Session 12)
- ~~Pas de CSP~~ ✅ ajouté (Session 12)

### Priorités recommandées (état au 29/03/2026)
**Tout réglé.** Risque résiduel accepté : Token WebSocket OpenAI Realtime (point 9) — documenté, proxy non faisable sans impact UX.