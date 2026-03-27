# MontyViewer — Research & Ideeen Inventarisatie

Verzameld uit alle logs, dumps, weekrapporten, prototypes en planningsdocumenten in de Dev workspace.
Datum inventarisatie: 2026-03-16

---

## Bronnen

| Bron | Locatie | Datum |
|------|---------|-------|
| dump-montyviewer.md | Management/logs/2025-01-05-ia-dump/ | jan 2025 |
| dump-revit-ideeen.md | Management/logs/2025-01-05-ia-dump/ | jan 2025 |
| dump-algemeen.md | Management/logs/2025-01-05-ia-dump/ | jan 2025 |
| MASTER-STRATEGY.md | Management/logs/2025-01-05-ia-dump/ | jan 2025 |
| Log 26-W02.txt | Management/logs/ | jan 2026 |
| Log 26-W04.txt | Management/logs/ | jan 2026 |
| Log 26-W09.txt | Management/logs/ | feb 2026 |
| log 2026-02-27.md | Management/ | feb 2026 |
| weekrapport-2026-W09.md | Management/weekrapporten/2026-W09/ | feb 2026 |
| viewer-montyviewer (prototype) | private-test-projecten/viewer-montyviewer/ | 2025 |
| viewer-ifcviewer-bcftest (prototype) | private-test-projecten/viewer-ifcviewer-bcftest/ | 2025-2026 |
| viewer-clt-nesting | private-test-projecten/viewer-clt-nesting/ | 2025-2026 |
| montyviewer CLAUDE.md | Projects OWN/montyviewer/ | mrt 2026 |
| session_memory.md | .claude/ | mrt 2026 |
| Claude.ai chat: interactieve 3D lagen | Gedeelde chat (krat, renvooi, details) | 27 mrt 2026 |

---

## Tijdlijn

| Wanneer | Wat | Status |
|---------|-----|--------|
| Jan 2025 | IA-dump: viewer ideeën, roadmap, hosting opties | Gedocumenteerd |
| 2025 | ThatOpen v2 prototype (viewer-montyviewer) | Werkend prototype |
| 2025-2026 | ThatOpen v3 BCF prototype (viewer-ifcviewer-bcftest) | Werkend prototype |
| Feb 2026 | Klanten vragen om viewer — urgentie | Trigger voor pivot |
| Feb 23, 2026 | "MontyViewer URGENT — klanten vragen" (Log 26-W09) | Besluit |
| Feb 27, 2026 | Strategische notities: viewer als product, €250/project | Richting bepaald |
| Mrt 2026 | Pivot ThatOpen → Speckle, v1.0 live op Vercel | LIVE |
| 16 mrt 2026 | v1.1: context menu, multi-select, linked Mark, CLT_T_Mark | LIVE |

---

## Bestaande Prototypes

### 1. viewer-montyviewer (ThatOpen v2)
**Locatie:** `private-test-projecten/viewer-montyviewer/`
**Stack:** @thatopen/components, web-ifc v0.0.66, Three.js 0.160.0, TypeScript, Vite
**Features:**
- Native IFC drag & drop loading
- 3D navigatie (orbit, pan, zoom)
- Measurements (afstand, 0.25m snap)
- Clipping planes (EdgesPlane)
- Floor plans + elevation generation
- Element selectie + properties
- Keyboard shortcuts (F, Delete, Escape)
- Netlify deployment config

**Documentatie:** CLAUDE.md, README.md, HANDLEIDING-IFC-VIEWER.md (714 regels, volledig setup guide)

### 2. viewer-ifcviewer-bcftest (ThatOpen v3)
**Locatie:** `private-test-projecten/viewer-ifcviewer-bcftest/`
**Stack:** @thatopen/components v3.2.0, web-ifc v0.0.72, Three.js 0.175.0
**Features:**
- IFC drag & drop
- Section planes (clipping met edges)
- Length + area measurement
- Category filtering (toggle per IFC type)
- Properties panel
- **BCF topics** (create, title, description, status, type)
- **BCF viewpoints** (camera + element visibility state)
- **BCF navigatie** (klik topic → restore view)
- **BCF import/export** (.bcf zip files)
- Camera preset views (Front, Back, Left, Right, Top, 3D)

