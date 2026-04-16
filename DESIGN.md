# DESIGN.md — Arvis Sober

Système visuel d'Arvis. Pour le contexte projet voir [CLAUDE.md](./CLAUDE.md).

_Dernière mise à jour : 15 avril 2026_

---

## Pourquoi

Un Oberarzt a réagi **"ça a l'air fake"** en voyant Arvis en aveugle. Diagnostic : aesthetic trop "vibe coding AI" (default SaaS startup généré par IA) — ni le goût d'Amine, ni les codes de la médecine hospitalière allemande qui inspireraient confiance.

**Cible** : sober pro médical — dense, refined, type **Superhuman / Linear / Doctolib**. **PAS** dense moche type Orbis / iMedOne.

**Règle centrale** : l'orange `--orange` occupe **≤10% de la surface visible**. Accent uniquement (boutons, liens, focus states, highlights), **jamais** en fond de section, bandeau ou hero.

---

## Tokens CSS

Source de vérité : `src/App.css` `:root`. Ne jamais hardcoder une couleur — toujours passer par la variable.

### Couleurs

```css
:root {
  /* Accent — Terracotta médical, désaturé ≈30% vs #D94B0A historique */
  --orange:            #B24E24;   /* brand accent principal */
  --orange-light:      #C4552A;   /* hover léger / variations */
  --orange-dark:       #953F18;   /* hover button, pressed */
  --orange-ghost:      #F8EDE5;   /* fond subtil (selected row, focus ring) */
  --orange-ghost-dark: #B24E2418; /* overlay ~9% opacity */

  /* Sémantique */
  --red:     #C13A2B;
  --error:   #C13A2B;
  --success: #3A8B5C;
  --warning: #B87E1E;

  /* Fonds — warm-tinted, jamais blanc pur */
  --bg:   #F6F4F1;   /* fond principal (blanc cassé chaud) */
  --bg-2: #FDFCFA;   /* surfaces élevées (inputs, zones claires) */
  --bg-3: #F0EDE7;   /* zones en retrait, hover subtil */
  --card: #FDFCFA;   /* = --bg-2 (déprécié : pas de nouvelles cards) */

  /* Texte — jamais noir pur */
  --text:   #1A1815; /* texte principal */
  --text-2: #55514B; /* texte secondaire, labels, helpers */
  --text-3: #8A8680; /* tertiaire — section labels uppercase */

  /* Bordures */
  --border: #E5E2DA; /* 1px solid — séparateurs fins */

  /* Élévation — bordure fine, pas ombre décorative */
  --shadow:    0 0 0 1px rgba(0,0,0,0.04);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.08);
}
```

**Notes** :
- `#D94B0A` (orange historique) reste dans `public/landing_page.html`, favicons, manifest, pages légales — c'est l'identité marque externe. Dans l'app body on utilise `--orange` (désaturé) pour tenir la règle des 10%.
- Tous les gris sont **chauds** (tinted beige/brun), pas neutres type macOS Big Sur.
- Pas de gris sur fond coloré : sur `--bg-2` ou `--orange-ghost`, utiliser `--text-2` (même teinte de base, densité variable).

### Typographie

```css
body { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
/* 'Bricolage Grotesque' réservé à la hero de public/landing_page.html */
```

Échelle pratique (pas de `clamp()` agressifs, pas de "fluid type") :

| Usage | Size | Weight | Notes |
|---|---|---|---|
| Section label uppercase | 10.5px | 600 | `text-transform:uppercase; letter-spacing:0.12em; color:var(--text-3)` |
| Meta, helpers, footer | 12px | 400 | `color:var(--text-3)` |
| Body, boutons, onglets | 13px | 500 | Default app |
| Inputs, textes denses | 14px | 500 | |
| Titres de panneau | 15px | 600 | |
| Titres de page | 20–24px | 600 | |
| Hero landing (exception) | 48–72px | 600 | Bricolage Grotesque, uniquement `landing_page.html` |

**Hiérarchie par weight + taille + espace**, jamais par couleur saturée ou décoration. Pas de weight 700 agressif.

### Spacing & radius

