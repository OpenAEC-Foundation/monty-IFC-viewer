# MontyViewer

Web-based IFC viewer met **bouwvolgorde visualisatie** voor 3BM Engineering.
Klanten krijgen een link, openen de viewer op tablet/telefoon, en zien hun model met bouwvolgorde + meettools.

**Status:** MVP live — bouwvolgorde, context menu, multi-select, linked Mark, meettools, model toggle, day/night, **landing page met projectoverzicht per klant**
**Live URL:** https://montyviewer.vercel.app/?project=6aa8af2d3e
**Landing:** https://montyviewer.vercel.app/landing/?client=demo
**GitHub:** https://github.com/piyton/montyviewer (private)
**Speckle server:** https://app.montyviewer.com (self-hosted, Docker op NAS)

---

## Harde Vereisten

1. **Bouwvolgorde** is de core feature
2. **Tablet/mobiel** MOET goed werken
3. **Klant krijgt link** — hoeft niets te installeren of uploaden
4. **Speckle viewer niet wijzigen** — alleen wrappen via publieke API
5. **TypeScript** strict, modulair

---

## Architectuur

```
Layer 3: App Shell         — UI, routing, ?project= URL parsing, responsive
Layer 2: Add-ons           — bouwvolgorde, property panel, model toggle
Layer 1: @speckle/viewer   — ONGEWIJZIGD, alleen gebruiken
Layer 0: Three.js          — 3D rendering
```

### Klant Flow

```
Piet exporteert IFC uit Revit
  → Revit Connector push naar app.montyviewer.com (Speckle)
  → project toevoegen aan src/landing/projects-config.ts
  → klant krijgt link: montyviewer.vercel.app/landing/?client=SLUG
  → klant klikt project → viewer opent met ?project=PROJECT_ID
```

### Nieuw project delen

1. Push vanuit Revit naar Speckle (`app.montyviewer.com`)
2. Kopieer project-ID uit Speckle URL: `app.montyviewer.com/projects/XXXXXX`
3. Voeg toe aan `src/landing/projects-config.ts` (of gebruik `/landing/config-invullen.html`)
4. Push naar main → Vercel deployt automatisch
5. Deel: `https://montyviewer.vercel.app/landing/?client=SLUG`

**Direct naar viewer (zonder landing):** `https://montyviewer.vercel.app/?project=XXXXXX`

### Architectuurbeslissing: ThatOpen → Speckle

**Tijdlijn:**
- **Jan 2025**: Eerste ontwerp op That Open Company (`@thatopen/components`, `web-ifc`, Three.js)
- **Feb 2026**: Werkend ThatOpen prototype met drag&drop IFC, measurements, sections, floor plans
- **Feb 23, 2026**: Klanten vragen om viewer — urgentie om snel live te gaan
- **Mrt 2026**: Pivot naar Speckle, MVP live binnen dagen

**Waarom weg van ThatOpen:**
- Client-side IFC parsing: klant moet IFC-bestand hebben en uploaden
- Geen server-side model management of versiebeheer
- Fragiele versie-afhankelijkheden (`web-ifc` v0.0.66, Three.js moet exact matchen)
- Geen ingebouwde branch/versie support voor meerdere modellen

**Waarom Speckle:**
- Server-client model: Piet pusht vanuit Revit → klant krijgt link (geen upload nodig)
- Branch support: meerdere IFC-modellen per project, los aan/uit te zetten
- REST API voor properties: geen client-side IFC parsing meer nodig
- Publieke streams: geen auth nodig voor viewer (link = toegang)
- Self-hosted op eigen NAS (`app.montyviewer.com`): data ownership
- Bestaande Revit Connector: geen custom export tooling nodig

**Trade-off:** Speckle viewer is een black box (niet wijzigen, alleen wrappen via publieke API). In ruil daarvoor: snellere time-to-market, betrouwbaardere stack, en een workflow die past bij hoe 3BM al werkt (Revit → server → link delen).

**Bronbestanden:**
- Origineel ontwerp: `../Management/logs/2025-01-05-ia-dump/dump-montyviewer.md`
- ThatOpen prototype: `../private-test-projecten/viewer-montyviewer/`
- Strategische notities: `../Management/log 2026-02-27.md`

---

## Tech Stack

