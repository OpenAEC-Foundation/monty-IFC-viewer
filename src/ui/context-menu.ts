import { ViewerEvent, type SelectionEvent } from "@speckle/viewer";
import type { ViewerInstance } from "../core/viewer-setup";
import type { PhaseMapping } from "../addons/bouwvolgorde/mark-parser";

const SELECTION_COLOR = "#4fc3f7"; // Light blue for selection highlight

/** Selected element IDs (multi-select with Ctrl/Shift+click) */
export const selectedIds = new Set<string>();

/** Whether filters are currently active (isolate/hide) */
export let hasActiveFilters = false;

let _mapping: PhaseMapping | null = null;
let _instance: ViewerInstance | null = null;

export function setContextMenuMapping(mapping: PhaseMapping): void {
  _mapping = mapping;
}

/** Expand a single ID to its mark group (Part + Generic Model) */
function expandToMarkGroup(id: string): string[] {
  if (!_mapping) return [id];
  const mark = _mapping.nodeIdToMark.get(id);
  if (mark) {
    return _mapping.markToIds.get(mark) || [id];
  }
  return [id];
}

/** Get all target IDs from multi-selection, expanded by mark groups */
export function getTargetIds(): string[] {
  const allIds = new Set<string>();
  for (const id of selectedIds) {
    for (const expandedId of expandToMarkGroup(id)) {
      allIds.add(expandedId);
    }
  }
  return Array.from(allIds);
}

/** Isolate selected elements (ghost everything else) */
export function isolateSelected(): void {
  if (!_instance) return;
  const ids = getTargetIds();
  if (ids.length === 0) return;
  _instance.filtering.removeUserObjectColors();
  _instance.filtering.isolateObjects(ids, undefined, true, true);
  selectedIds.clear();
  _instance.viewer.requestRender();
  hasActiveFilters = true;
}

/** Hide selected elements */
export function hideSelected(): void {
  if (!_instance) return;
  const ids = getTargetIds();
  if (ids.length === 0) return;
  _instance.filtering.removeUserObjectColors();
  _instance.filtering.hideObjects(ids, undefined, true, true);
  selectedIds.clear();
  _instance.viewer.requestRender();
  hasActiveFilters = true;
}

/** Reset all filters */
export function resetFilters(): void {
  if (!_instance) return;
  _instance.filtering.removeUserObjectColors();
  _instance.filtering.resetFilters();
  selectedIds.clear();
  _instance.viewer.requestRender();
  hasActiveFilters = false;
}

/**
 * Context menu on right-click: Isoleer, Verberg, Reset.
 * Supports multi-select (Ctrl/Shift+click) and Reset from anywhere.
 */
export function createContextMenu(instance: ViewerInstance): HTMLElement {
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className = "context-menu hidden";

  // Build menu buttons
  const btnIsolate = document.createElement("button");
  btnIsolate.textContent = "Isoleer";
  const btnHide = document.createElement("button");
  btnHide.textContent = "Verberg";
  const divider = document.createElement("div");
  divider.className = "context-menu-divider";
  const btnReset = document.createElement("button");
  btnReset.textContent = "Reset";

  menu.appendChild(btnIsolate);
  menu.appendChild(btnHide);
  menu.appendChild(divider);
  menu.appendChild(btnReset);

  _instance = instance;

  // Track selected elements — Ctrl/Shift for multi-select
  instance.viewer.on(ViewerEvent.ObjectClicked, (event: SelectionEvent | null) => {
    if (!event || event.hits.length === 0) {
      // Click on empty space: clear selection (unless Ctrl/Shift held)
      if (!event) {
        selectedIds.clear();
      }
      return;
    }
    const raw = event.hits[0].node.model.raw;
    if (!raw?.id) return;

    const e = event.event;

    // Ignore right-clicks — don't change selection on context menu
    if (e && e.button === 2) return;

    if (e && (e.ctrlKey || e.shiftKey || e.metaKey)) {
      // Multi-select: toggle element
      if (selectedIds.has(raw.id)) {
        selectedIds.delete(raw.id);
      } else {
        selectedIds.add(raw.id);
      }
    } else {
      // Single select: replace selection
      selectedIds.clear();
      selectedIds.add(raw.id);
    }
    console.log("Selection:", selectedIds.size, "elements");

    // Highlight all selected elements (expanded by mark groups)
    updateSelectionHighlight(instance);
  });

  /** Apply highlight color to all selected elements + their mark groups */
  function updateSelectionHighlight(inst: ViewerInstance): void {
    if (selectedIds.size === 0) {
      inst.filtering.removeUserObjectColors();
      return;
    }
    const ids = getTargetIds();
    inst.filtering.setUserObjectColors([
      { objectIds: ids, color: SELECTION_COLOR },
    ]);
  }

  function closeMenu(): void {
    menu.classList.add("hidden");
  }

  // Right-click: show context menu (on document so it works everywhere)
  document.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault();
    closeMenu(); // Always close first

    // Show/hide action buttons based on selection
    const hasSelection = selectedIds.size > 0;
    btnIsolate.style.display = hasSelection ? "" : "none";
    btnHide.style.display = hasSelection ? "" : "none";
    divider.style.display = (hasSelection && hasActiveFilters) ? "" : "none";
    btnReset.style.display = hasActiveFilters ? "" : "none";

    // Only show menu if there's something to do
    if (hasSelection || hasActiveFilters) {
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.classList.remove("hidden");
    }
  });

  // Close menu on any click, mousedown, or Escape
  document.addEventListener("mousedown", (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("click", (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") closeMenu();
  });

  // --- Actions (delegate to exported functions) ---

  btnIsolate.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    menu.classList.add("hidden");
    isolateSelected();
  });

  btnHide.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    menu.classList.add("hidden");
    hideSelected();
  });

  btnReset.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    menu.classList.add("hidden");
    resetFilters();
  });

  return menu;
}