- **Radius** : `4–6px` partout. **Jamais** 12–16px (c'est consumer, pas institutionnel).
- **Padding boutons** : `8px 14px` (default), `6px 12px` (dense), `11px 16px` (exception LoginPage étroite).
- **Gap** : `8px` dense (row de boutons), `16px` normal, `24–32px` entre sections.
- **Pas de rythme uniforme** — varier l'espace selon la densité logique du contenu. Monotone = vibe coding.

### Ombres & effets

- **Aucune box-shadow décorative.** Pas de glow orange, pas de drop-shadow sous cards (parce qu'il n'y a plus de cards).
- Exception tolérée : focus state `box-shadow: 0 0 0 3px var(--orange-ghost)` sur inputs.
- **Pas de gradients**, pas de glassmorphism, pas de blur décoratif, pas de sparklines.

---

## Anti-patterns (à bannir partout)

Ces éléments sont la signature "AI slop 2024-2025". Si tu en trouves un dans Arvis, c'est un bug :

| ❌ Pattern vibe coding | ✅ Remplacer par |
|---|---|
| `box-shadow: 0 4px 20px rgba(0,0,0,.08)` sur cards | Pas de card — border-bottom 1px sur row, ou juste padding |
| `border-radius: 12–16px` | `4–6px` |
| `padding: 24px 32px` uniforme partout | Rythme varié selon densité |
| Orange `#D94B0A`/`#B24E24` en **fond** de section | Orange en accent uniquement (bouton, lien, focus, border-left) |
| `font-weight: 700` générique | `500/600` + hiérarchie par taille et espace |
| `box-shadow: 0 4px 20px rgba(217,75,10,...)` sur bouton orange | Pas de glow, jamais |
| `transform: translateY(-1px)` au hover | Transition couleur seulement, pas de transform |
| `width: 100%` ou `flex: 1` sur bouton | `align-self: flex-start`, largeur intrinsèque |
| Grid symétrique de 3-4 cards aérées | Contenu dense, listes, séparateurs fins |
| Gradients texte sur titres / metrics | Couleur unie `var(--text)` |
| Emojis décoratifs dans l'UI | Aucun (exception : 🔴🟡🟢 dans Scan pour les alertes médicales) |
| Icônes rondes au-dessus de chaque titre | Titre seul |

---

## Patterns composants

### Boutons — règle auto-width

**Règle globale** : largeur intrinsèque (auto-width basé sur padding + contenu). **Jamais** `width:100%` ni `flex:1` pour stretcher.

```css
.btn-action {
  padding: 8px 14px;
  border-radius: 5px;
  border: 1px solid var(--orange);
  background: var(--orange);
  color: white;
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
}
.btn-action:hover {
  background: var(--orange-dark);
  border-color: var(--orange-dark);
  /* jamais transform, jamais box-shadow */
}

.btn-action-secondary {
  /* même squelette, version neutre : */
  background: var(--bg-2);
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-action-secondary:hover { background: var(--bg-3); }
```

**Rows de boutons** : `display:flex; gap:8px; justify-content:flex-start` (ou `center` si symétrique). **Jamais** `flex:1` sur chaque enfant.

**Dans un container flex-column** : `align-self:flex-start` pour laisser le bouton à sa largeur naturelle.

#### Exceptions tolérées (full-width OK)

- **LoginPage** (`.btn-submit`, `.btn-google`) : formulaire centré étroit (max-width 400px), full-width visuellement équilibré — mais **sans glow ni transform**, dimensionnement max 14/500, radius 5px.
- **Modales mobiles** : boutons sticky bottom full-width OK (pattern iOS natif attendu par l'utilisateur).
- **Paywall CTA plein écran** : si c'est une page dédiée avec 1 seule action primaire.

Quand c'est ambigu → **auto-width**. Le risque c'est la surprise visuelle du full-width par défaut (= vibe coding), pas l'inverse.

### Panneaux (content-forward, zéro card)

Pattern remplaçant les cards à drop-shadow :

```css
.panel {
  background: transparent;
  border: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}
.panel-header {
  padding: 0 0 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
```

**Séparer deux colonnes côte à côte** : `border-left: 1px solid var(--border)` sur la 2e colonne + padding interne. Pas de gap entre les colonnes — la ligne fait le boulot visuel.

### Onglets segmentés (underline actif)

Pour choisir un mode (KI-Analyse / OCR, Korrektur / Umformulierung…) :

```css
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
}
.tab-btn {
  padding: 9px 0;
  margin-right: 28px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  cursor: pointer;
}
.tab-btn.active {
  border-bottom-color: var(--orange);
  color: var(--text);
  font-weight: 600;
}
```

Pas de box, pas de fond, pas de radius. Juste une ligne qui glisse.

---

## Case studies

### /scan — refactor sober (✅ commit `d315435`)

**Avant** — 3 panneaux en grid avec drop-shadow, border-radius 12px, padding 24px 32px. Trois cards distinctes "Dokument laden", "Analysemodus", "Ergebnis". Lisait comme "grid of cards" = vibe coding AI. Réaction de l'Oberarzt en regardant ça : "fake".

**Après** :
- Panneaux entièrement transparents (`background:transparent; border:none; border-radius:0`)
- Séparateur vertical entre document et résultat : `border-left: 1px solid var(--border)` sur `.scan-right`, padding interne
- Labels de section en uppercase (**DOKUMENT LADEN**, **ERGEBNIS**) via `.scan-panel-title` avec `text-transform:uppercase; letter-spacing:0.12em; font-size:10.5px; font-weight:600; color:var(--text-3)`
- Onglets segmentés pour KI-Analyse / OCR (`.scan-mode-toggle`) — underline orange sur actif, pas de box
- Boutons "Foto aufnehmen" / "Datei wählen" en largeur intrinsèque, centrés dans la row avec `gap:8px` (avant : `flex:1` qui stretchait chacun sur 50%)
- Drop zone : `border: 1.5px dashed var(--border)`, radius 4px, background transparent (avant : fond beige `--bg-3`)
- Ancien titre "Ergebnis" géré via `::before` sur `.scan-result-card` (source unique, plus de `<h3>` inline redondant)

**Classes CSS touchées** : `.scan-layout`, `.scan-left`, `.scan-right`, `.scan-panel`, `.scan-panel-header`, `.scan-panel-title`, `.scan-drop-zone`, `.scan-mode-card`, `.scan-mode-toggle`, `.scan-mode-btn`, `.scan-result-card`.

**À finir sur /scan** :
- [x] Toolbar / boutons copier / "An Brief Schreiber" — classes CSS correctes (`.btn-send-briefschreiber`, `.scan-viewer-toolbar`) — pas de hardcode résiduel
- [x] Crop step — anonWarning, Schwärzen button, blackout handles migrés vers CSS variables (commit `1f2485c`)
- [ ] Vérifier l'alignement vertical avec BriefSchreiber (règle des bas de panneau alignés — cf. piège `#23` dans CLAUDE.md)

---

### /briefschreiber — refactor sober (✅ sessions avril 2026)

**Avant** — panels avec `background: var(--card)`, `border-radius: 8px`, `box-shadow` décorative. Boutons modes (Korrektur / Umformulierung / Zusammenfassung) en style pill coloré. Label de section absent.

**Après** :
- Panneaux transparents — `background: transparent; border: none; border-radius: 0`
- Séparateur vertical `.brief-right` : `border-left: 1px solid var(--border)`
- Labels uppercase via `.brief-panel-label` : `font-size:10.5px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-3)`
- Onglets modes (`.brief-diff-toggle`) : underline orange actif, fond transparent
- Boutons d'action : `.btn-action` / `.btn-action-secondary` — largeur intrinsèque
- Banner limitReached : `var(--orange-ghost)` / `var(--orange)` / `borderRadius:5`

**Classes CSS touchées** : `.brief-panel`, `.brief-panel-label`, `.brief-modes`, `.brief-diff-toggle`, `.brief-diff-btn`, `.btn-action`, `.btn-action-secondary`.

---

### /chat — refactor sober (✅ sessions avril 2026)

**Avant** — layout avec `position: absolute; inset: 0` mais scroll scrollait le document entier via `scrollIntoView`. Input box `borderRadius: 8`. Error banner `#DC2626` hardcodé.

**Après** :
- Auto-scroll scoped au container messages : `messagesRef.scrollTop = scrollHeight` (plus de `scrollIntoView`)
- Auto-focus désactivé sur mobile (`ontouchstart` check) — empêche iOS d'ouvrir le clavier et de faire défiler la page
- Error banner : `var(--error)` / `var(--bg-3)` / `borderRadius: 5`
- Input container : `borderRadius: 8 → 6`

**Points d'attention** : chat utilise `position: absolute; inset: 0` + `.main-content:has(.chat-layout-outer) { height: calc(100dvh - 60px); overflow: hidden }` — ne pas modifier sans vérifier le scroll sur mobile.

---

### /bausteine — refactor sober (✅ sessions avril 2026)

**Avant** — conteneur liste avec `background: var(--card)`, `box-shadow`, `border-radius: 8px`. Preview panel en card flottante. Search box avec ombre.

**Après** :
- Search box : `background: var(--bg); border: 1px solid var(--border); border-radius: 5; overflow: hidden` — pas de shadow
- Liste : `borderTop: 1px solid var(--border)` comme seul séparateur — fond transparent
- Preview panel : transparent, `borderBottom: 1px solid var(--border)` pour séparer titre/contenu
- Hover item : `var(--bg-2)` (pas `var(--bg)` — même fond que la page → aucun contraste)
- Modales : `borderRadius: 8 → 6`, inputs `borderRadius: 5`

**Classes CSS touchées** : `.bausteine-search`, `.baustein-item`, `.baustein-item:hover`, `.baustein-preview-card`, `.baustein-preview-title`, `.kat-select-wrap`.

---

### /uebersetzung — refactor sober (✅ sessions avril 2026)

**Avant** — search box avec `box-shadow`, liste avec card background, detail panel avec `border-radius: 8px` et padding latéral de card.

**Après** :
- Search box : `border: 1px solid var(--border)` — pas de shadow
- Liste : `borderTop: 1px solid var(--border)` — fond transparent
- Detail panel : transparent, rows `padding: 10px 0` (pas de padding latéral card)
- `.ueb-detail-term` : `font-family: DM Sans; font-size: 18px; font-weight: 700`
- `.ueb-lang-toggle` : `border-radius: 5px; opacity: 0.6` sur inactifs
- Hover rows : `background: transparent` (pas de card hover)

**Classes CSS touchées** : `.ueb-search-box`, `.ueb-list-container`, `.ueb-detail-card`, `.ueb-detail-term`, `.ueb-detail-cat`, `.ueb-cat-select`, `.ueb-lang-toggle`, `.ueb-detail-row`, `.ueb-detail-divider`.

---

### /profil — refactor sober (✅ sessions avril 2026)

**Avant** — avatar avec `linear-gradient(135deg, var(--orange), var(--orange-dark))`. Couleurs hardcodées `#e53e3e`, `#fff7ed`. `borderRadius: 8` généralisé. Labels sections font-weight 700.

**Après** :
- Avatar : `var(--bg-3)` avec border (pas de gradient orange — respecte règle ≤10% orange)
- `#e53e3e` → `var(--error)` partout
- `#fff7ed` → `var(--orange-ghost)`
- `borderRadius: 8 → 6`, boutons `radius: 5`
- "Rechnungsadresse" + "Zahlungsmittel" : labels uppercase `font-size:11px; font-weight:600; letter-spacing:0.1em`
- Plan badge, promo, prix : `fontWeight: 700 → 600`
- Logo carte bancaire : `background: white → var(--bg-2)`

**Points d'attention** : `profile.title === ""` (Kein Titel) — utiliser `??` pas `||` pour le fallback.

---

## Priorités de refonte

Ordre d'exécution recommandé :

1. **Landing page** `public/landing_page.html` — premier trust signal, le plus critique pour un médecin qui arrive en aveugle
2. **Scan** — pilote du design system (en cours)
3. **BriefSchreiber** — feature emblématique, deuxième plus utilisée
4. **Chat** — KI-Assistent
5. **Bausteine** — bibliothèque 1564 blocs
6. **Uebersetzung** — dictionnaire 1585 termes
7. **Profil** — partiel (CTA Stripe déjà refait, reste avatar / abo / historique factures)

À chaque page refactorée → **ajouter un mini case study dans ce fichier** (avant / après / classes touchées / points d'attention).

---

## Références de style

**À étudier** :
- **Superhuman** — email, dense, sobre, typographie parfaite, zéro card décorative
- **Linear** — vues **Inbox / Issues** (PAS la homepage marketing)
- **Height** — PM tool très dense, refined
- **Craft** — notes Mac, whitespace utilisé avec intention
- **Readwise Reader** — content-forward pur, chrome minimal
- **Doctolib** — sobre, très blanc, accent coloré parcimonieux, **le plus proche de la cible médicale**

**À NE PAS copier** : Orbis, Nexus, iMedOne — denses mais **moches**. On veut "dense et refined", pas "laid et dense". Nuance fondamentale.
