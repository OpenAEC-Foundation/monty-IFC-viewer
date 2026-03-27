import type { PhaseMapping } from "../addons/bouwvolgorde/mark-parser";
import type { ViewerInstance } from "../core/viewer-setup";
import { resetFilters } from "./context-menu";
import type { PanelParts } from "./model-panel";

const FILTER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;

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

  // --- Mark filter ---
  body.appendChild(createMarkFilter(instance, mapping));

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
    const markInput = panel.querySelector<HTMLInputElement>(".fp-mark-input");
    if (markInput) markInput.value = "";
    panel.querySelectorAll<HTMLInputElement>(".fp-type-cb").forEach((cb) => {
      cb.checked = false;
    });
  });
  body.appendChild(resetBtn);

  panel.appendChild(header);
  panel.appendChild(body);

  return { button, panel };
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

    // Reset first, then isolate — prevents stacking of previous filters
    instance.filtering.removeUserObjectColors();
    instance.filtering.resetFilters();
    instance.filtering.isolateObjects(ids, undefined, true, true);
    forceRender(instance);
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
    instance.filtering.removeUserObjectColors();
    instance.filtering.resetFilters();
    forceRender(instance);
    return;
  }

  const visibleIds: string[] = [];
  for (const cb of checked) {
    const typeName = cb.dataset.type!;
    const ids = mapping.typeToIds.get(typeName);
    if (ids) visibleIds.push(...ids);
  }

  // Reset first, then apply new isolation — isolateObjects is additive
  instance.filtering.removeUserObjectColors();
  instance.filtering.resetFilters();
  instance.filtering.isolateObjects(visibleIds, undefined, true, true);
  forceRender(instance);
}
