# Monty IFC Viewer

Een webgebaseerde IFC (Industry Foundation Classes) viewer met bouwvolgorde visualisatie. Bekijk en analyseer BIM-modellen direct in je browser.

## Features

- **IFC Bestanden Laden** - Sleep IFC bestanden direct in de browser of gebruik de bestandskiezer
- **3D Visualisatie** - Interactieve 3D weergave van BIM-modellen met Three.js
- **Bouwvolgorde Animatie** - Visualiseer de bouwvolgorde stap voor stap met afspeelcontroles
- **Parameter Selectie** - Kies welke IFC parameter gebruikt wordt voor de volgorde
- **Element Eigenschappen** - Bekijk alle eigenschappen van geselecteerde elementen
- **Element Highlighting** - Klik op elementen om ze te selecteren en te highlighten
- **Camera Controls** - Zoom, pan en roteer rond het model
- **Dark Theme** - Moderne donkere interface

## Technologie

- [Three.js](https://threejs.org/) - 3D rendering engine
- [web-ifc](https://github.com/IFCjs/web-ifc) - IFC parsing library
- Vanilla JavaScript - Geen framework dependencies

## Gebruik

1. Open de viewer in je browser
2. Sleep een `.ifc` bestand naar het dropzone of klik om een bestand te selecteren
3. Selecteer een parameter voor de bouwvolgorde (bijv. `IfcBuildingStorey`)
4. Gebruik de afspeelknoppen om de bouwvolgorde te animeren
5. Klik op elementen voor meer details

## Keyboard Shortcuts

| Toets | Actie |
|-------|-------|
| `Space` | Play/Pause animatie |
| `←` | Vorige stap |
| `→` | Volgende stap |
| `R` | Reset camera |
| `Escape` | Deselecteer element |

## Live Demo

Bekijk de live demo op: https://openaec-foundation.github.io/monty-IFC-viewer/

## Auteur

Gemaakt door **Piet Mol**

## Licentie

Open source - Onderdeel van de [Open AEC Foundation](https://openaec-foundation.github.io/website/)

## Over Open AEC Foundation

De Open AEC Foundation ontwikkelt, ondersteunt en promoot open source software voor de volledige bouwketen - van ontwerp tot oplevering en beheer.
