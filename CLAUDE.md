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

1. **Filtering**: Category toggle, isolate/hide per categorie
2. **BCF**: Topics, viewpoints, import/export
3. **UI polish**: Betere iconen, loading states, error handling
4. **Hierarchie tree**: IFC spatial structure sidebar
5. **Performance**: Mark parser caching (nu batch-fetch bij elke load)
6. **Commercieel**: Custom domein, branding per klant

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