| Package | Versie | Rol |
|---------|--------|-----|
| @speckle/viewer | 2.25.4 | Speckle viewer (3D, filtering, measurements, sections) |
| @speckle/objectloader2 | 2.25.4 | Object loading (override) |
| @speckle/shared | 2.25.4 | Shared utilities (override) |
| three | matching | 3D rendering (peer dep van viewer) |
| typescript | ^5.x | Type safety |
| vite | ^5.x | Build tool + dev server |

---

## Project Structuur

```
montyviewer/
  src/
    core/
      viewer-setup.ts        # Speckle viewer init + alle extensions
      stream-loader.ts       # URL parsing, GraphQL branch resolution, model laden
    addons/
      bouwvolgorde/           # CORE FEATURE
        index.ts              # Public API exports
        mark-parser.ts        # Mark property extractor (batch API fetch)
        phase-manager.ts      # Fase kleuring + ghosting via isolateObjects
        timeline-ui.ts        # Slider/stepper/play component
    ui/
      toolbar.ts              # Toolbar met meettools, sections, explode, theme toggle
      property-panel.ts       # Properties panel (single + multi-select met VAR)
      context-menu.ts         # Rechtermuisklik: isoleer, verberg, reset + multi-select
      model-panel.ts          # Model toggle (branches aan/uit)
    landing/
      projects-config.ts      # Klant/project data + MontyConfig types
      main.ts                 # Landing page entry: cards, filters, upsell
      thumbnail-loader.ts     # Speckle preview + SVG placeholder fallback
    main.ts                   # App entry: URL parsing, viewer init, add-on registratie
    style.css                 # Day/night theme, responsive, alle UI styling
  landing/
    index.html                # Landing page HTML (Outfit font, inline CSS)
    config-invullen.html      # Config generator formulier
  index.html
  package.json
  vite.config.ts              # Multi-page build (viewer + landing)
  tsconfig.json
  CLAUDE.md                   # Dit bestand
```

---

## Development

```bash
npm install       # Dependencies installeren
npm run dev       # Dev server (localhost:3000)
npm run build     # Production build
npm run preview   # Preview production build
```

---

## Deploy

**Vercel** — auto-deploy bij push naar `main`.
```bash
git push          # Vercel bouwt en deployt automatisch
```

---

## Features (wat werkt)

