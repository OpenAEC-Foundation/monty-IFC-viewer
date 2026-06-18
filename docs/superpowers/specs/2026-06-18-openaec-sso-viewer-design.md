# Ontwerp: Monty-viewer met OpenAEC Cloud SSO

**Datum:** 2026-06-18
**Branch:** `OpenAEC-fork`
**Status:** Gevalideerd ontwerp — klaar voor implementatieplan

## Context

De Monty IFC-viewer is een static SPA (Vite + TypeScript, `@speckle/viewer`)
die nu **publieke** modellen laadt van een Speckle-server. De app bevat naast
de viewer ook client/project-landingpagina's en bijbehorende routing.

Voor inzet binnen **OpenAEC Cloud** is een variant nodig die:

1. alleen het viewer-deel behoudt (landing eruit);
2. de gebruiker laat inloggen via OpenAEC Cloud SSO (Zitadel, OIDC/OAuth2);
3. ná login met het access-token de toegestane projecten/modellen ophaalt uit
   een Speckle-server die het OIDC-token accepteert.

Doel: een ingelogde OpenAEC-gebruiker ziet alleen z'n eigen, beveiligde
modellen in dezelfde volwaardige viewer-UI als nu.

## Gevalideerde keuzes

| Onderwerp | Keuze |
|-----------|-------|
| Vorm | Bestaande app behouden, landing eruit, SSO-gate ervoor |
| Rol SSO | Token regelt toegang én haalt de modellen op |
| Model-bron | OpenAEC Cloud = Speckle-server die het OIDC-token accepteert |
| OIDC-flow | `oidc-client-ts` (Authorization Code + PKCE, public client) |
| Modelkeuze | Projectkiezer na login + deeplink `?project=<id>` |

## Architectuur

### Componenten (units, elk één verantwoordelijkheid)

1. **`src/core/auth.ts` (nieuw)** — OIDC-laag.
   - Eén `UserManager` (`oidc-client-ts`), Authorization Code + PKCE, public
     client, tokens in `sessionStorage`, automatic silent renew.
   - Publieke API: `getUser()`, `login()`, `logout()`, `handleCallback()`,
     `getAccessToken(): string | null`.
   - Config volledig uit env (zie Config), geen hardcoded secrets.
   - Afhankelijkheden: `oidc-client-ts`, env-variabelen.

2. **`auth/callback.html` (nieuw)** — minimale OIDC-redirect-entry.
   - Roept `handleCallback()` aan en navigeert terug naar `/` (of de
     opgeslagen deeplink). Past in de bestaande Vite-MPA-opzet.

3. **`src/main.ts` (aangepast)** — gate + bootstrap.
   - Volgorde: op `/auth/callback`? → `handleCallback()`. Anders →
     `getUser()`; geen geldige sessie → `login()` (redirect naar Zitadel).
   - Pas met een geldig token: `initViewer()` → projectresolutie →
     model-loading. Logout-knop in de overlay.
   - Verwijdert de legacy `?client`-redirect en de landing-redirects.

4. **`src/core/viewer-setup.ts` (aangepast)** — Speckle-server uit env.
   - `SPECKLE_SERVER` wordt `import.meta.env.VITE_SPECKLE_SERVER` i.p.v. de
     hardcoded URL. Verder ongewijzigd.

5. **`src/core/stream-loader.ts` (aangepast)** — token-bewust laden.
   - Alle GraphQL-`fetch`-calls krijgen `Authorization: Bearer <token>`.
   - `SpeckleLoader(tree, url, token)` krijgt het access-token i.p.v. `""`.
   - Nieuwe functie `listUserProjects()`: Speckle GraphQL
     `activeUser { projects { items { id name } } }` → projecten waar de
     gebruiker toegang toe heeft.

6. **`src/ui/project-picker.ts` (nieuw)** — projectkiezer.
   - Toont na login een lijst van `listUserProjects()`; klik zet
     `?project=<id>` en start model-loading. Functionele kiezer, geen
     marketing-landing. Wordt overgeslagen bij een deeplink.

### Data-flow

```
laad app
  ├─ op /auth/callback?  → handleCallback() → redirect naar / (of deeplink)
  └─ getUser()
       ├─ geen sessie → login() → Zitadel /authorize → terug op /auth/callback
       └─ geldig token
            ├─ ?project=<id> aanwezig → initViewer() → loadStream(token)
            └─ geen project → listUserProjects(token) → project-picker
                 → keuze zet ?project=<id> → initViewer() → loadStream(token)
```

### Opruimen (landing eruit)

- Verwijderen: `src/landing/*`, `landing/*.html`, `src/core/route.ts`
  (hangt aan de landing-config `CLIENT_CONFIGS`).
- `vite.config.ts`: `landing`-input en de client/project-`cleanUrlRoutes`-
  middleware eruit; `auth/callback.html` als input erbij.
- `index.html`: ongewijzigd (blijft de viewer-entry).

## Config & secrets

Alle omgevingsafhankelijke waarden via Vite-env (`.env.local`, niet committen;
`.env.example` wél committen):

- `VITE_OIDC_ISSUER` — productie Zitadel-issuer-URL
- `VITE_OIDC_CLIENT_ID` — SPA public client-id
- `VITE_OIDC_SCOPES` — aangevraagde scopes (incl. wat Speckle voor autorisatie
  nodig heeft)
- `VITE_SPECKLE_SERVER` — OpenAEC Speckle-server-URL
- redirect_uri = `<origin>/auth/callback`

De concrete waarden komen van het OpenAEC Cloud-team (uitstaande afstemming):
productie-issuer, SPA-clientregistratie + toegestane redirect_uri's, of de
Speckle-server het Zitadel-token rechtstreeks accepteert of dat token-exchange
nodig is, en de vereiste scopes/claims.

**Tot die er zijn:** een dev-fallback (lokale Zitadel-issuer + publieke
Speckle-server) zodat de flow lokaal end-to-end getest kan worden. Als blijkt
dat de Speckle-server het Zitadel-token niet rechtstreeks accepteert maar een
token-exchange/bridge nodig is, is dat een toevoeging aan `auth.ts`
(token-exchange-stap) zonder de rest van het ontwerp te raken.

## Foutafhandeling

- Mislukte login / verlopen token → terug naar `login()`.
- `listUserProjects()` leeg → nette melding ("geen projecten beschikbaar").
- Model-load-fout → bestaande `showMessage()`-afhandeling.
- Speckle-401 (token afgewezen) → token verversen; blijft het falen →
  logout + login.

## Verificatie

1. `npm install` (incl. `oidc-client-ts`), `npm run dev`.
2. Onge­authenticeerd `/` openen → redirect naar Zitadel-login (dev-issuer).
3. Na login → terug op `/`, projectkiezer toont projecten van de gebruiker.
4. Project kiezen → model laadt; GraphQL + object-requests dragen de Bearer-
   header (controleren via netwerk-tab / Claude-Preview).
5. Deeplink `?project=<id>` → kiezer overgeslagen, model laadt direct.
6. Logout → sessie weg, volgende load vraagt opnieuw login.
7. Playwright/Claude-Preview-smoketest op de login→viewer-flow.

## Out of scope (YAGNI)

- Geen backend/BFF (puur static blijft).
- Geen herinvoer van de marketing-landing of client/project-routing.
- Geen rolbeheer/permissies in de viewer zelf — autorisatie ligt bij Speckle
  + het OIDC-token.
