# MontyViewer

Web-based IFC viewer met **bouwvolgorde visualisatie** voor 3BM Engineering.
Klanten krijgen een link, openen de viewer op tablet/telefoon, en zien hun model met bouwvolgorde + meettools.

**Status:** Nieuw project — from scratch
**Voorgangers:** viewer-montyviewer (v2.x), viewer-ifcviewer-bcftest (v3.x), OpenAEC-Foundation/monty-ifc-viewer (pure Three.js)

---

## Harde Vereisten

1. **Bouwvolgorde** is de core feature — vanaf dag 1
2. **Tablet/mobiel** MOET goed werken
3. **Klant krijgt link** — hoeft niets te installeren of uploaden. Piet upload het model.
4. **ThatOpen code niet wijzigen** — alleen wrappen via publieke API, zodat versie-upgrades simpel blijven
5. **TypeScript** strict, modulair — elke add-on onafhankelijk aan/uit

---

## Architectuur

```
Layer 3: App Shell         — UI, routing, ?model= URL parsing, responsive
Layer 2: Add-ons           — bouwvolgorde, meettools, doorsnedes, filtering, bcf
Layer 1: @thatopen v3.x    — ONGEWIJZIGD, alleen gebruiken
Layer 0: Three.js + web-ifc — WASM
```

### Klant Flow

```
Piet exporteert IFC uit Revit
  → upload naar hosted opslag (Vercel Blob / public/models/)
  → klant krijgt link: montyviewer.vercel.app/?model=2880-CLT.ifc
  → viewer laadt model automatisch op tablet/telefoon/desktop
```

---

## Architectuurkeuze — Rationale

| Optie | Verdict | Reden |
|-------|---------|-------|
| **A: Pure Three.js + web-ifc** | Te traag | Elke BIM-feature (meten, clipping, BCF) zelf bouwen = maanden werk |
| **B: ThatOpen components** | GEKOZEN | 80% features kant-en-klaar. Bekende stack. Snelste weg naar klant-demo |
| **C: Speckle self-hosted** | Later als backend | Compleet platform maar andere viewer, zware infra, onbekend terrein voor extensions |

De meeste ThatOpen-tools op LinkedIn zijn commercieel/gesloten. Geen goede open source "product-grade" IFC viewer beschikbaar. Dat is de kans voor MontyViewer.

Speckle is serieuze optie voor backend/DMS later (eerder getest met self-hosting). Speckle UI dient als design-inspiratie (clean, composable, sidebar model tree, floating toolbars).

---

## Tech Stack

| Package | Versie | Rol |
|---------|--------|-----|
| @thatopen/components | ^3.3.1 | Core BIM toolkit |
| @thatopen/components-front | ^3.x | Frontend (renderer, highlighter) |
| @thatopen/fragments | ^3.x | Fragment/model handling |
| @thatopen/ui | ^2.x | UI web components |
| three | matching | 3D rendering (MOET matchen met ThatOpen) |
| web-ifc | matching | WASM IFC parser (MOET matchen met ThatOpen) |
| typescript | ^5.x | Type safety |
| vite | ^5.x | Build tool + dev server |

**Versie-regel:** web-ifc en Three.js versies MOETEN matchen met @thatopen peer dependencies.

---

## Project Structuur

