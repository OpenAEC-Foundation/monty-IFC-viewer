import type { PhaseMapping } from "../addons/bouwvolgorde/mark-parser";
import type { ViewerInstance } from "../core/viewer-setup";
import { resetFilters } from "./context-menu";
import type { PanelParts } from "./model-panel";
import { applyCltOverlay, getCltHidden, setCltHidden, onCltHiddenChange } from "../core/filter-state";

const FILTER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;

/** Tracks currently active isolation IDs within the filter panel (null = no section active). */
let activeVisibleIds: string[] | null = null;

/** Centralised filter application: isolate (optional) + CLT overlay + render. */
function applyFilter(
  instance: ViewerInstance,
  visibleIds: string[] | null
): void {
  instance.filtering.removeUserObjectColors();
  instance.filtering.resetFilters();
  if (visibleIds !== null && visibleIds.length > 0) {
    instance.filtering.isolateObjects(visibleIds, undefined, true, true);
  }
  applyCltOverlay(instance);
  forceRender(instance);
  activeVisibleIds = visibleIds;
}

/**
 * Creates the filter button + panel.
 * Returns button and panel separately for layout by caller.
 */
export function createFilterPanel(
  instance: ViewerInstance,
  mapping: PhaseMapping
): PanelParts {
  const button = document.createElement("button");
  button.className = "left-tb-btn";
  button.title = "Filtering";
  button.innerHTML = FILTER_ICON;

  const panel = document.createElement("div");
  panel.id = "filter-panel";
  panel.classList.add("hidden");

  button.addEventListener("click", () => {
    // Close sibling panels
    document.getElementById("model-panel")?.classList.add("hidden");
    panel.classList.toggle("hidden");
  });

  // Header
  const header = document.createElement("div");
  header.className = "mp-header";
  const title = document.createElement("span");
  title.className = "mp-title";
  title.textContent = "Filtering";
  const closeBtn = document.createElement("button");
  closeBtn.className = "mp-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => panel.classList.add("hidden"));
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "fp-body";

  // --- CLT tags toggle (top) ---
  if (mapping.cltTagIds.length > 0) {
    body.appendChild(createCltToggle(instance));
  }

  // --- Mark filter ---
  body.appendChild(createMarkFilter(instance, mapping));

  // --- Collectie filter ---
  if (mapping.collectieToIds.size > 0) {
    body.appendChild(createCollectieFilter(instance, mapping));
  }

  // --- Type filter ---
  if (mapping.typeToIds.size > 0) {
    body.appendChild(createTypeFilter(instance, mapping));
  }

  // --- Reset ---
  const resetBtn = document.createElement("button");
  resetBtn.className = "fp-reset-btn";
  resetBtn.textContent = "Reset filters";
  resetBtn.addEventListener("click", () => {
    resetFilters();
    activeVisibleIds = null;
    setCltHidden(false);
    const markInput = panel.querySelector<HTMLInputElement>(".fp-mark-input");
    if (markInput) markInput.value = "";
    panel.querySelectorAll<HTMLInputElement>(".fp-collectie-cb").forEach((cb) => {
      cb.checked = false;
    });
    panel.querySelectorAll<HTMLInputElement>(".fp-type-cb").forEach((cb) => {
      cb.checked = false;
    });
    const cltCb = panel.querySelector<HTMLInputElement>(".fp-clt-cb");
    if (cltCb) cltCb.checked = true;
  });
  body.appendChild(resetBtn);

  panel.appendChild(header);
  panel.appendChild(body);

  return { button, panel };
}

function createCltToggle(instance: ViewerInstance): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "fp-clt-toggle";

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "fp-clt-cb";
  // checked = visible (consistent with model checkboxes)
  cb.checked = !getCltHidden();

  const text = document.createElement("span");
  text.className = "fp-clt-label";
  text.textContent = "CLT tags";

  cb.addEventListener("change", () => {
    setCltHidden(!cb.checked);
    // Re-apply current filter state so the overlay takes effect immediately
    applyFilter(instance, activeVisibleIds);
  });

  // Keep the checkbox in sync if state is changed from elsewhere
  onCltHiddenChange((hidden) => {
    const shouldBe = !hidden;
    if (cb.checked !== shouldBe) cb.checked = shouldBe;
  });

  wrap.appendChild(cb);
  wrap.appendChild(text);
  return wrap;
}

