# BRAND.md — Arvis Brand Guideline

Source de vérité du système visuel, de la marque et de l'écriture d'Arvis.
Pour le contexte projet voir [CLAUDE.md](./CLAUDE.md).

_Dernière mise à jour : 17 avril 2026_

---

## 1. Identité

### 1.1 Nom et sens

**Arvis** = **Jarvis** (l'assistant IA de Tony Stark) + **Arzt** (médecin en allemand). Un assistant intelligent dédié au médecin.

### 1.2 Mission

Réduire la charge administrative des médecins hospitaliers allemands en automatisant la documentation médicale par l'IA — scans, courriers, comptes-rendus, traductions.

### 1.3 Public cible

Médecins hospitaliers en Allemagne (Assistenzärzte, Fachärzte). **Pas** patients. **Pas** grand public. Interface en allemand uniquement.

### 1.4 Personnalité

| Est | N'est pas |
|---|---|
| Sobre, pro, médical | Flashy, playful, consumer |
| Dense mais raffiné (Superhuman, Linear, Doctolib) | Dense et moche (Orbis, iMedOne) |
| Chaleur discrète (gris tintés warm) | Froid clinique (gris-bleus macOS) |
| Accent orange parcimonieux | Orange dominant ("fake AI SaaS") |
| Lecteur expert (Facharztniveau) | Débutant à qui on tient la main |

### 1.5 Principes directeurs

1. **Content-first** — le contenu médical passe avant toute décoration.
2. **Densité refined** — compact, pas aéré, mais lisible.
3. **Hiérarchie par weight + espace**, jamais par couleur saturée.
4. **Un accent, un rôle** — l'orange signale uniquement l'action ou le focus. ≤10% de la surface.
5. **Aucune card** — panneaux transparents séparés par `1px solid var(--border)`.
6. **Aucun glow, aucun gradient, aucun blur décoratif.**
7. **Transitions de couleur uniquement** — pas de `transform: translateY` au hover.
8. **Gris chaud** — jamais de blanc pur ni de noir pur.

---

## 2. Couleurs

### 2.1 Tokens (source de vérité : `src/App.css` `:root`)

```css
:root {
  /* Accent — terracotta médical, désaturé ~30% vs #D94B0A historique */
  --orange:            #B24E24;   /* accent principal (boutons, liens, focus) */
  --orange-light:      #C4552A;   /* variation légère */
  --orange-dark:       #953F18;   /* hover button, pressed */
  --orange-ghost:      #F8EDE5;   /* fond subtil (selected row, focus ring) */
  --orange-ghost-dark: #B24E2418; /* overlay ~9% opacity */

  /* Sémantique */
  --error:   #C13A2B;
  --red:     #C13A2B;             /* alias legacy */
  --success: #3A8B5C;
  --warning: #B87E1E;

  /* Fonds — warm-tinted, jamais blanc pur */
  --bg:   #F6F4F1;   /* fond principal (blanc cassé chaud) */
  --bg-2: #FDFCFA;   /* surfaces élevées (inputs, modales, topbar) */
  --bg-3: #F0EDE7;   /* zones en retrait, hover subtil */

  /* Texte — jamais noir pur */
  --text:   #1A1815; /* primaire */
  --text-2: #55514B; /* secondaire : meta, labels, helpers */
  --text-3: #8A8680; /* tertiaire : uppercase labels, hints */

  /* Bordures */
  --border: #E5E2DA; /* séparateur 1px */

  /* Ombres — strict minimum */
  --shadow:    0 0 0 1px rgba(0,0,0,0.04);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.08);   /* modales uniquement */
}
```

### 2.2 Règle des 10%

L'orange (`--orange` et ses variations) occupe **≤10% de la surface visible** sur n'importe quel écran.

**Rôles autorisés** :
- Bouton primaire (`.btn-action`)
- Lien inline (`<a>` dans prose)
- Focus ring (inputs, boutons)
- Underline d'onglet actif
- Border-left d'item sélectionné (liste Bausteine)
- Marqueur de priorité sémantique (🔴 alertes Scan, mais via emoji natif, pas via couleur de fond)

**Jamais** :
- Fond de section, bandeau, hero (sauf landing page externe)
- Surface de card
- Texte body (seulement titres de CTA ou labels d'accent)

### 2.3 Usage texte — rules sémantiques

| Token | Rôle | Exemples |
|---|---|---|
| `--text` | Contenu principal, titres de page, boutons foncés | Corps d'email, titres "Scan & Analyse" |
| `--text-2` | Labels de formulaire, boutons secondaires, descriptions | "Vorname", "Zurücksetzen" |
| `--text-3` | Helpers, uppercase section labels, meta, disabled | "JPG · PNG · PDF", "DOKUMENT LADEN", "oder" |

**Règle** : sur fond coloré (ex : `--bg-2` ou `--orange-ghost`), utiliser `--text-2` (même teinte, densité variable). Ne jamais empiler du gris sur du gris clair → lisibilité cassée.

### 2.4 Couleurs externes (hors app body)

- Landing page `public/landing_page.html`, favicons, manifest, pages légales (Impressum/Datenschutz/AGB) → `#D94B0A` (orange historique saturé) pour l'identité marque publique.
- À l'intérieur de l'app authentifiée → `--orange` (#B24E24) uniquement.

### 2.5 Contrast — WCAG AA minimum

Cibles à respecter (4.5:1 pour texte normal, 3:1 pour texte large ≥18px 600+ ou ≥24px 400) :

| Paire | Ratio | Usage |
|---|---|---|
| `--text` sur `--bg` | 13.2:1 ✅ | Primaire |
| `--text-2` sur `--bg` | 6.4:1 ✅ | Secondaire |
| `--text-3` sur `--bg` | 3.3:1 ⚠️ | Uniquement labels ≥14px ou uppercase (large) |
| `--orange` sur `--bg` | 5.1:1 ✅ | Liens, CTA |
| white sur `--orange` | 4.8:1 ✅ | Texte bouton primaire |

Vérifier tout nouveau pair `fg/bg` avant de l'introduire.

---

## 3. Typographie

### 3.1 Stack

```css
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
```

- **Inter** — unique font de l'app ET de la landing page. Load via Google Fonts CDN dans `index.html` + `public/landing_page.html` (weights 400/500/600/700).
- **Pas de monospace** sauf `<code>` inline (rare, Chat markdown).
- **Pas d'autre famille** — plus de DM Sans, plus de Bricolage Grotesque (rampe de réduction d'avril 2026 : une seule famille pour une signature propre et du texte dense lisible).

### 3.2 Échelle (densité Superhuman — ne pas aérer)

Unique source vérité. Toute nouvelle taille doit figurer ici ou être justifiée dans une PR.

| Rôle | Size | Weight | Tracking | Color | Exemples concrets |
|---|---|---|---|---|---|
| **Micro label** | 10.5px | 600 | 0.12em | `--text-3` | `DOKUMENT LADEN`, `ERGEBNIS`, `LETZTE SCANS`, `PERSÖNLICHE INFORMATIONEN` (uppercase, section headers) |
| **Meta** | 12px | 400 | normal | `--text-3` | DSGVO note, fine print, footer, "oder", drop zone sub |
| **Form label** | 12.5px | 500 | normal | `--text-2` | `Vorname`, `E-Mail-Adresse`, description mode (Briefassistent) |
| **UI default** | 13px | 500 | normal | `--text` | Boutons, nav sidebar, onglets, drop zone title, mode names, chat date |
| **Body** | 14px | 400 | normal | `--text` | Inputs, preview content, chat messages, textareas, select options |
| **Body emphasis** | 14px | 600 | normal | `--text` | Titres d'item en liste (Baustein, chat conversation) |
| **Section title** | 16px | 600 | normal | `--text` | Titres de panneau (`Analysemodus`, `Akute Dyspnoe`), sidebar logo |
| **Page title** | 18px | 600 | -0.01em | `--text` | Topbar `Scan & Analyse`, `Briefassistent`, etc. |
| **Error / Empty hero** | 24px | 700 | normal | `--text` | Exception : 404 "Seite nicht gefunden", empty states majeurs |
| **Landing hero** | 48–72px | 700 | -0.02em | `--text` | `public/landing_page.html` uniquement — Inter 700, pas de Bricolage |

### 3.3 Weights — la règle

| Weight | Nom | Usage |
|---|---|---|
| 400 | Regular | Body, meta, inputs, options |
| 500 | Medium | UI default (boutons, nav, tabs, form labels) |
| 600 | Semibold | Titres, emphasis, section labels, active tab |
| 700 | Bold | Empty states, pages d'erreur, numéros 404, landing hero |
| 800 | Extra Bold | **Proscrit** — partout |

**Jamais mixer** une même taille avec deux weights différents pour le même rôle. Si `Analysemodus` est 16px/600, tout titre de panneau est 16px/600. Pas d'exception silencieuse.

### 3.4 Line-height

- `normal` (inherited ~1.2–1.3) par défaut pour les tailles UI (10.5 → 18px).
- **1.6–1.8** pour les blocs de prose (preview Bausteine = 1.8, chat messages = 1.6).
- Pour compacter une table ou une liste de labs : `line-height: 1.5`.

### 3.5 Letter-spacing

- `0` par défaut.
- `-0.005em` à `-0.01em` sur titres ≥15px (compense l'écartement optique d'Inter en grande taille).
- `-0.02em` sur landing hero 48–72px.
- `0.12em` sur uppercase labels 10.5px — obligatoire pour éviter le "all-caps qui tasse".

### 3.6 Prose (chat, preview, résultats Scan)

- `font-size: 14px`
- `line-height: 1.6`
- Largeur de ligne : viser 60–75 caractères (utiliser `max-width: 68ch` sur les containers).
- Pas de `<strong>` sur phrases entières — seulement mots-clés (médoc, diagnose).
- Pas d'italique sur du texte long — réservé aux citations courtes.

---

## 4. Espacement

### 4.1 Échelle (base 4 / multiple 8)

Valeurs autorisées, en pixels :

`2  4  6  8  10  12  14  16  20  24  32  40  48  64`

Pas d'autres valeurs sans justification. **Jamais** `5px`, `7px`, `15px`, `18px` (sauf cas de pixel-snap spécifique).

### 4.2 Padding boutons

| Densité | Padding | Usage |
|---|---|---|
| Default | `8px 14px` | `.btn-action`, `.btn-action-secondary` — la norme |
| Dense | `6px 12px` | `.btn-secondary` dans toolbars, chips, petites actions |
| Large (exception) | `11px 16px` | LoginPage `.btn-submit` (max-width 400 centré) |

### 4.3 Gap entre éléments

| Contexte | Gap |
|---|---|
| Row de boutons adjacents | `8px` |
| Icône + label dans un bouton | `6px` |
| Lignes d'une liste dense | `0` (séparées par border-bottom) |
| Items dans une form column | `16px` |
| Sections dans une page | `24–32px` |

### 4.4 Règle du rythme varié

**Ne pas** imposer `padding: 24px 32px` uniforme partout. Varier l'espacement selon la densité logique du contenu : un panneau de labs est plus serré qu'une page d'accueil de profil. Monotone = signature vibe coding.

---

## 5. Radius & bordures

### 5.1 Radius scale

| Valeur | Usage |
|---|---|
| `0` | Panneaux, listes, sections (séparées par border, pas par arrondi) |
| `3–4px` | Chips, pills de placeholder, petits badges |
| `5px` | Boutons, inputs, search boxes, toggles |
| `6px` | Modales, popups, dropdown menus |
| **`8px+`** | **Proscrit** — signature consumer, pas institutionnel |
| `50%` | Avatars circulaires uniquement |

### 5.2 Bordures

| Type | Valeur | Usage |
|---|---|---|
| Default | `1px solid var(--border)` | Séparateurs de colonnes, inputs, toolbar bottom |
| Dashed | `1.5px dashed var(--border)` | Drop zones (Scan, uploads) |
| Accent | `2px solid var(--orange)` | Underline d'onglet actif |
| Left accent | `3px solid var(--orange)` | Item sélectionné dans une liste |
| Warning | `1px solid rgba(193,58,43,0.2)` | Bandeaux d'alerte (anonWarning Scan) |

---

## 6. Élévation & ombres

### 6.1 Règle

**L'élévation est signalée par la bordure, pas l'ombre.** Une surface n'a besoin d'une ombre que si elle flotte physiquement au-dessus du document (modale, popup).

### 6.2 Tokens

| Token | Valeur | Usage |
|---|---|---|
| Aucune | — | **Défaut** : boutons, cards, panneaux, toolbars |
| `--shadow` | `0 0 0 1px rgba(0,0,0,0.04)` | Exception rare : surface qui doit se démarquer sans bordure |
| Focus ring | `0 0 0 3px var(--orange-ghost)` | Inputs et boutons en focus clavier |
| `--shadow-lg` | `0 8px 40px rgba(0,0,0,0.08)` | **Modales uniquement** |

### 6.3 Proscriptions strictes

- ❌ `box-shadow: 0 4px 20px rgba(0,0,0,.08)` sur boutons ou cards
- ❌ Glow orange (`0 0 12px rgba(178,78,36,.3)`) nulle part
- ❌ Drop-shadow décorative sous cards — il n'y a plus de cards
- ❌ Inner shadow sur inputs

---

## 7. Composants

### 7.1 Boutons

#### Hiérarchie

| Classe | Style | Usage |
|---|---|---|
| `.btn-action` | Fond `--orange`, text blanc, border orange | **Primaire** — 1 seul par écran si possible (CTA principal) |
| `.btn-action-secondary` | Fond `--bg-2`, text `--text`, border `--border` | **Secondaire** — action alternative (Datei wählen à côté de Foto aufnehmen) |
| `.btn-secondary` | Fond `--bg-2`, text `--text-2`, border `--border`, padding dense | Toolbar, menu ghost, petites actions (`Zurücksetzen`) |
| `.btn-danger` | Fond `--bg-2`, text `--error`, border `--border` | Actions destructives (Konto löschen) |
| `.btn-ghost` | Fond transparent, text `--text-2` | Boutons d'icône, close `×`, actions très discrètes |

#### Règle auto-width

**Largeur intrinsèque** (padding + contenu). **Jamais** `width: 100%` ni `flex: 1`.

Exceptions tolérées (full-width OK) :
- LoginPage (`.btn-submit`, `.btn-google`) — formulaire centré 400px.
- Modales mobiles sticky-bottom (pattern iOS natif attendu).
- Paywall CTA plein écran.

#### Row de boutons

```css
display: flex;
gap: 8px;
justify-content: flex-start; /* ou center si symétrique */
/* jamais flex:1 sur les enfants */
```

#### États

- `:hover` → transition couleur uniquement (background + border-color), **jamais** transform.
- `:disabled` → `opacity: 0.5`, `cursor: not-allowed`.
- `:focus-visible` → `box-shadow: 0 0 0 3px var(--orange-ghost)`.

#### Hauteur

Hauteur naturelle **35px** (padding 8×14 + font 13/500 + border 1). Cohérent sur tous les boutons standards. Ne pas forcer `height` explicitement.

### 7.2 Inputs & textareas

```css
input, textarea, select {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 400;
  color: var(--text);
  transition: border-color 0.15s;
}
input:focus-visible {
  outline: none;
  border-color: var(--orange);
  box-shadow: 0 0 0 3px var(--orange-ghost);
}
```

- Placeholder : `color: var(--text-3)`.
- Pas d'inner shadow.
- Pas de `border: 2px` (1px suffit).
- Taille minimale sur mobile : 16px font-size pour éviter le zoom iOS — sur desktop 14px est OK.

### 7.3 Onglets segmentés

```css
.tabs { display: flex; border-bottom: 1px solid var(--border); }
.tab-btn {
  padding: 9px 0;
  margin-right: 28px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 13px; font-weight: 500;
  color: var(--text-3);
  cursor: pointer;
}
.tab-btn.active {
  border-bottom-color: var(--orange);
  color: var(--text);
  font-weight: 600;
}
```

Pas de box, pas de fond, pas de radius. Une ligne qui glisse.

### 7.4 Panneaux (content-forward, pas de card)

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
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.panel-label {
  font-size: 10.5px; font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.12em;
}
```

**Séparateur entre deux colonnes** : `border-left: 1px solid var(--border)` sur la 2e colonne + padding interne. Pas de gap. La ligne fait tout le boulot.

### 7.5 Modales

```css
.modal-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: var(--bg-2);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  padding: 24px;
  max-width: 480px; /* ou 880px pour long forms type NeuBausteinModal */
  width: 90%;
}
.modal-title { font-size: 17px; font-weight: 600; margin-bottom: 16px; }
```

Confirmations destructives → **toujours via modale UI**, jamais `confirm()` natif.

### 7.6 Toasts / banners

```css
.banner-info    { background: var(--orange-ghost); color: var(--orange); border: 1px solid var(--orange); }
.banner-error   { background: rgba(193,58,43,0.07); color: var(--error); border: 1px solid rgba(193,58,43,0.2); }
.banner-success { background: rgba(58,139,92,0.07); color: var(--success); border: 1px solid rgba(58,139,92,0.2); }
```

- Padding `10px 16px`, radius `5px`, font-size `13px`.
- Auto-dismiss après 3–5s pour les toasts, **jamais** pour les errors bloquantes.
- Dismiss clavier : `Esc` ferme un toast.

### 7.7 Chips & badges

| Variante | Style | Usage |
|---|---|---|
| Placeholder chip (Bausteine) | `background: var(--orange-ghost); color: var(--orange); font-size: 13px; padding: 1px 4px; radius: 3px` | `[Zeitangabe]`, `(option1 / option2)` |
| Neutral tag | `background: var(--bg-3); color: var(--text-2); font-size: 12px; padding: 2px 8px; radius: 4px` | Catégories, filtres |
| Status badge | 11px uppercase, weight 600, letter-spacing 0.08em | `PRO`, `TRIAL`, `BETA` |

### 7.8 Avatars

```css
.avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--bg-3);
  border: 1px solid var(--border);
  /* pas de gradient orange — respecte règle ≤10% */
}
```

Fallback : initiales en `--text-2`, font-weight 500, 13px.

### 7.9 Listes

```css
.list { background: transparent; }
.list-item {
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s;
}
.list-item:hover { background: var(--bg-2); }
.list-item.selected {
  background: var(--orange-ghost);
  border-left: 3px solid var(--orange);
}
```

Hover **jamais** `var(--bg)` (= même fond que la page, zéro contraste). Toujours `var(--bg-2)`.

---

## 8. Iconographie

### 8.1 Règles

- **SVG inline uniquement** — pas d'emoji (exception : 🔴🟡🟢 Scan alertes médicales, pattern iOS).
- **Lucide / Heroicons style** — `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`.
- `fill: none`, `stroke: currentColor` → héritent la couleur du parent.
- **Jamais** d'icône remplie (solid), sauf brand logo.

### 8.2 Tailles

| Size | Usage |
|---|---|
| 13–14px | Inline dans boutons, chips |
| 16px | Default UI (sidebar nav, topbar, inline) |
| 20px | Large actions (modal triggers, section headers) |
| 24px | Empty states, feature blocks (rare) |

### 8.3 Couleurs

- Par défaut : `currentColor` (hérite du texte).
- Accent : `stroke: var(--orange)` uniquement si l'icône porte une sémantique d'action.
- Disabled : `opacity: 0.4` plutôt que gris pur.

---

## 9. Motion

### 9.1 Règle fondamentale

**Toute animation doit exprimer une causalité** (cause → effet, état A → état B). Jamais décorative. Jamais décorative. Jamais décorative.

### 9.2 Durées

| Type | Durée | Easing |
|---|---|---|
| Color transition (hover, focus) | 150ms | `ease` |
| Small state change (toggle, chip) | 150ms | `ease-out` |
| Modal enter | 200ms | `ease-out` |
| Modal exit | 150ms | `ease-in` (60–70% de l'enter) |
| List stagger | 30–50ms par item | `ease-out` |
| Page transition | 250ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

### 9.3 Propriétés à animer

- ✅ `opacity`, `transform: translate / scale`, `color`, `background-color`, `border-color`
- ❌ `width`, `height`, `top`, `left`, `padding`, `margin` (déclenchent reflow)

### 9.4 Proscriptions

- Pas de `transform: translateY(-1px)` au hover (effet "rebond" vibe coding).
- Pas de parallax.
- Pas de glow pulsant.
- Pas de ripple material-style (ce n'est pas Android).

### 9.5 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

À appliquer globalement. Respecter systématiquement.

---

## 10. Accessibilité

### 10.1 Contrast

- Texte normal : **4.5:1 minimum** (WCAG AA).
- Texte large (≥18px 600 ou ≥24px 400) : **3:1 minimum**.
- Icônes porteuses d'information : **3:1 minimum** avec le fond.
- `--text-3` sur `--bg` est à **3.3:1** → à utiliser uniquement pour uppercase labels ou texte de taille ≥14px. Jamais pour du body long.

### 10.2 Focus

- `:focus-visible` **obligatoire** sur tout élément interactif.
- Ring : `box-shadow: 0 0 0 3px var(--orange-ghost)` + optionnellement `outline: 2px solid var(--orange)`.
- Ne **jamais** supprimer `outline` sans le remplacer.
- Ordre de tab : suit l'ordre visuel. Pas de `tabindex > 0`.

### 10.3 Touch targets

- **44×44 pt minimum** (Apple HIG) sur mobile, **48×48 dp** (Material).
- Les boutons standards à 35px de hauteur nécessitent un hit area étendu (`padding` ou pseudo-element `::before` transparent) sur mobile — à documenter par composant.
- Gap minimum entre targets : **8px**.

### 10.4 Clavier

- Modales : trap focus, Esc pour fermer, autofocus sur le premier input utile.
- Dropdowns : flèches pour naviguer, Enter pour valider, Esc pour fermer.
- Actions primaires : raccourci clavier si pertinent (ex : `⌘Enter` pour envoyer, `⌘K` pour search).

### 10.5 Screen reader

- `aria-label` sur tout bouton icon-only.
- `role="alert"` ou `aria-live="polite"` sur les erreurs de formulaire et les toasts.
- Hiérarchie `h1 → h2 → h3` respectée, pas de saut de niveau.

### 10.6 Contenu médical

- Jamais de couleur seule pour coder une information (ex : rouge = danger). Toujours doublé d'une icône ou d'un label (`🔴 Alarm`, `AUFGEPASST`).
- Nombres et mesures : utiliser `font-variant-numeric: tabular-nums` pour éviter le shift visuel dans les tableaux.

---

## 11. Écriture UI (voice & tone)

### 11.1 Langue

**Allemand uniquement** dans l'app authentifiée. Jamais d'anglais dans les labels UI, les messages d'erreur, les CTA, les emails transactionnels.

### 11.2 Registre

Facharztniveau — le lecteur est médecin. Aller droit au but, utiliser la terminologie médicale exacte (Diagnose, Anamnese, Befund, Procedere), pas de sur-explication.

| ✅ | ❌ |
|---|---|
| `Diagnose vorhanden` | `Wir haben eine Diagnose für Sie gefunden!` |
| `Analyse läuft…` | `Einen kleinen Moment, unser KI-Assistent arbeitet für Sie!` |
| `Fehler beim Laden` | `Hoppla, etwas ist schiefgelaufen 😕` |

### 11.3 Boutons — verbes à l'impératif

- `Speichern`, `Abbrechen`, `Löschen`, `Bestätigen`, `Weiter`, `Zurück`
- Pas de "Jetzt ..." sauf pour CTA marketing externe.

### 11.4 Messages d'erreur

Format : **Cause + action**.

- ✅ `Datei zu groß (max. 10 MB). Bitte kleinere Datei wählen.`
- ❌ `Ein Fehler ist aufgetreten.`

### 11.5 Dates

- Format allemand : `02.04.2026`, `Donnerstag`, jamais anglais.
- Relative : `vor 5 Min.`, `gestern`, `heute`.

### 11.6 Nombres

- Virgule décimale : `1,5 g/dl` pas `1.5`.
- Espaces fines pour milliers : `1 564 Bausteine` (caractère U+202F).

### 11.7 Medical content

- Aucun médicament ni dose dans les Bausteine — classes thérapeutiques uniquement.
- Placeholders éditables : `[_]`, `(a / b / c)`, `(a + b + c)`.
- Diagnosen reprises verbatim du document (Scan) — aucune reformulation.

---

## 12. Anti-patterns (signature "AI slop 2024-2025")

Si tu trouves l'un de ces patterns dans Arvis, c'est un bug à corriger.

| ❌ Pattern | ✅ Remplacer par |
|---|---|
| `box-shadow: 0 4px 20px rgba(0,0,0,.08)` sur cards | Pas de card — `border-bottom: 1px solid var(--border)` sur row |
| `border-radius: 12–16px` | `4–6px` |
| `padding: 24px 32px` uniforme partout | Rythme varié selon densité logique |
| Orange en **fond** de section/bandeau/hero | Orange en accent uniquement |
| `font-weight: 700` générique | `500/600` + hiérarchie taille + espace |
| Glow orange `box-shadow: 0 0 12px rgba(...)` | Rien |
| `transform: translateY(-1px)` au hover | Transition couleur seulement |
| `width: 100%` / `flex: 1` sur bouton | `align-self: flex-start`, largeur intrinsèque |
| Grid symétrique de 3–4 cards aérées | Contenu dense, listes, séparateurs fins |
| Gradients texte sur titres/metrics | `color: var(--text)` uni |
| Emojis décoratifs dans l'UI | Aucun (exception 🔴🟡🟢 Scan alertes) |
| Icônes rondes avec fond coloré au-dessus de chaque titre | Titre seul |
| "Confetti" d'animation à l'ouverture | Rien |
| Modale avec `border-radius: 20px` et glass effect | `radius: 6px`, fond opaque `--bg-2` |
| Sparkline décorative dans un KPI | Valeur brute, pas de viz inutile |
| "You're awesome!" après chaque action | `Gespeichert`. Point. |

---

## 13. Gouvernance du système

### 13.1 Principe

Toute exception au système doit être **documentée** et **justifiée**. Soit elle devient une règle (ajoutée ici), soit elle ne doit pas exister.

### 13.2 Workflow d'ajout d'un token

1. Vérifier que la valeur existante ne couvre pas déjà le besoin.
2. Si non, proposer une nouvelle valeur dans la scale (pas entre deux).
3. Ajouter la variable CSS dans `src/App.css` `:root`.
4. Mettre à jour la section correspondante dans BRAND.md.
5. Référencer l'usage (composant, page).

### 13.3 Hardcoding interdit

Tout code qui contient `#` (hex) ou une valeur `px` d'espacement hors scale doit être refusé en review, sauf s'il figure dans une liste documentée d'exceptions (landing page, favicons, emails HTML).

