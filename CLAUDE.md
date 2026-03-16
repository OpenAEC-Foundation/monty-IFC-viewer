# MontyViewer

Web-based IFC viewer met **bouwvolgorde visualisatie** voor 3BM Engineering.
Klanten krijgen een link, openen de viewer op tablet/telefoon, en zien hun model met bouwvolgorde + meettools.

**Status:** MVP live — bouwvolgorde, meettools, model toggle, day/night mode
**Live URL:** https://montyviewer.vercel.app/?project=6aa8af2d3e
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
  → klant krijgt link: montyviewer.vercel.app/?project=PROJECT_ID
  → viewer laadt alle branches automatisch
```

### Nieuw project delen

1. Push vanuit Revit naar Speckle (`app.montyviewer.com`)
2. Kopieer project-ID uit Speckle URL: `app.montyviewer.com/projects/XXXXXX`
3. Deel: `https://montyviewer.vercel.app/?project=XXXXXX`

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
      property-panel.ts       # Properties panel (Identity Data, Text params)
      model-panel.ts          # Model toggle (branches aan/uit)
    main.ts                   # App entry: URL parsing, viewer init, add-on registratie
    style.css                 # Day/night theme, responsive, alle UI styling
  index.html
  package.json
  vite.config.ts
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
| Property panel | Werkend | property-panel.ts |
| Meettools (afstand, loodrecht, oppervlakte) | Werkend | toolbar.ts |
| Section box | Werkend | toolbar.ts |
| Explode view | Werkend | toolbar.ts |
| Model toggle (branches aan/uit) | Werkend | model-panel.ts |
| Day/night theme | Werkend | style.css, toolbar.ts |
| Responsive mobiel/tablet | Werkend | style.css |

---

## Bouwvolgorde — Hoe het werkt

1. **mark-parser.ts**: Loopt WorldTree, vindt RevitObjects met `category`
2. Batch-fetch Mark property via Speckle REST API (`/objects/{id}/{id}/single`)
3. Bouwt `PhaseMapping`: gesorteerde fases, markToIds map, unmarkedIds (incl. alle non-RevitObjects)
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
| Elementen kleuren | `filtering.setUserObjectColors()` | phase-manager.ts |
| Elementen ghosten | `filtering.isolateObjects(..., ghost=true)` | phase-manager.ts |
| Filters resetten | `filtering.resetFilters()` | phase-manager.ts, toolbar.ts |
| Properties lezen | REST `/objects/{stream}/{obj}/single` | mark-parser.ts, property-panel.ts |
| WorldTree lopen | `viewer.getWorldTree().walk()` | mark-parser.ts |
| Object klik | `ViewerEvent.ObjectClicked` | property-panel.ts |
| Maatvoering | `MeasurementsExtension` | toolbar.ts |
| Section box | `OrientedSectionTool` (niet SectionTool!) | toolbar.ts |
| Explode | `ExplodeExtension` | toolbar.ts |
| Camera | `CameraController.setCameraView()` | toolbar.ts |

---

## Technische Lessen

- **SectionTool** is een stub met `visible: false` hardcoded — gebruik **OrientedSectionTool**
- **ExplodeExtension**: `setExplode(0)` + `enabled = false` vereist 2x `requestAnimationFrame` ertussen
- **Speckle WorldTree**: Nested parameters (Identity Data, Text) zijn referenties — volledige data vereist REST API fetch
- **npm overrides** nodig voor `@speckle/objectloader2` en `@speckle/shared` (v2.25.4)
- **Speckle server** draait op `app.montyviewer.com` (Docker/Synology NAS)
- Streams zijn publiek — geen auth nodig voor viewer

---

## Volgende stappen (TODO)

1. **Views + Annotaties**: 2D annotaties uit Revit naar viewer (zie "Annotatie-strategie" hieronder)
2. **Schedules**: Revit schedules tonen in de viewer (DataTable via Speckle API)
3. **Filtering**: Category toggle, isolate/hide per categorie
4. **BCF**: Topics, viewpoints, import/export
5. **UI polish**: Betere iconen, loading states, error handling
6. **Hierarchie tree**: IFC spatial structure sidebar
7. **Performance**: Mark parser caching (nu batch-fetch bij elke load)
8. **Commercieel**: Custom domein, branding per klant

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
| Vorig prototype (ThatOpen v2) | `../private-test-projecten/viewer-montyviewer/` |
| BCF prototype (ThatOpen v3) | `../private-test-projecten/viewer-ifcviewer-bcftest/` |
| Strategische notities | `Management/log 2026-02-27.md` |
| Feature ideeen | `Management/logs/2025-01-05-ia-dump/dump-montyviewer.md` |

---

## Test Data

- **Project 6aa8af2d3e**: CLT constructie met 3 branches, 381 elementen, 111 Mark fases
- NAS: `Z:\50_projecten\5_3BM_engineering\0001_3BM Engineering Documentatie\IA\Project Montyviewer\`
