import { DEFAULT_CONFIG, PHASE_STYLES, type Project, type MontyConfig } from "./projects-config";
import { loadThumbnail, mkPlaceholder } from "./thumbnail-loader";

declare global {
  interface Window {
    MONTY_CONFIG?: MontyConfig;
  }
}

// Config: injected via window.MONTY_CONFIG or fallback to projects-config.ts
const cfg: MontyConfig = window.MONTY_CONFIG ?? DEFAULT_CONFIG;
const { client: CLIENT_NAME, freeLimit: FREE_LIMIT, projects: PROJECTS } = cfg;

// ── Helpers ──

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function fmtNum(n: number): string {
  return n ? n.toLocaleString("nl-NL") : "\u2014";
}

function mapsUrl(lat: number, lng: number, label: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`;
}

// ── Demo / Upsell logic ──

const isLimited = PROJECTS.length >= FREE_LIMIT;

if (isLimited) {
  document.getElementById("demo-banner")!.classList.add("show");
  document.getElementById("demo-pill")!.classList.add("show");
  document.getElementById("upsell-wrap")!.classList.add("show");

  const used = Math.min(PROJECTS.length, FREE_LIMIT);
  document.getElementById("upsell-text")!.innerHTML =
    `<strong>Projectlimiet bereikt \u2014 Demo plan (0 van ${FREE_LIMIT} gratis projecten beschikbaar)</strong>
     <p>Uw demotoegang is verbruikt. Upgrade naar <a href="https://montyviewer.com/contact/">Monty Viewer</a> voor onbeperkte toegang.</p>`;
  document.getElementById("limit-label")!.textContent = `${used} / ${FREE_LIMIT}`;
  (document.getElementById("limit-fill") as HTMLElement).style.width = `${(used / FREE_LIMIT) * 100}%`;

  document.getElementById("stat-plan")!.textContent = "Demo";
  (document.getElementById("stat-plan") as HTMLElement).style.fontSize = "1.4rem";
  (document.getElementById("stat-plan") as HTMLElement).style.paddingTop = "4px";

  // Change CTA button text
  document.getElementById("topbar-cta")!.textContent = "Upgrade";
} else {
  document.getElementById("stat-plan")!.textContent = initials(CLIENT_NAME);
  document.getElementById("topbar-cta")!.textContent = "Probeer Monty";
}

// ── Header / stats ──

document.getElementById("chip-av")!.textContent = initials(CLIENT_NAME);
document.getElementById("chip-name")!.textContent = CLIENT_NAME;
document.getElementById("hero-label")!.textContent = `${CLIENT_NAME} \u2014 Projecten overzicht`;
document.getElementById("stat-count")!.textContent = String(PROJECTS.length);
document.getElementById("stat-active")!.textContent = String(PROJECTS.filter(p => p.active).length);
document.title = `${CLIENT_NAME} \u2014 MontyViewer`;

// ── Toolbar (dynamic filter buttons) ──

function buildToolbar(): void {
  const toolbar = document.getElementById("toolbar")!;
  const types = [...new Set(PROJECTS.map(p => p.type))];

  const allBtn = document.createElement("button");
  allBtn.className = "f-btn active";
  allBtn.dataset.filter = "all";
  allBtn.textContent = "Alle";
  toolbar.appendChild(allBtn);

  for (const t of types) {
    const btn = document.createElement("button");
    btn.className = "f-btn";
    btn.dataset.filter = t;
    btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    toolbar.appendChild(btn);
  }

  const gap = document.createElement("div");
  gap.className = "t-gap";
  toolbar.appendChild(gap);

  const searchBox = document.createElement("div");
  searchBox.className = "search-box";
  searchBox.innerHTML = `
    <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input id="search" type="text" placeholder="Zoeken\u2026" autocomplete="off">`;
  toolbar.appendChild(searchBox);
}

// ── Card builder ──

const PIN_SVG = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 1C5.24 1 3 3.24 3 6c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z"/><circle cx="8" cy="6" r="2"/></svg>`;

function mkCard(proj: Project, origIdx: number, delay: number): HTMLElement {
  const locked = origIdx >= FREE_LIMIT;
  const ps = PHASE_STYLES[proj.phase] ?? PHASE_STYLES["AO"];
  const hasCoords = proj.lat != null && proj.lng != null;
  const mapUrl = hasCoords ? mapsUrl(proj.lat!, proj.lng!, proj.title) : null;

  const card = document.createElement(locked ? "div" : "a");
  if (!locked) (card as HTMLAnchorElement).href = `/?project=${proj.id}&from=${new URLSearchParams(location.search).get("client") ?? "demo"}`;
  card.className = "p-card" + (locked ? " locked" : "");
  card.style.animationDelay = `${delay}ms`;
  card.dataset.type = proj.type;

  const locationHTML = proj.location
    ? (mapUrl && !locked)
      ? `<a class="p-location" href="${mapUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${PIN_SVG} ${proj.location}</a>`
      : `<span class="p-location">${PIN_SVG} ${proj.location}</span>`
    : "";

  const footerRight = locked
    ? `<div class="p-upgrade-prompt">
         <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#E8722A" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="12" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>
         <a href="https://montyviewer.com/contact/" style="color:var(--orange);font-size:12px;font-weight:700;text-decoration:none;">Upgrade om te openen</a>
       </div>`
    : `<div class="p-open">Bekijk
         <div class="open-btn"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#E8722A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></div>
       </div>`;

  card.innerHTML = `
    <div class="p-thumb">
      <img alt="${proj.title}">
      <div class="p-placeholder">${mkPlaceholder(proj)}</div>
      <span class="p-phase" style="background:${ps.bg};color:${ps.color};border:1px solid ${ps.border};">${proj.phase}</span>
      ${proj.active && !locked ? `<span class="p-active"><span class="p-dot"></span>Actief</span>` : ""}
      ${locked ? `<div class="p-lock-overlay"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>` : ""}
    </div>
    <div class="p-body">
      <p class="p-type">${proj.type}</p>
      <h2 class="p-title">${proj.title}</h2>
      <p class="p-desc">${proj.description}</p>
      ${locationHTML}
      <div class="p-divider"></div>
      <div class="p-footer">
        <div class="p-data">
          <div class="d-item"><span class="d-lbl">Bijgewerkt</span><span class="d-val">${fmtDate(proj.updated)}</span></div>
          ${proj.elements ? `<div class="d-item"><span class="d-lbl">Elementen</span><span class="d-val">${fmtNum(proj.elements)}</span></div>` : ""}
        </div>
        ${footerRight}
      </div>
    </div>`;

  if (!locked) {
    const img = card.querySelector("img")!;
    const ph = card.querySelector(".p-placeholder")!;
    loadThumbnail(img, ph, proj);
  }

  return card;
}

// ── Grid rendering ──

const grid = document.getElementById("grid")!;
const countEl = document.getElementById("result-count")!;
let filter = "all";
let query = "";

function draw(list: Project[]): void {
  grid.innerHTML = "";
  countEl.textContent = list.length + " resultaten";
  if (!list.length) {
    grid.innerHTML = `
      <div class="p-empty">
        <div class="e-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <p>Geen projecten gevonden</p>
      </div>`;
    return;
  }
  list.forEach((proj, i) => {
    const origIdx = PROJECTS.indexOf(proj);
    const card = mkCard(proj, origIdx, i * 50);
    grid.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("vis")));
  });
}

function sortProjects(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const aExec = a.phase === "Uitvoering" ? 0 : 1;
    const bExec = b.phase === "Uitvoering" ? 0 : 1;
    return aExec - bExec;
  });
}

function apply(): void {
  const filtered = PROJECTS.filter(pr =>
    (filter === "all" || pr.type === filter) &&
    (!query || (pr.title + " " + pr.description + " " + (pr.location ?? "")).toLowerCase().includes(query))
  );
  draw(sortProjects(filtered));
}

// ── Init ──

buildToolbar();

document.querySelectorAll<HTMLButtonElement>(".f-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".f-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter ?? "all";
    apply();
  });
});

document.getElementById("search")!.addEventListener("input", (e) => {
  query = (e.target as HTMLInputElement).value.toLowerCase().trim();
  apply();
});

apply();