**Technisch:** WASM worker via blob URL (CORS workaround), monolithisch `src/main.js`
**Documentatie:** PROJECT.md (24.9 KB, complete walkthrough)

### 3. viewer-clt-nesting (CLT panel optimizer)
**Locatie:** `private-test-projecten/viewer-clt-nesting/`
**Stack:** web-ifc v0.0.66, Three.js 0.175.0, TypeScript, Vite
**Features:**
- IFC parsing (IfcWall, IfcSlab, 15+ element types)
- Arrow-tag extractie uit IFC (180-280mm detectie)
- Tag-to-panel matching (spatial proximity + mark fallback)
- Rotatie berekening (atan2 → 0/90/180/270)
- GuillotineBinPack nesting (Best Short Side Fit)
- Mother panel selectie
- 2D + 3D visualisatie

**Status:** V2 actief (TypeScript/web-ifc), V1 legacy (Python/FastAPI)

---

## Alle Feature-ideeën (gecombineerd)

### Gerealiseerd in MontyViewer v1.1
- [x] 3D navigatie (orbit, pan, zoom)
- [x] Measurements (afstand, loodrecht, oppervlakte)
- [x] Section box (OrientedSectionTool)
- [x] Element selectie + properties
- [x] Light/dark mode
- [x] Player functionaliteit (bouwvolgorde)
- [x] CLT_T_Mark + Mark detectie voor volgorde
- [x] Klikken → isolate/hide (context menu)
- [x] Multi-select (Ctrl/Shift+klik)
- [x] Linked Mark highlighting (Part + Generic Model)
- [x] Meerdere modellen combineren (branch toggle)
- [x] Explode view
- [x] Responsive mobiel/tablet
- [x] Merged property panel (VAR voor verschillen)

### Nog niet gerealiseerd — uit alle bronnen

#### Selectie & Filtering
- [ ] Filteren op parameter waardes (dump-revit-ideeen)
- [ ] Category toggle per IFC type (dump-revit-ideeen, bcftest prototype heeft dit)
- [ ] **Renvooi / Legenda** — interactieve legenda van family types, bidirectioneel (concept 2026-03-27)
- [ ] **Levering highlighting** — klik krat-object → highlight alle elementen in die levering (concept 2026-03-27)
- [ ] **Detail fly-to** — klik detail-symbool → camera sprong + annotaties + bounding box (concept 2026-03-27)
- [ ] Bij selectie automatisch afmetingen tonen (dump-revit-ideeen)
- [ ] M² berekening bij selectie (dump-revit-ideeen)
- [ ] Bij meerdere elementen: calculaties (dump-revit-ideeen)
- [ ] Isoleer/Verberg knoppen in property panel (naast context menu)
- [ ] Hierarchie tree / spatial structure sidebar

#### Export & Data
- [ ] Excel export van selectie (dump-revit-ideeen)
- [ ] Schedules tonen (Revit DataTable via Speckle API)

#### BCF & Samenwerking
- [ ] BCF topics (create, status, type) — prototype bestaat in bcftest
- [ ] BCF viewpoints (camera + visibility state) — prototype bestaat
- [ ] BCF import/export (.bcf zip) — prototype bestaat
- [ ] BCF navigatie (klik topic → restore view) — prototype bestaat

#### Annotaties & Views
- [ ] 2D annotaties uit Revit naar viewer (Optie B: PyRevit → JSON → Speckle branch)
- [ ] View hyperlinks (clickbare objecten → camera sprong + annotaties + PDF)
- [ ] Floor plans / elevations (ThatOpen prototype had dit)
- [ ] Camera preset views (Front, Back, Left, Right, Top, 3D)

#### Platform & Hosting
- [ ] Projecten overview per klant (landing page met projectkaarten)
- [ ] Self-hosting op NAS (van Vercel af)
- [ ] Klant inlog + eigen projectomgeving
- [ ] IFC upload functionaliteit (drag & drop, nu alleen Speckle push)
- [ ] Custom domein + branding per klant

#### Performance & UX
- [ ] Mark parser caching (nu batch-fetch bij elke load)
- [ ] Maatvoeren mobiel UX (property panel conflict)
- [ ] Betere iconen, loading states, error handling
- [ ] Keyboard shortcuts (F=zoom model, Delete=verwijder, Escape=deactiveer)

