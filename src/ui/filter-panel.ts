import type { PhaseMapping } from "../addons/bouwvolgorde/mark-parser";
import type { ViewerInstance } from "../core/viewer-setup";
import { selectedIds, isolateSelected, hasActiveFilters, resetFilters } from "./context-menu";

const FILTER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;

/**
 * Creates the filter panel with Mark input and Type selection.
 * Positioned below the model toggle button on the left side.
 */
export function createFilterPanel(
  instance: ViewerInstance,
  mapping: PhaseMapping,
  hasModelPanel = true
): HTMLElement {
  const wrapper = document.createElement("div");

  // Floating toggle button — position below model button if present
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "filter-toggle-btn";
  toggleBtn.title = "Filtering";
  toggleBtn.innerHTML = FILTER_ICON;
  if (!hasModelPanel) {
    toggleBtn.style.top = "70px";
  }

  // Dropdown panel
  const panel = document.createElement("div");
  panel.id = "filter-panel";
  panel.classList.add("hidden");
  if (!hasModelPanel) {
    panel.style.top = "124px";
  }

  toggleBtn.addEventListener("click", () => {
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
    // Clear Mark input
    const markInput = panel.querySelector<HTMLInputElement>(".fp-mark-input");
    if (markInput) markInput.value = "";
    // Uncheck all type checkboxes
    panel.querySelectorAll<HTMLInputElement>(".fp-type-cb").forEach((cb) => {
      cb.checked = false;
    });
  });
  body.appendChild(resetBtn);

  panel.appendChild(header);
  panel.appendChild(body);
  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(panel);

  return wrapper;
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

    instance.filtering.removeUserObjectColors();
    instance.filtering.isolateObjects(ids, undefined, true, true);
    instance.viewer.requestRender();
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

  // Sort types alphabetically, show count
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

function applyTypeFilter(
  instance: ViewerInstance,
  mapping: PhaseMapping,
  list: HTMLElement
): void {
  const checked = Array.from(
    list.querySelectorAll<HTMLInputElement>(".fp-type-cb:checked")
  );

  if (checked.length === 0) {
    // No filter — reset
    instance.filtering.removeUserObjectColors();
    instance.filtering.resetFilters();
    instance.viewer.requestRender();
    return;
  }

  // Collect all IDs from checked types
  const visibleIds: string[] = [];
  for (const cb of checked) {
    const typeName = cb.dataset.type!;
    const ids = mapping.typeToIds.get(typeName);
    if (ids) visibleIds.push(...ids);
  }

  instance.filtering.removeUserObjectColors();
  instance.filtering.isolateObjects(visibleIds, undefined, true, true);
  instance.viewer.requestRender();
}
