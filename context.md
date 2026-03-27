# context.md — État du projet Arvis

Dernière mise à jour : 27 mars 2026 (session 9)

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
- **Scan & Analyse** — Scan de documents (Mobile/Local), outils de caviardage (Schwärzen), OCR pur ou analyse IA structurée 🔴🟡🟢
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
- **Build** : Vite (remplace CRA, 0 vulnérabilités, build < 10s) = cible de sortie configurée sur `build/` (pour compatibilité avec les paramètres de projet Vercel existants)
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

## Ce qui reste à faire / améliorations possibles
- Activer l'onboarding quand les visuels seront prêts (réactiver import + route + redirect dans App.js).
- Lancer les tests Playwright en CI (ajouter `TEST_TRIAL_EMAIL` / `TEST_TRIAL_PASSWORD` dans les secrets).
- Affinage des prompts système IA (si les médecins font des retours sur la qualité de rédaction).

---

## Audit de sécurité & qualité (27 mars 2026)

### 🔴 CRITIQUE

1. ✅ **`supabaseClient.js`** — ~~Clé Supabase anon hardcodée dans le code source.~~ **Réglé** : clé déjà configurée comme variable d'environnement dans Vercel. (Note : la clé `anon` Supabase est publique par nature — elle est conçue pour être utilisée côté client et ne donne accès qu'aux données autorisées par le RLS.)

2. ✅ **`AdminStats.js`** — ~~Protection admin côté client uniquement.~~ **Réglé le 27/03/2026** : Edge Function `admin-stats` créée. Vérification email admin côté serveur via JWT + service role. Un non-admin reçoit 403 depuis le serveur. `AdminStats.js` n'interroge plus Supabase directement.

3. ✅ **`AuthContext.js` + `Paywall.js`** — ~~`isPro` calculé côté client.~~ **Réglé le 27/03/2026** : Edge Function `get-plan-status` créée. `isPro` est désormais retourné par le serveur (JWT vérifié + lecture DB service role). Fallback local conservateur si l'edge function est indisponible.

4. ✅ **`stripe-webhook`** — ~~Stripe reçoit un 400 sur erreur DB.~~ **Réglé le 27/03/2026** : chaque mise à jour DB dans un `try/catch` individuel. Sur erreur DB : événement inséré dans `stripe_events_failed` (nouvelle table) + Stripe reçoit toujours 200.

### 🟡 IMPORTANT

5. **`BriefSchreiber.js`** — `sanitizeHtml()` maison ne bloque pas `<svg onload>`, `<img onerror>` → XSS partielle possible. Remplacer par DOMPurify.

6. **`Profil.js:107`** — Polling Stripe post-paiement avec **closure stale** sur `planInfo` → s'arrête après 10s même si Pro pas encore détecté. Augmenter à 20 tentatives et corriger la closure.

7. **`AuthContext.js:139`** — Google OAuth redirige vers `window.location.origin` (dynamique) au lieu de `https://arvis-app.de` (fixe). Risque de session hijacking si domaine compromis.

8. **`Scan.js`** — Token QR code non invalidé après usage → réutilisable jusqu'à expiration. Ajouter `status: 'used'` après le premier upload et rejeter si `status !== 'waiting'`.

9. **`BriefSchreiber.js`** — Token OpenAI Realtime transmis dans le subprotocol WebSocket (interceptable sur réseau public). Risque limité car TTL ~60s.

10. ⚠️ **`AdminStats.js:6`** — Email admin partiellement atténué : `admin-stats/index.ts` utilise `Deno.env.get('ADMIN_EMAIL') || 'amine.mabtoul@outlook.fr'` — le fallback hardcodé reste visible sur GitHub. **Fix restant** : supprimer le fallback et s'assurer que le secret `ADMIN_EMAIL` est défini dans Supabase (`npx supabase secrets set ADMIN_EMAIL=...`).

11. ✅ **Table `users`** — ~~Pas de RLS sur `users`.~~ **Réglé le 27/03/2026** : migration `20260327010000_rls_users.sql` appliquée. RLS activé + policies SELECT/INSERT/UPDATE (`auth.uid() = id`). Pas de DELETE policy (suppression de compte non exposée côté client).

### 🟢 MINEUR

- `console.error()` partout au lieu de Sentry → erreurs silencieuses en prod
- Polling Profil sans `isMounted` guard → memory leak dans cas limite
- `renderPlaceholders` limite 80 chars silencieuse (UX confus si placeholder long)
- `Scan.js` monolithique (1054 lignes) — refactoriser en composants à terme
- localStorage sans namespace par `user_id` → collision possible en dev multi-users
- Pas de ESLint / Prettier configuré
- `Permissions-Policy` dans `vercel.json` pourrait bloquer le micro de la dictée vocale — à tester

### Priorités recommandées (état au 27/03/2026)
**Immédiat** : ~~RLS sur `users`~~ ✅ · ~~Clé Supabase en env var~~ ✅ · Closure stale polling Stripe (point 6) · Supprimer le fallback email hardcodé dans `admin-stats/index.ts` (point 10)
**Court terme** : ~~Protection admin serveur~~ ✅ · DOMPurify (point 5) · OAuth URL fixe (point 7) · Token QR invalidation (point 8)
