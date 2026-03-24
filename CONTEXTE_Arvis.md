# CONTEXTE PROJET — Arvis
_À coller au début d'une nouvelle conversation Claude_

---

## Le projet

**Arvis** — SaaS pour médecins hospitaliers allemands (anciennement MedAssist).
Assistant IA personnel pour la documentation médicale. Outil strictement personnel — pas de partage entre collègues. Pas de stockage direct de données patients identifiants. Chaque médecin accède uniquement à son propre contenu.

- **URL production** : `arvis-app.de`
- **Stack** : React 19 + React Router v7 (CRA), Supabase (Auth + Postgres + Edge Functions Deno + Storage), Stripe (paiements), Vercel (deploy)
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
- [ ] Ajouter le logo `arvis_logo.png` dans l'app et la landing page

### Améliorations fonctionnelles
- [ ] Édition des bausteine custom (en plus de la suppression)
- [ ] Persistance favoris/custom côté serveur (Supabase)
- [ ] Notifications push mobile pour déclencher scan depuis PC

### Infrastructure future
- [ ] App mobile React Native
- [ ] Projet séparé futur : plateforme FSP/KP pour médecins étrangers

---

## Comment démarrer une nouvelle conversation

1. Ouvrir `/Users/Amine/arvis` dans Claude Code (projet React en production)
2. Ce fichier `CONTEXTE_Arvis.md` + `CLAUDE.md` sont déjà dans le projet
3. Décrire la modification souhaitée

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML, ne pas modifier)