| Feature | Status | Bestanden |
|---------|--------|-----------|
| Speckle viewer embedding | Werkend | viewer-setup.ts, stream-loader.ts |
| Bouwvolgorde player | Werkend | mark-parser.ts, phase-manager.ts, timeline-ui.ts |
| Property panel (single + multi-select) | Werkend | property-panel.ts |
| Multi-select (Ctrl/Shift+klik) | Werkend | context-menu.ts, property-panel.ts |
| Context menu (isoleer/verberg/reset) | Werkend | context-menu.ts |
| Linked Mark highlighting (Part + Generic Model) | Werkend | context-menu.ts, mark-parser.ts |
| CLT_T_Mark support (Generic Models) | Werkend | mark-parser.ts |
| Meettools (afstand, loodrecht, oppervlakte) | Werkend | toolbar.ts |
| Section box | Werkend | toolbar.ts |
| Explode view | Werkend | toolbar.ts |
| Model toggle (branches aan/uit) | Werkend | model-panel.ts |
| Day/night theme | Werkend | style.css, toolbar.ts |
| Responsive mobiel/tablet | Werkend | style.css |
| Landing page (projectoverzicht) | Werkend | landing/index.html, src/landing/*.ts |
| Speckle preview thumbnails | Werkend | thumbnail-loader.ts |
| Demo/upsell (free limit) | Werkend | main.ts (landing), projects-config.ts |
| Locked cards (boven limiet) | Werkend | main.ts (landing) |
| Locatie + Google Maps link | Werkend | main.ts (landing) |
| Zoeken + filteren (type) | Werkend | main.ts (landing) |
| Back-to-projects knop | Werkend | main.ts (viewer), style.css |
| Config generator | Werkend | landing/config-invullen.html |

---

## Bouwvolgorde — Hoe het werkt

1. **mark-parser.ts**: Loopt WorldTree, vindt RevitObjects met `category`
2. Batch-fetch via Speckle REST API: eerst `CLT_T_Mark` (Text groep), dan `Mark` (Identity Data). Mark=0 wordt genegeerd.
3. Bouwt `PhaseMapping`: gesorteerde fases, markToIds map, nodeIdToMark reverse lookup, unmarkedIds
4. **phase-manager.ts**: `isolateObjects(visibleIds, ghost=true)` voor ghosting + `setUserObjectColors` voor oranje highlight
5. **timeline-ui.ts**: Slider, play/pause, prev/next, speed control

### Ghosting logica

- **Voorgaande fases**: originele kleuren (geen override)
- **Huidige fase**: oranje highlight (`#f5a623`)
- **Toekomstige fases + unmarked**: geghosted via Speckle's `isolateObjects(..., ghost: true)`
- Player start inactief — pas bij interactie actief

---

## Speckle API — Wat we gebruiken

| Functie | API | Locatie |
|---------|-----|---------|
| Viewer init | `new Viewer()` + extensions | viewer-setup.ts |
| Model laden | `SpeckleLoader` + `viewer.loadObject()` | stream-loader.ts |
| Model unloaden | `viewer.unloadObject(url)` | model-panel.ts |
| Branches ophalen | GraphQL `stream.branches` | stream-loader.ts |
| Elementen kleuren | `filtering.setUserObjectColors()` | phase-manager.ts, context-menu.ts |
| Elementen ghosten | `filtering.isolateObjects(..., ghost=true)` | phase-manager.ts, context-menu.ts |
| Elementen verbergen | `filtering.hideObjects(..., ghost=true)` | context-menu.ts |
| Filters resetten | `filtering.resetFilters()` | phase-manager.ts, toolbar.ts, context-menu.ts |
| Render forceren | `viewer.requestRender()` | context-menu.ts |
| Properties lezen | REST `/objects/{stream}/{obj}/single` | mark-parser.ts, property-panel.ts |
| WorldTree lopen | `viewer.getWorldTree().walk()` | mark-parser.ts |
| Object klik | `ViewerEvent.ObjectClicked` | property-panel.ts, context-menu.ts |
| Maatvoering | `MeasurementsExtension` | toolbar.ts |
| Section box | `OrientedSectionTool` (niet SectionTool!) | toolbar.ts |
| Explode | `ExplodeExtension` | toolbar.ts |
| Camera | `CameraController.setCameraView()` | toolbar.ts |
| Project preview | REST `/preview/{projectId}` → PNG | thumbnail-loader.ts |

---

## Technische Lessen

- **SectionTool** is een stub met `visible: false` hardcoded — gebruik **OrientedSectionTool**
- **ExplodeExtension**: `setExplode(0)` + `enabled = false` vereist 2x `requestAnimationFrame` ertussen
- **Speckle WorldTree**: Nested parameters (Identity Data, Text) zijn referenties — volledige data vereist REST API fetch
- **CLT_T_Mark** zit in `Instance Parameters > Text` groep (Generic Models met family `00_CLT TAG`). Identity Data/Mark op deze elementen is altijd `0` — moet genegeerd worden
- **CLT TAG structuur**: Level "No Level" > Generic Models > type collections (NSI-ISI, ISI-NSI, etc.) > elementen
- **`setUserObjectColors` overschrijft `hideObjects`/`isolateObjects`** — altijd `removeUserObjectColors()` aanroepen vóór filter-acties
- **`requestRender()`** nodig na `hideObjects`/`isolateObjects` vanuit context menu (buiten Speckle's eigen event loop)
- **Overlay `pointer-events: none`** — alle child-elementen die klikbaar moeten zijn hebben `pointer-events: auto` nodig
- **npm overrides** nodig voor `@speckle/objectloader2` en `@speckle/shared` (v2.25.4)
- **Speckle server** draait op `app.montyviewer.com` (Docker/Synology NAS)
- Streams zijn publiek — geen auth nodig voor viewer
- **Speckle `previewImage` GraphQL veld bestaat NIET** op deze server versie — gebruik REST `/preview/{projectId}` (retourneert PNG met `Access-Control-Allow-Origin: *`)
- **Vite multi-page**: `landing/index.html` als aparte entry in `vite.config.ts` → `rollupOptions.input` met `resolve()`. URL = `/landing/` in zowel dev als prod
- **Landing page sortering**: Projecten met fase "Uitvoering" worden altijd als eerste getoond (linksboven in grid)

---

## Volgende stappen (TODO)

1. ~~**Projecten overview per klant**~~: DONE — landing page met Outfit font, hero, kaarten, Speckle previews, zoek/filter, demo/upsell, locked cards, locatie
2. **Views + Annotaties**: 2D annotaties uit Revit naar viewer (zie "Annotatie-strategie" hieronder)
3. **Schedules**: Revit schedules tonen in de viewer (DataTable via Speckle API)
4. ~~**Isoleer/Verberg knoppen in property panel**~~: DONE — zitten nu boven in het property panel
5. ~~**Maatvoeren mobiel**~~: DONE — [#5](https://github.com/piyton/montyviewer/issues/5) gesloten
6. **Filtering**: Category toggle, isolate/hide per categorie (Mark + Type filter DONE in filter-panel)
7. **Renvooi / Legenda**: Interactieve element-legenda — [#1](https://github.com/piyton/montyviewer/issues/1)
8. **Levering highlighting**: Krat-klik → highlight delivery elementen — [#2](https://github.com/piyton/montyviewer/issues/2)
9. **Detail fly-to**: Detail-symbolen → camera sprong + annotaties — [#3](https://github.com/piyton/montyviewer/issues/3)
10. **Maatlijst**: Sorteerbare elementenlijst met 2D/3D koppeling — [#4](https://github.com/piyton/montyviewer/issues/4)
11. **BCF**: Topics, viewpoints, import/export
12. **UI polish**: Betere iconen, loading states, error handling
13. **Hierarchie tree**: IFC spatial structure sidebar
14. **Performance**: Mark parser caching (nu batch-fetch bij elke load)
15. **Self-hosting**: Van Vercel af, hosten op eigen NAS/extern (zie "Projecten Overview" niveau 2/3)
16. **Commercieel**: Custom domein, branding per klant

---

## Projecten Overview — Strategie

Klanten krijgen een landing page met hun projecten. **Niveau 1 is LIVE.**

### Niveau 1: Statische projectenlijst — DONE
TypeScript config met projecten per klant. Landing page met Outfit font, hero, kaarten, Speckle preview thumbnails.
- **Config:** `src/landing/projects-config.ts` met `Project[]` + `MontyConfig`
- **Config generator:** `/landing/config-invullen.html` (formulier → TypeScript output)
- **Thumbnails:** Via Speckle REST `/preview/{projectId}` (PNG), fallback naar SVG placeholder
- **Routing:** `/?client=slug` → redirect naar `/landing/?client=slug`, klik kaart → `/?project=ID&from=slug`
- **Features:** Zoeken, filteren op type, fase-badges, locatie met Google Maps, demo banner, upsell card, locked cards (freeLimit), back-to-projects knop in viewer
- **Injection:** `window.MONTY_CONFIG = { client, freeLimit, projects }` voor server-side override
- **Hosting:** Vercel (multi-page Vite build), ook portable naar NAS (pure static)
- **Klanten:** JM Concepten (3 open + 1 locked project, echte Speckle IDs)

### Niveau 2: Dynamisch uit Speckle (3-5 dagen)
Projecten automatisch ophalen uit Speckle server op basis van naamconventie of tags.
- **Query:** Speckle GraphQL `streams` met filter op naam/tag per klant
- **Naamconventie:** bijv. `[KLANTNAAM] - [PROJECTNAAM]` of tag `client:klantX`
- **Link-tokens:** Unieke URL per klant (hash of kort token) → server-side mapping
- **Serverless functions:** Vercel Edge Functions of Cloudflare Workers voor klant-lookup
- **Self-hosting optie:** Docker container op NAS naast Speckle, of Nginx + static files + cron voor JSON rebuild
- **Pro:** Geen handmatig onderhoud, schaalt automatisch
- **Con:** Meer infra nodig, naamconventie-discipline vereist

### Niveau 3: Volledig met login (2+ weken)
User accounts, admin dashboard, klant-project koppeling in database.
- **Auth:** Login systeem (bijv. Supabase, Auth0, of eigen)
- **Database:** Klant-project mapping, permissies, branding per klant
- **Admin panel:** Projecten toewijzen, klanten beheren, thumbnails uploaden
- **Self-hosting:** Volledig op eigen NAS/VPS — geen Vercel dependency
- **Pro:** Professioneel, schaalbaar, per-klant branding
- **Con:** Significant meer ontwikkeltijd en onderhoud

**Aanbeveling:** Start met Niveau 1. Werk snel, klant heeft direct een landing page. Upgrade naar Niveau 2 wanneer het handmatig bijhouden van `projects.json` vervelend wordt. Niveau 3 alleen als er daadwerkelijk meerdere klanten met login-behoefte zijn.

**Self-hosting notitie:** Niveau 1 kan direct op NAS (Nginx + static build). Niveau 2 vereist een lichte backend (Node/Python) naast Speckle. Bij self-hosting vervalt Vercel auto-deploy — vervangen door git hook of CI/CD script op NAS.

---

## Annotatie-strategie

Speckle Revit Connector exporteert **geen 2D views en geen annotaties** (dimensions, text, tags). Alleen gridlines worden meegestuurd. Drie mogelijke routes onderzocht:

### Optie A: Annotations → Model Lines in Revit
PyRevit script dat per 2D view annotaties omzet naar 3D model lines op het snijvlak-hoogte. Speckle pikt ze vanzelf op. Apart workset/subcategorie voor beheer.
- **Pro:** Geen viewer-aanpassing nodig
- **Con:** Vervuilt Revit model met extra geometrie

### Optie B: PyRevit → JSON → Speckle branch (voorkeur)
PyRevit script dat annotaties uit een 2D view leest (posities, waarden, types) en via Speckle Python SDK als aparte branch pusht. MontyViewer rendert custom overlays (CSS2D labels of HTML).
- **Pro:** Revit model blijft schoon, volledige controle in viewer
- **Con:** Meer werk in zowel pyRevit script als viewer rendering
- **Aanpak:** Script → JSON extractie → `specklepy` push als branch → viewer leest branch en rendert labels

### Optie C: Hybride
Model lines voor lijnwerk (dimensions, detail lines), tekst-waarden als metadata via Speckle API. Viewer rendert labels op posities.

**Besluit:** Optie B is de voorkeursroute. Houdt Revit schoon en geeft maximale flexibiliteit in de viewer.

### View Hyperlinks (navigatie + PDF)
Clickbare objecten in de 3D view die een Revit view representeren (detaildoorsnede, gevelaanzicht, plattegrond). Klikken doet drie dingen:
1. **Camera sprong**: Navigeer naar de juiste 3D positie + oriëntatie (section box, camera angle)
2. **Annotaties laden**: Bijbehorende annotatie-branch activeren (Optie B)
3. **PDF tonen**: Bijbehorende tekening-PDF openen in een side panel of overlay

**Data per view-hyperlink:**
- Positie + oriëntatie in 3D (camera target, direction, up vector, section box bounds)
- Link naar annotatie-data (Speckle branch of object ID)
- Link naar PDF (URL of bestandspad op NAS/Speckle)
- View naam + type (detail, gevel, plattegrond, doorsnede)

**Aanpak:** PyRevit script exporteert view-metadata (naam, type, viewpoint, gekoppelde sheet/PDF) als JSON → Speckle branch. MontyViewer rendert clickbare markers (3D icons of CSS2D labels) op de juiste posities. Bij klik: `CameraController.setCameraView()` + annotatie-overlay + PDF panel.

### Schedules via Speckle
Revit Connector kan schedules exporteren als `DataTable` objecten. Ophalen via GraphQL/REST API, renderen als custom HTML panel in MontyViewer (vergelijkbaar met property-panel.ts).

---

## Referenties

| Onderwerp | Locatie |
|-----------|---------|
| **Research & alle ideeën** | `RESEARCH-VIEWER-IDEAS.md` — **TODO: structureren en herprioriteren** |
| Vorig prototype (ThatOpen v2) | `../private-test-projecten/viewer-montyviewer/` |
| BCF prototype (ThatOpen v3) | `../private-test-projecten/viewer-ifcviewer-bcftest/` |
| Strategische notities | `Management/log 2026-02-27.md` |
| Feature ideeen | `Management/logs/2025-01-05-ia-dump/dump-montyviewer.md` |

---

## Test Data

- **Project 6aa8af2d3e**: CLT constructie met 3 branches, 381 elementen, 110 Mark fases
- **CLT TAG Generic Models**: family `00_CLT TAG`, level "No Level", types: NSI-ISI, ISI-NSI, NSI-NSI, ISI-ISI
- **Parts**: Mark in Identity Data, CLT TAGs: CLT_T_Mark in Text groep
- NAS: `Z:\50_projecten\5_3BM_engineering\0001_3BM Engineering Documentatie\IA\Project Montyviewer\`