```
montyviewer/
  src/
    core/
      viewer-setup.ts        # ThatOpen init (Components, World, Camera, Renderer)
      wasm-loader.ts          # WASM/worker blob workaround (CORS)
      model-loader.ts         # IFC laden (drag&drop + URL parameter ?model=)
    addons/
      bouwvolgorde/           # CORE FEATURE
        index.ts              # Public API
        mark-parser.ts        # IFC Mark property extractor
        phase-manager.ts      # Fase toewijzing + kleuren
        timeline-ui.ts        # Slider/stepper component
      meettools/index.ts      # LengthMeasurement wrapper
      doorsnedes/index.ts     # Clipper + EdgesPlane wrapper
      filtering/index.ts      # Category toggle, isolate/hide
      bcf/index.ts            # BCF topics, viewpoints, import/export (Fase 3)
    ui/
      toolbar.ts              # Toolbar layout
      sidebar.ts              # Properties panel, hierarchie tree
      responsive.ts           # Mobile/tablet adaptaties
      theme.ts                # Dark theme
    main.ts                   # App entry: URL parsing, add-on registratie
    style.css
  public/
    models/                   # Hosted IFC bestanden (per project)
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

## Fasering

| Fase | Scope | Status |
|------|-------|--------|
| **0** | Project setup + ThatOpen init | In uitvoering |
| **1a** | Basis viewer + bouwvolgorde (CORE) | Gepland |
| **1b** | Meettools + doorsnedes + filtering | Gepland |
| **1c** | Responsive + deploy + eerste klant-link | Gepland |
| **3** | BCF + UI polish | Gepland |
| **4** | Backend & klantomgeving (Speckle?) | Later — apart plan |

**Fase 1a details (bouwvolgorde):**
- Mark property uitlezen uit IFC elementen
- Unieke fases verzamelen en ordenen
- Kleurcodering: groen=geplaatst, grijs=toekomst, highlight=huidige
- Timeline slider/stepper + play/pause animatie
- Hierarchie/boomstructuur (IFC spatial structure)

**Totaal t/m klant-link:** ~6-7 sessies
**Totaal t/m BCF:** ~8-9 sessies

---

## Technische Lessen (uit vorige prototypes)

- web-ifc versie MOET matchen met @thatopen (v0.0.72 bij v3.x)
- Three.js moet matchen (v0.175.0 bij v3.x)
- WASM worker als blob laden (CORS workaround)
- v2.x -> v3.x: breaking API changes (geen `classifier.byEntity()`)
- `model.getItemsOfCategories([regex])` voor filtering in v3.x
- Eerdere prototypes waren niet goed bruikbaar op mobiel

---

## Referenties (raadplegen, niet kopieren)

Primaire bron: **ThatOpen v3.x docs via Context7**. Oude projecten alleen als naslagwerk:

| Onderwerp | Locatie |
|-----------|---------|
| WASM blob workaround | `../private-test-projecten/viewer-ifcviewer-bcftest/src/main.js:211-215` |
| ThatOpen v3.x patronen | `../private-test-projecten/viewer-ifcviewer-bcftest/src/main.js` |
| Dark theme styling | `../private-test-projecten/viewer-montyviewer/src/style.css` |
| BCF implementatie | `../private-test-projecten/viewer-ifcviewer-bcftest/src/main.js:284-499` |
| Measurement + Clipper | `../private-test-projecten/viewer-ifcviewer-bcftest/src/main.js:270-280` |
| Category filtering | `../private-test-projecten/viewer-ifcviewer-bcftest/src/main.js:504-603` |
| Responsive CSS | `../private-test-projecten/viewer-ifcviewer-bcftest/src/style.css:136-164` |

---

## Test IFC Bestanden

- `2880-CLT-3D Model_CLT.ifc` — CLT constructie, heeft Mark property (bouwvolgorde)
- `2877_CLT-3D Model.ifc` — Eerder test model
- NAS: `Z:\50_projecten\5_3BM_engineering\0001_3BM Engineering Documentatie\IA\Project Montyviewer\`

---

## Inventarisatie — Alle Bronnen

Dit project consolideert ideeen uit:

| Bron | Inhoud |
|------|--------|
| `private-test-projecten/viewer-montyviewer/` | Werkend prototype v6.1 (@thatopen v2.4) |
| `private-test-projecten/viewer-ifcviewer-bcftest/` | BCF prototype (@thatopen v3.2, 789 regels) |
| `private-test-projecten/viewer-clt-nesting/` | CLT nesting met IFC parsing |
| `OpenAEC-Foundation/monty-ifc-viewer` | GitHub repo (pure Three.js, GEEN ThatOpen) |
| `Management/logs/2025-01-05-ia-dump/dump-montyviewer.md` | Originele ideeen dump |
| `Management/logs/2025-01-05-ia-dump/dump-revit-ideeen.md` | Revit ideeen (sectie 1 = viewer) |
| `Management/logs/Log 26-W09.txt` | URGENT klantverzoek hierarchie |
| `Management/log 2026-02-27.md` | Strategische notities (Trojan horse) |
| `Management/weekrapporten/2026-W09/` | Actielijst + status |

**Gewenste features (uit dumps):** isolate/hide, filteren op parameters, light/dark mode, meerdere IFC's, montage volgorde player (CLT_T_Mark + Mark), automatisch afmetingen, m2 berekening, Excel export

**Commercieel:** Standalone product ~250 euro/project, Trojan horse, digitale werkpakketten voor montageploegen (tablets, 3D-viewer, stap-voor-stap)

---

## Open Punten

1. **GitHub:** Checken of `OpenAEC-Foundation/monty-ifc-viewer` in sync is met lokale code. Nieuwe repo aanmaken voor dit project.
2. **Speckle:** Parallel onderzoeken als toekomstig backend/DMS. Niet blokkerend voor Fase 0-3.
3. **IFC opslag:** Vercel Blob Storage vs S3 vs public folder — beslissen bij deploy op basis van bestandsgrootte.
4. **Hosting:** Vercel (gratis tier). Nog niet eerder gedaan — deployment is nieuw terrein.

---

Volledig inventarisatie- en masterplan: `~/.claude/plans/merry-inventing-boole.md`