### 13.4 Revue périodique

Trimestriellement : auditer l'app avec `preview_inspect` sur un échantillon de pages — vérifier que toutes les tailles de texte rencontrées figurent dans l'échelle. Toute dérive = bug à corriger.

---

## 14. Références

### 14.1 À étudier en priorité

- **Superhuman** — email, dense, sobre, typographie parfaite, zéro card décorative
- **Linear** — vues Inbox / Issues (pas homepage marketing)
- **Height** — PM tool dense, refined
- **Craft** — notes Mac, whitespace avec intention
- **Readwise Reader** — content-forward pur
- **Doctolib** — sobre, blanc, accent coloré parcimonieux, **le plus proche de la cible médicale**

### 14.2 À NE PAS copier

- Orbis, Nexus, iMedOne — dense mais moche. On veut dense et refined, pas laid et dense.
- Tout SaaS B2C "playful" avec gradients et skeumorphism.
- Portfolios de designers 2023–2024 avec glass effects.

---

## 15. Historique des refontes

À chaque page refactorée, ajouter un mini case study ici (avant / après / classes touchées / points d'attention).

### /scan — refactor sober (✅ commit `d315435`)

**Avant** — 3 panneaux en grid avec drop-shadow, border-radius 12px, padding 24px 32px. Trois cards distinctes "Dokument laden", "Analysemodus", "Ergebnis". Lisait comme "grid of cards" = vibe coding AI.

**Après** :
- Panneaux entièrement transparents (`background:transparent; border:none; border-radius:0`)
- Séparateur vertical `.scan-right` : `border-left: 1px solid var(--border)` + padding interne
- Labels uppercase via `.scan-panel-title` : `10.5px / 600 / uppercase / letter-spacing:0.12em / color:var(--text-3)`
- Onglets segmentés KI-Analyse / OCR (`.scan-mode-toggle`) — underline orange actif, pas de box
- Boutons "Foto aufnehmen" / "Datei wählen" en largeur intrinsèque, centrés avec `gap:8px`
- Drop zone : `border: 1.5px dashed var(--border)`, radius 4px, background transparent
- Ancien titre "Ergebnis" via `::before` sur `.scan-result-card` (plus de `<h3>` inline)

**Classes CSS touchées** : `.scan-layout`, `.scan-left`, `.scan-right`, `.scan-panel`, `.scan-panel-header`, `.scan-panel-title`, `.scan-drop-zone`, `.scan-mode-card`, `.scan-mode-toggle`, `.scan-mode-btn`, `.scan-result-card`.

---

### /briefassistent — refactor sober (✅ sessions avril 2026)

**Avant** — panels avec `background: var(--card)`, `border-radius: 8px`, `box-shadow` décorative. Boutons modes (Korrektur / Zusammenfassung) en style pill coloré. Pas de label de section.

**Après** :
- Panneaux transparents — `background: transparent; border: none; border-radius: 0`
- Séparateur vertical `.brief-right` : `border-left: 1px solid var(--border)`
- Labels uppercase via `.brief-panel-label` : `10.5px / 600 / uppercase / letter-spacing:0.12em / color:var(--text-3)`
- Onglets modes (`.brief-diff-toggle`) : underline orange actif, fond transparent
- Boutons d'action : `.btn-action` / `.btn-action-secondary` — largeur intrinsèque
- Banner limitReached : `var(--orange-ghost)` / `var(--orange)` / `borderRadius:5`

**Classes CSS touchées** : `.brief-panel`, `.brief-panel-label`, `.brief-modes`, `.brief-diff-toggle`, `.brief-diff-btn`, `.btn-action`, `.btn-action-secondary`.

---

### /chat — refactor sober (✅ sessions avril 2026)

**Avant** — `scrollIntoView` scrollait le document entier. Input box `borderRadius: 8`. Error banner `#DC2626` hardcodé.

**Après** :
- Auto-scroll scoped au container : `messagesRef.scrollTop = scrollHeight`
- Auto-focus désactivé sur mobile (`ontouchstart` check) — empêche iOS d'ouvrir le clavier en naviguant
- Error banner : `var(--error)` / `var(--bg-3)` / `borderRadius: 5`
- Input container : `borderRadius: 8 → 6`

**Point d'attention** : chat utilise `position: absolute; inset: 0` + `.main-content:has(.chat-layout-outer) { height: calc(100dvh - 60px); overflow: hidden }` — ne pas modifier sans vérifier le scroll sur mobile.

---

### /bausteine — refactor sober (✅ sessions avril 2026)

**Avant** — conteneur liste avec `background: var(--card)`, `box-shadow`, `border-radius: 8px`. Preview panel en card flottante. Search box avec ombre.

**Après** :
- Search box : `background: var(--bg); border: 1px solid var(--border); border-radius: 5; overflow: hidden` — pas de shadow
- Liste : `borderTop: 1px solid var(--border)` — fond transparent
- Preview panel : transparent, `borderBottom: 1px solid var(--border)` pour séparer titre/contenu
- Hover item : `var(--bg-2)` (pas `var(--bg)` — même fond → aucun contraste)
- Modales : `borderRadius: 8 → 6`, inputs `borderRadius: 5`

**Classes CSS touchées** : `.bausteine-search`, `.baustein-item`, `.baustein-item:hover`, `.baustein-preview-card`, `.baustein-preview-title`, `.kat-select-wrap`.

---

### /uebersetzung — refactor sober (✅ sessions avril 2026)

**Avant** — search box avec `box-shadow`, liste avec card background, detail panel avec `border-radius: 8px` et padding latéral de card.

**Après** :
- Search box : `border: 1px solid var(--border)` — pas de shadow
- Liste : `borderTop: 1px solid var(--border)` — fond transparent
- Detail panel : transparent, rows `padding: 10px 0` (pas de padding latéral card)
- `.ueb-lang-toggle` : `border-radius: 5px; opacity: 0.6` sur inactifs

**Classes CSS touchées** : `.ueb-search-box`, `.ueb-list-container`, `.ueb-detail-card`, `.ueb-detail-term`, `.ueb-detail-cat`, `.ueb-cat-select`, `.ueb-lang-toggle`, `.ueb-detail-row`, `.ueb-detail-divider`.

---

### /profil — refactor sober (✅ sessions avril 2026)

**Avant** — avatar avec `linear-gradient(135deg, var(--orange), var(--orange-dark))`. Couleurs hardcodées `#e53e3e`, `#fff7ed`. `borderRadius: 8` généralisé. Labels sections font-weight 700.

**Après** :
- Avatar : `var(--bg-3)` avec border (pas de gradient orange — règle ≤10% orange)
- `#e53e3e` → `var(--error)` partout
- `#fff7ed` → `var(--orange-ghost)`
- `borderRadius: 8 → 6`, boutons `radius: 5`
- "Rechnungsadresse" + "Zahlungsmittel" : labels uppercase `11px / 600 / letter-spacing:0.1em`
- Plan badge, promo, prix : `fontWeight: 700 → 600`
- Photo de profil supprimée (bucket Supabase non configuré)

**Point d'attention** : `profile.title === ""` (Kein Titel) — utiliser `??` pas `||` pour le fallback (`||` traite `""` comme falsy et remet "Dr.").

---

## 16. Changelog

- **2026-04-18** — Merge DESIGN.md → BRAND.md. Ajout section 15 "Historique des refontes" (6 case studies). DESIGN.md supprimé. Références CLAUDE.md mises à jour.
- **2026-04-17** — Création de BRAND.md (système complet). Consolidation de l'audit type/couleurs/spacing sur les 7 pages principales. Hiérarchie typo définitive : 10.5 → 12 → 12.5 → 13 → 14 → 16 → 18. Weights limités à 400/500/600 dans l'app (700 réservé exceptions).
