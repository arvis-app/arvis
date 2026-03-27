# Arvis

Assistant IA pour la documentation médicale — SaaS pour médecins hospitaliers allemands.

🔗 Production : [arvis-app.de](https://arvis-app.de)  
📦 Repository : [github.com/arvis-app/arvis](https://github.com/arvis-app/arvis)

---

## Stack technique

- **Frontend** : React 19 + React Router 7 + Vite 6
- **Backend** : Supabase (Auth, Postgres, Edge Functions Deno, Storage)
- **Paiements** : Stripe (Checkout + Billing Portal + Webhooks)
- **Deploy** : Vercel (auto-deploy via `git push`)
- **Monitoring** : Sentry

---

## Démarrage local

```bash
npm install
npm run dev
```

L'app tourne sur [http://localhost:5173](http://localhost:5173)

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement Vite |
| `npm run build` | Build de production (dossier `build/`) |
| `npm run preview` | Prévisualise le build de production |
| `npm run test:e2e` | Lance les tests Playwright |

---

## Variables d'environnement

Créer un fichier `.env` à la racine (voir `.env.example`) :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...
VITE_SENTRY_DSN=...
```

---

## Deploy

Un `git push` sur `main` déclenche automatiquement un déploiement Vercel.

> ⚠️ `/Users/Amine/Documents/Arvis/` = backup uniquement (ancien prototype HTML, ne pas modifier)