function createMarkFilter(
  instance: ViewerInstance,
  mapping: PhaseMapping
): HTMLElement {
  const section = document.createElement("div");
  section.className = "fp-section";

  const label = document.createElement("div");
  label.className = "fp-section-label";
  label.textContent = "Mark";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "fp-mark-input";
  input.placeholder = `Bijv. ${mapping.phases[0] || "101"}`;

  const applyBtn = document.createElement("button");
  applyBtn.className = "fp-apply-btn";
  applyBtn.textContent = "Filter";

  function applyMarkFilter(): void {
    const val = input.value.trim();
    if (!val) return;

    const ids = mapping.markToIds.get(val);
    if (!ids || ids.length === 0) {
      input.classList.add("fp-no-match");
      setTimeout(() => input.classList.remove("fp-no-match"), 800);
      return;
    }

    applyFilter(instance, ids);
  }

  applyBtn.addEventListener("click", applyMarkFilter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyMarkFilter();
  });

  const row = document.createElement("div");
  row.className = "fp-mark-row";
  row.appendChild(input);
  row.appendChild(applyBtn);

  section.appendChild(label);
  section.appendChild(row);
  return section;
}

function createCollectieFilter(
  instance: ViewerInstance,
  mapping: PhaseMapping
): HTMLElement {
  const section = document.createElement("div");
  section.className = "fp-section";

  const label = document.createElement("div");
  label.className = "fp-section-label";
  label.textContent = "Collectie";

  section.appendChild(label);

  const sortedCollecties = Array.from(mapping.collectieToIds.entries()).sort(
    (a, b) => a[0] - b[0]
  );

  const list = document.createElement("div");
  list.className = "fp-type-list";

  for (const [collectie, ids] of sortedCollecties) {
    const start = collectie * 100;
    const end = start + 99;

    const item = document.createElement("label");
    item.className = "fp-type-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "fp-collectie-cb";
    cb.dataset.collectie = String(collectie);

    const text = document.createElement("span");
    text.className = "fp-type-name";
    text.textContent = `${start}–${end}`;

    const count = document.createElement("span");
    count.className = "fp-type-count";
    count.textContent = String(ids.length);

    cb.addEventListener("change", () => applyCollectieFilter(instance, mapping, list));

    item.appendChild(cb);
    item.appendChild(text);
    item.appendChild(count);
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function applyCollectieFilter(
  instance: ViewerInstance,
  mapping: PhaseMapping,
  list: HTMLElement
): void {
  const checked = Array.from(
    list.querySelectorAll<HTMLInputElement>(".fp-collectie-cb:checked")
  );

  if (checked.length === 0) {
    applyFilter(instance, null);
    return;
  }

  const visibleIds: string[] = [];
  for (const cb of checked) {
    const collectie = parseInt(cb.dataset.collectie!, 10);
    const ids = mapping.collectieToIds.get(collectie);
    if (ids) visibleIds.push(...ids);
  }

  applyFilter(instance, visibleIds);
}

function createTypeFilter(
  instance: ViewerInstance,
  mapping: PhaseMapping
): HTMLElement {
  const section = document.createElement("div");
  section.className = "fp-section";

  const label = document.createElement("div");
  label.className = "fp-section-label";
  label.textContent = "Type";

  section.appendChild(label);

  const sortedTypes = Array.from(mapping.typeToIds.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { numeric: true })
  );

  const list = document.createElement("div");
  list.className = "fp-type-list";

  for (const [typeName, ids] of sortedTypes) {
    const item = document.createElement("label");
    item.className = "fp-type-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "fp-type-cb";
    cb.dataset.type = typeName;

    const text = document.createElement("span");
    text.className = "fp-type-name";
    text.textContent = typeName;
    text.title = typeName;

    const count = document.createElement("span");
    count.className = "fp-type-count";
    count.textContent = String(ids.length);

    cb.addEventListener("change", () => applyTypeFilter(instance, mapping, list));

    item.appendChild(cb);
    item.appendChild(text);
    item.appendChild(count);
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

/** Force a double render to ensure Speckle updates visually */
function forceRender(instance: ViewerInstance): void {
  instance.viewer.requestRender();
  requestAnimationFrame(() => {
    instance.viewer.requestRender();
  });
}

function applyTypeFilter(
  instance: ViewerInstance,
  mapping: PhaseMapping,
  list: HTMLElement
): void {
  const checked = Array.from(
    list.querySelectorAll<HTMLInputElement>(".fp-type-cb:checked")
  );

  if (checked.length === 0) {
    applyFilter(instance, null);
    return;
  }

  const visibleIds: string[] = [];
  for (const cb of checked) {
    const typeName = cb.dataset.type!;
    const ids = mapping.typeToIds.get(typeName);
    if (ids) visibleIds.push(...ids);
  }

  applyFilter(instance, visibleIds);
}