#### Materiaal & Visualisatie
- [ ] Materiaal en kleur per wandzijde (dump-revit-ideeen: "zit nu niet per wandzijde")

#### Document Management Systeem
- [ ] Projectdocumenten koppelen aan 3D model (PDF tekeningen, berekeningen, rapporten)
- [ ] Documentenbrowser in viewer (sidebar of overlay panel)
- [ ] Upload systeem voor projectdocumenten
- [ ] Versie beheer van documenten
- [ ] Documenten linken aan elementen (klik element → gekoppelde PDF's)
- [ ] Collaboration features (opmerkingen, status tracking)

---

## Document Management — Uitbreidingsplan

Originele roadmap (jan 2025, dump-montyviewer) noemde dit als **Fase 3** met: backend (Node.js + PostgreSQL), file upload, user authentication, project structuur. Nu opnieuw bekeken in context van Speckle-based architectuur.

### Wat is het doel
MontyViewer wordt meer dan alleen een 3D viewer — het wordt de **centrale plek** waar klanten alles van hun project vinden: 3D model, tekeningen (PDF), berekeningen, en projectdocumenten. Eén link, alles erbij.

### Niveau 1: Statische document-links (1-2 dagen)
Simpelste aanpak: JSON config per project met links naar documenten.
- **Config:** `documents.json` met `{ projectId, documents: [{ naam, type, url, categorie }] }`
- **UI:** Document-tab naast property panel, gegroepeerd per categorie (tekeningen, berekeningen, rapporten)
- **Storage:** PDF's op NAS (publieke share) of Speckle als attachment
- **Koppeling:** Documenten per project, niet per element
- **Pro:** Snel, geen backend nodig
- **Con:** Handmatig bijhouden, geen element-koppeling

### Niveau 2: Documenten op NAS met auto-discovery (3-5 dagen)
Documenten automatisch ophalen vanuit de NAS projectmapstructuur.
- **Bron:** `P:/Projecten/[YYYY-NNNN]/04 Tekeningen/` en `03 Berekeningen/`
- **Sync:** Serverless function of cron script dat NAS scant → JSON genereert
- **Naamconventie:** Bestandsnaam bevat sheetnummer → koppeling aan Revit views
- **Element-koppeling:** Document-naam matchen op Mark/elementId uit model
- **PDF viewer:** Inline PDF viewer (iframe of pdf.js) in side panel
- **Pro:** Automatisch, volgt bestaande NAS structuur
- **Con:** NAS moet bereikbaar zijn, naamconventie-discipline

### Niveau 3: Volledig DMS met database (2-4 weken)
Eigen document management systeem met upload, versioning, en element-koppeling.
- **Backend:** Node.js/Python API + PostgreSQL/SQLite
- **Upload:** Drag & drop documenten in viewer, opslag op NAS of S3
- **Versioning:** Meerdere versies per document, diff-tracking
- **Element-koppeling:** Klik element in 3D → zie gekoppelde documenten, en vice versa
- **Metadata:** Tags, categorieën, status (concept/definitief/vervallen), auteur, datum
- **Zoeken:** Full-text search in document-namen en metadata
- **Notificaties:** "Nieuw document toegevoegd aan uw project"
- **Auth:** Vereist login (combineren met Projecten Overview Niveau 3)
- **Pro:** Compleet, professioneel, vervangt losse file sharing
- **Con:** Significant development + onderhoud

### Niveau 4: Geïntegreerd met Revit workflow (4+ weken)
Documenten worden automatisch gepusht vanuit Revit workflow.
- **PyRevit integration:** ExportPDF pushbutton uploadt PDF direct naar DMS
- **Sheet-koppeling:** Revit sheet → PDF → automatisch gekoppeld aan juiste view hyperlink
- **Revisiebeheer:** Revit revisie-nummering doorgetrokken in DMS
- **CNC/productie:** Machinebestanden (zaaglijsten, CNC) gekoppeld aan elementen
- **Combinatie:** View Hyperlinks (camera sprong) + Annotaties (Optie B) + PDF = volledig plaatje

### Relatie met andere features

| Feature | Koppeling met DMS |
|---------|-------------------|
| View Hyperlinks | Klik view-marker → PDF van die tekening openen |
| Annotaties (Optie B) | Annotatie-branch + bijbehorende PDF samen tonen |
| Schedules | Schedule-data linken aan productiedocumenten |
| Projecten Overview | Per project de documentenlijst tonen op landing page |
| BCF | BCF topics linken aan relevante documenten |

### Aanbeveling
Start met **Niveau 1** (JSON + document-tab). Combineer dit direct met **View Hyperlinks**: klik op een view-marker → camera springt + PDF opent. Dat geeft de meeste waarde met de minste effort. Upgrade naar Niveau 2 wanneer de NAS-structuur consistent genoeg is voor auto-discovery.

---

## Business & Strategie

### Pricing (uit logs)
- **€250 per project** voor viewer-hosting/setup (Log 26-W04)
- Standalone product — apart verkopen (Log 26-W02)
- "Viewer publiceren, backend/login achterwege laten" (log 2026-02-27)
- PDF-tool als trojan horse, MontyViewer moet "geld binnenharken" (log 2026-02-27)

### Projecten Overview — 3 Niveaus
1. **Statisch** (1-2 dagen): JSON config, landing page, thumbnails via Speckle
2. **Dynamisch** (3-5 dagen): Auto-query Speckle, naamconventie, serverless functions
3. **Volledig** (2+ weken): Login, admin dashboard, database, per-klant branding

### Hosting Opties (geëvalueerd jan 2025)
| Optie | Kosten | Opmerkingen |
|-------|--------|-------------|
| Vercel | Gratis (hobby) | Huidige setup, auto-deploy |
| Netlify | Gratis tier | ThatOpen prototype gebruikte dit |
| Eigen NAS | Geen extra | Speckle draait er al, Nginx erbij |
| DigitalOcean | €5/maand | VPS, betrouwbare uptime |
| Hetzner | €4/maand | VPS, goedkoop |
| Docker container | Variabel | Portable, schaalbaar |

### Urgentie-indicatoren
- Weekrapport W09: "MontyViewer hierarchie update urgent (klantverzoek)"
- "Niets wordt verkocht" — revenue nog €0
- Plan B status: ORANJE

---

## Originele Roadmap (jan 2025, dump-montyviewer)

| Fase | Naam | Geschatte duur | Huidige status |
|------|------|---------------|----------------|
| 1 | Basis Viewer | Week 1-2 | DONE (Speckle) |
| 2 | Core Features | Week 3-4 | GROTENDEELS DONE |
| 3 | Document Management | Maand 2 | NIET GESTART |
| 4 | Geavanceerde Features | Maand 3+ | DEELS (annotatie-strategie uitgewerkt) |

### Fase 2 detail (uit MASTER-STRATEGY)
| Feature | Prioriteit | Status |
|---------|-----------|--------|
| 3D doorsnijden + maatvoeren | Hoog | DONE |
| Filteren op parameter waardes | Hoog | TODO |
| Player functionaliteit (montage volgorde) | Hoog | DONE |
| Meerdere IFC's combineren | Medium | DONE (via branches) |
| Light/dark mode | Laag | DONE |

---

## Annotatie-strategie (besloten)

**Probleem:** Speckle exporteert geen 2D views en geen annotaties (dimensions, text, tags). Alleen gridlines.

**Optie A:** Annotations → Model Lines in Revit
- PyRevit omzet annotaties naar 3D model lines op snijvlak-hoogte
- Pro: Geen viewer-aanpassing | Con: Vervuilt Revit model

**Optie B (VOORKEUR):** PyRevit → JSON → Speckle branch
- PyRevit leest annotaties (posities, waarden, types)
- Push via specklepy als aparte branch
- MontyViewer rendert CSS2D labels / HTML overlays
- Pro: Revit schoon, volle controle | Con: Meer werk

**Optie C:** Hybride
- Model lines voor lijnwerk, tekst als metadata, viewer rendert labels

### View Hyperlinks
Clickbare objecten in 3D die een Revit view representeren:
1. Camera sprong naar juiste positie + oriëntatie
2. Annotaties laden (branch activeren)
3. PDF tonen (side panel of overlay)

Data per hyperlink: positie, oriëntatie, annotatie-link, PDF-link, view naam/type

---

## Interactieve 3D Lagen (concept 2026-03-27)

Drie gescheiden interactiepatronen die elk een ander doel dienen. Moeten los van elkaar werken maar delen dezelfde technische basis (`ViewerEvent.ObjectClicked` + `filtering.setUserObjectColors()` / `filtering.isolateObjects()`).

### Laag 1: Renvooi / Legenda

**Doel:** "Wat voor elementen zitten er in dit model?"

Interactieve legenda die automatisch wordt opgebouwd uit de unieke family types in het model. Klik op een regel → alle instanties van dat type highlighten.

**Datastroom:**
1. Bij model load: WorldTree walken → `raw.category` en `raw.name` ophalen per element
2. Voor gedetailleerde family/type info: batch REST API fetch (zelfde patroon als `mark-parser.ts`)
3. Unieke family types groeperen → renvooi panel genereren met symbool + naam + aantal

**UI:**
- Panel links of als overlay, vergelijkbaar met model-panel
- Per family type: symbool/kleur + naam + aantal instanties
- Klik regel → `filtering.setUserObjectColors()` voor highlight + `filtering.isolateObjects()` voor dimmen
- **Bidirectioneel:** klik element in 3D → bijbehorende renvooiregel licht op (via `ViewerEvent.ObjectClicked` → lookup family type)

**Technische noot:** Oppervlakkige properties (`category`, `name`) zitten op `node.model.raw`. Family Name en Type Name zitten in `Instance Parameters` en vereisen REST API fetch (`/objects/{stream}/{obj}/single`), net als de Mark-fetch in `mark-parser.ts`.

**Waarde:** Vervangt statische 2D legenda. Klant klikt op "waterslag" → alle waterslagen oplichten met hoeveelheid. Krachtig voor presentaties.

---

### Laag 2: Leveringen / Kratten

**Doel:** "Wat gaat er wanneer de deur uit?"

Symbolische krat-objecten in het Revit model die een levering representeren. Klik op krat → alle elementen in die levering highlighten.

**Datastroom:**
1. Elk gevelpaneel in Revit krijgt parameter `Levering_ID` (bijv. "L-03")
2. Symbolisch krat-object krijgt dezelfde property `delivery_id = "L-03"`
3. Bij klik op krat: `ViewerEvent.ObjectClicked` → lees `delivery_id` uit via REST API
4. WorldTree walken of cached mapping → alle elementen met matching `Levering_ID` ophalen
5. `filtering.isolateObjects(matchingIds, undefined, true, true)` + `filtering.setUserObjectColors([{ objectIds: matchingIds, color }])`

**Belangrijk:** Altijd `filtering.removeUserObjectColors()` aanroepen vóór nieuwe filter-acties (Speckle valkuil: `setUserObjectColors` overschrijft `isolateObjects`).

**UI suggestie:** Krat licht op, sidebar toont "Levering L-03 — 14 elementen — week 23"

**Revit-vereiste:** `Levering_ID` parameter toevoegen aan zowel panelen als krat-objecten. Krat kan een simpele Generic Model family zijn.

---

### Laag 3: Details / Uitsneden

**Doel:** "Hoe zit dit specifieke punt in elkaar?"

3D objecten die een detail symboliseren (bijv. een snijvlak-icoon). Klik → camera springt naar de juiste positie + annotaties worden zichtbaar.

**Drie acties bij klik:**
1. **Camera fly-to:** `camera.setCameraView({ position, target, up })` via CameraController extension
2. **Bounding box:** Elementen getagd met `detail_ref` → gezamenlijke bounding box berekenen → section box of visuele overlay
3. **Annotaties laden:** Bijbehorende annotatie-branch activeren (zie Annotatie-strategie Optie B)

**Data per detail-symbool (als Revit parameters):**
- `detail_view`: naam (bijv. "Hoekdetail-N")
- `camera_position`, `camera_target`, `camera_up`: opgeslagen viewpoint
- `detail_ref`: tag die bij het detail horende elementen identificeert
- Optioneel: link naar PDF tekening

**Revit workflow:** PyRevit script exporteert view-metadata (naam, type, viewpoint, section box bounds, gekoppelde sheet/PDF) als custom parameters op de detail-symbool families, of als JSON → aparte Speckle branch.

**Hoort NIET in de legenda** — details zijn unieke locaties in het gebouw, geen herhaalbare element types. Eigen navigatie-tab: "Details & Uitsneden".

---

### Samenvatting interactielagen

| Laag | Trigger | Actie | Data nodig in Revit |
|------|---------|-------|---------------------|
| Renvooi | Klik legendaregel | Highlight alle instanties van family type | Geen extra — family info zit al in model |
| Leveringen | Klik krat-object | Highlight alle elementen in levering | `Levering_ID` op panelen + kratten |
| Details | Klik detail-symbool | Camera fly-to + annotaties + bounding box | `detail_view`, camera data, `detail_ref` |

Alle drie gebruiken hetzelfde technische patroon: `ViewerEvent.ObjectClicked` → property lookup → `filtering.isolateObjects()` + `filtering.setUserObjectColors()`. Het verschil zit in de property die je leest en de bijbehorende UI-actie.

---

## Technische Inzichten uit Prototypes

### ThatOpen (v2 + v3) lessen
- web-ifc versie-afhankelijkheid (v0.0.66 vs v0.0.72)
- Three.js versie moet exact matchen
- v3 API breekt met v2 (geen `classifier.byEntity()` meer)
- WASM worker via blob URL voor CORS
- Fragment visibility: `defaultVisibility` + `exceptionComponents` (Set van GUIDs)
- `model.getItemsOfCategories([regex])` voor filtering

### Speckle lessen (productie)
- SectionTool is stub → OrientedSectionTool gebruiken
- ExplodeExtension: setExplode(0) + disabled vereist 2x requestAnimationFrame
- WorldTree nested params zijn referenties → REST API fetch nodig
- CLT_T_Mark in Instance Parameters > Text groep
- Identity Data/Mark op CLT TAG = altijd 0 → negeren
- setUserObjectColors overschrijft hideObjects/isolateObjects
- requestRender() nodig na filters buiten Speckle event loop
- npm overrides nodig voor objectloader2 en shared

### BCF (uit bcftest prototype)
- Volledige BCF implementatie bestaat al in ThatOpen v3 prototype
- Topics: title, description, status (Active/Resolved/Closed), type (Issue/Request/Comment)
- Viewpoints: camera position + element visibility state opgeslagen
- Import/export als .bcf zip bestanden
- **Hergebruik mogelijk:** BCF logica kan geport worden naar Speckle-based viewer

### CLT Nesting inzichten
- Arrow geometries 220mm lang (range 180-280mm)
- Tags zijn IFCBUILDINGELEMENTPROXY met "CLT TAG" in naam
- Origin: bottom-left (0,0), X→right, Y→up
- Kan relevant zijn voor geavanceerde CLT visualisatie in MontyViewer

---

## Samenvatting: Wat is er, wat mist er

### Sterktes (gerealiseerd)
- Core viewer LIVE met bouwvolgorde
- Multi-select + context menu + linked Mark
- Speckle self-hosted (data ownership)
- Responsive mobiel/tablet
- TypeScript, modulair, goed gedocumenteerd

### Grootste gaps (niet gerealiseerd)
1. **Revenue = €0** — geen klant betaalt nog, geen pricing actief
2. **Geen projecten overview** — klant krijgt losse URL, geen landing page
3. **Geen BCF** — prototype bestaat maar niet geïntegreerd
4. **Geen annotaties** — strategie uitgewerkt maar niet gebouwd
5. **Geen filtering op parameters** — alleen bouwvolgorde-based
6. **Geen IFC upload** — alleen via Revit Connector push
7. **Geen self-hosting** — draait op Vercel (Speckle wel op NAS)

### Quick wins (laag effort, hoge waarde)
1. Projecten overview Niveau 1 (JSON + landing page, 1-2 dagen)
2. Camera preset views (Front/Back/Left/Right/Top, halve dag)
3. Category filtering (toggle per type, 1 dag)
4. Keyboard shortcuts (F/Delete/Escape, halve dag)
5. Isoleer/Verberg knoppen in property panel (halve dag)
