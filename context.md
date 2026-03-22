# context.md — État du projet Arvis

Dernière mise à jour : 22 mars 2026 (session 2)

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

## Ce qui reste à faire / améliorations possibles
- Personnalisation des emails Supabase en allemand
- Tests automatisés
- Page d'erreur 404 personnalisée
- Analytics (combien d'utilisateurs, conversions trial→pro)
