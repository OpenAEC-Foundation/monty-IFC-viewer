import { ViewerEvent, type SelectionEvent } from "@speckle/viewer";
import type { ViewerInstance } from "../core/viewer-setup";
import { SPECKLE_SERVER } from "../core/viewer-setup";
import type { PhaseMapping } from "../addons/bouwvolgorde/mark-parser";
import { selectedIds, isolateSelected, hideSelected, resetFilters, hasActiveFilters } from "./context-menu";

let _phaseMapping: PhaseMapping | null = null;

/** Set the phase mapping so property panel can highlight linked elements */
export function setPropertyPanelMapping(mapping: PhaseMapping): void {
  _phaseMapping = mapping;
}

const INFO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export interface PropertyPanelResult {
  panel: HTMLElement;
  infoBtn: HTMLElement;
}

export function createPropertyPanel(instance: ViewerInstance): PropertyPanelResult {
  const panel = document.createElement("div");
  panel.id = "property-panel";
  panel.classList.add("hidden");

  const header = document.createElement("div");
  header.className = "pp-header";

  const title = document.createElement("span");
  title.className = "pp-title";
  title.textContent = "Properties";

  const closeBtn = document.createElement("button");
  closeBtn.className = "pp-close";
  closeBtn.textContent = "\u00D7";
  closeBtn.addEventListener("click", () => panel.classList.add("hidden"));

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Action bar: Isoleer, Verberg, Reset
  const actionBar = document.createElement("div");
  actionBar.className = "pp-actions";

  const btnIsolate = document.createElement("button");
  btnIsolate.className = "pp-action-btn";
  btnIsolate.textContent = "Isoleer";
  btnIsolate.addEventListener("click", () => {
    isolateSelected();
    panel.classList.add("hidden");
  });

  const btnHide = document.createElement("button");
  btnHide.className = "pp-action-btn";
  btnHide.textContent = "Verberg";
  btnHide.addEventListener("click", () => {
    hideSelected();
    panel.classList.add("hidden");
  });

  const btnReset = document.createElement("button");
  btnReset.className = "pp-action-btn pp-action-reset";
  btnReset.textContent = "Reset";
  btnReset.addEventListener("click", () => {
    resetFilters();
    panel.classList.add("hidden");
  });

  actionBar.appendChild(btnIsolate);
  actionBar.appendChild(btnHide);
  actionBar.appendChild(btnReset);
  panel.appendChild(actionBar);

  const body = document.createElement("div");
  body.className = "pp-body";
  panel.appendChild(body);

  // Touch info button — always visible on touch, in left toolbar
  const infoBtn = document.createElement("button");
  infoBtn.id = "mobile-info-btn";
  infoBtn.className = isTouchDevice() ? "left-tb-btn" : "left-tb-btn hidden";
  infoBtn.title = "Properties";
  infoBtn.innerHTML = INFO_ICON;

  const projectId = new URLSearchParams(window.location.search).get("project") || "";

  // Pending data for deferred panel open on mobile
  let pendingRaw: Record<string, unknown> | null = null;
  let pendingMulti = false;
  let pendingIds: string[] = [];
  let hasPendingData = false;

  function showPanel(): void {
    if (!hasPendingData) {
      // No selection yet — show empty state
      body.innerHTML = `<div class="pp-element-header"><span class="pp-element-name" style="opacity:0.5">Tik op een element</span></div>`;
    } else if (pendingMulti) {
      showMultiSelectPanel(body, projectId, pendingIds);
    } else if (pendingRaw) {
      showSingleSelectPanel(body, projectId, pendingRaw);
    }
    panel.classList.remove("hidden");
  }

  // Toggle: click info button → open panel, click again → close
  infoBtn.addEventListener("click", () => {
    if (panel.classList.contains("hidden")) {
      showPanel();
    } else {
      panel.classList.add("hidden");
    }
  });

  instance.viewer.on(ViewerEvent.ObjectClicked, (event: SelectionEvent | null) => {
    // Suppress selection when measuring — measurements handle their own clicks
    if (instance.measurements.enabled) return;
    if (!event || event.hits.length === 0) {
      panel.classList.add("hidden");
      return;
    }

    const node = event.hits[0].node;
    const raw = node.model.raw;

    if (!raw || typeof raw !== "object") {
      panel.classList.add("hidden");
      return;
    }

    // Defer to allow context-menu to update selectedIds first
    queueMicrotask(() => {
      pendingMulti = selectedIds.size > 1;
      pendingIds = Array.from(selectedIds);
      pendingRaw = raw as Record<string, unknown>;
      hasPendingData = true;

      if (isTouchDevice()) {
        // Touch: keep panel closed, user opens via info button
        panel.classList.add("hidden");
      } else {
        // Desktop: show panel immediately
        showPanel();
      }
    });
  });

  return { panel, infoBtn };
}

/** Show properties for a single element */
function showSingleSelectPanel(
  body: HTMLElement,
  projectId: string,
  raw: Record<string, unknown>
): void {
  body.innerHTML = "";

  const name = raw.name || raw.Name || "Element";
  const category = raw.category || raw.Category || "";

  const elHeader = document.createElement("div");
  elHeader.className = "pp-element-header";
  elHeader.innerHTML = `<span class="pp-element-name">${esc(String(name))}</span>`;
  if (category) {
    elHeader.innerHTML += `<span class="pp-element-category">${esc(String(category))}</span>`;
  }
  if (_phaseMapping) {
    const mark = _phaseMapping.nodeIdToMark.get(raw.id as string);
    if (mark) {
      elHeader.innerHTML += `<span class="pp-element-mark">Mark ${esc(mark)}</span>`;
    }
  }
  body.appendChild(elHeader);

  const basicProps: Array<{ key: string; value: string }> = [];
  if (raw.level) basicProps.push({ key: "Level", value: String(raw.level) });
  if (raw.properties && (raw.properties as Record<string, unknown>).elementId)
    basicProps.push({ key: "Element ID", value: String((raw.properties as Record<string, unknown>).elementId) });

  if (basicProps.length > 0) {
    body.appendChild(createSection("properties", basicProps));
  }

  const paramsContainer = document.createElement("div");
  paramsContainer.className = "pp-section";
  paramsContainer.innerHTML = `<div class="pp-section-header">Parameters</div><div class="pp-table"><div class="pp-row"><span class="pp-key pp-loading">Laden...</span></div></div>`;
  body.appendChild(paramsContainer);

  fetchParameterGroups(projectId, raw.id as string).then((groups) => {
    paramsContainer.innerHTML = "";
    if (groups.length > 0) {
      for (const group of groups) {
        paramsContainer.appendChild(createSection(group.name, group.props));
      }
    } else {
      paramsContainer.remove();
    }
  });
}

/** Show merged properties for multiple elements, with VAR for differing values */
function showMultiSelectPanel(
  body: HTMLElement,
  projectId: string,
  objectIds: string[]
): void {
  body.innerHTML = "";

  // Header
  const mh = document.createElement("div");
  mh.className = "pp-element-header";
  mh.innerHTML = `<span class="pp-element-name">${objectIds.length} elementen geselecteerd</span>`;

  // Show marks if available
  if (_phaseMapping) {
    const marks = new Set<string>();
    for (const id of objectIds) {
      const mark = _phaseMapping.nodeIdToMark.get(id);
      if (mark) marks.add(mark);
    }
    if (marks.size === 1) {
      mh.innerHTML += `<span class="pp-element-mark">Mark ${esc(Array.from(marks)[0])}</span>`;
    } else if (marks.size > 1) {
      mh.innerHTML += `<span class="pp-element-mark pp-var">Mark VAR</span>`;
    }
  }
  body.appendChild(mh);

  // Loading
  const paramsContainer = document.createElement("div");
  paramsContainer.className = "pp-section";
  paramsContainer.innerHTML = `<div class="pp-section-header">Parameters</div><div class="pp-table"><div class="pp-row"><span class="pp-key pp-loading">Laden...</span></div></div>`;
  body.appendChild(paramsContainer);

  // Fetch all properties in parallel
  Promise.all(objectIds.map((id) => fetchParameterGroups(projectId, id))).then(
    (allGroups) => {
      const merged = mergePropertyGroups(allGroups);
      paramsContainer.innerHTML = "";
      if (merged.length > 0) {
        for (const group of merged) {
          paramsContainer.appendChild(createSection(group.name, group.props));
        }
      } else {
        paramsContainer.remove();
      }
    }
  );
}

/**
 * Merge property groups from multiple elements.
 * Same value → show value. Different values → "VAR".
 */
function mergePropertyGroups(
  allGroups: PropertyGroup[][]
): PropertyGroup[] {
  // Build a map: groupName → paramKey → Set of values
  const groupMap = new Map<string, Map<string, Set<string>>>();

  for (const groups of allGroups) {
    for (const group of groups) {
      let paramMap = groupMap.get(group.name);
      if (!paramMap) {
        paramMap = new Map();
        groupMap.set(group.name, paramMap);
      }
      for (const prop of group.props) {
        let values = paramMap.get(prop.key);
        if (!values) {
          values = new Set();
          paramMap.set(prop.key, values);
        }
        values.add(prop.value);
      }
    }
  }

  // Convert to PropertyGroup array with VAR for multi-value params
  const result: PropertyGroup[] = [];
  for (const [groupName, paramMap] of groupMap) {
    const props: Array<{ key: string; value: string }> = [];
    for (const [key, values] of paramMap) {
      props.push({
        key,
        value: values.size === 1 ? Array.from(values)[0] : "VAR",
      });
    }
    if (props.length > 0) {
      result.push({ name: groupName, props });
    }
  }

  // Sort: priority groups first, then alphabetical
  result.sort((a, b) => {
    const ai = PRIORITY_GROUPS.indexOf(a.name);
    const bi = PRIORITY_GROUPS.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

interface PropertyGroup {
  name: string;
  props: Array<{ key: string; value: string }>;
}

/** Priority groups shown first, in this order. Others follow alphabetically. */
const PRIORITY_GROUPS = ["Identity Data", "Text", "Dimensions", "Data"];

async function fetchParameterGroups(
  projectId: string,
  objectId: string
): Promise<PropertyGroup[]> {
  if (!projectId || !objectId) return [];

  try {
    const url = `${SPECKLE_SERVER}/objects/${projectId}/${objectId}/single`;
    const resp = await fetch(url);
    if (!resp.ok) return [];

    const obj = await resp.json() as Record<string, unknown>;
    const params = (obj.properties as Record<string, unknown>)?.Parameters as Record<string, unknown> | undefined;
    if (!params) return [];

    const instanceParams = params["Instance Parameters"] as Record<string, unknown> | undefined;
    if (!instanceParams) return [];

    const groups: PropertyGroup[] = [];

    for (const [groupName, groupVal] of Object.entries(instanceParams)) {
      if (!groupVal || typeof groupVal !== "object") continue;

      const props = extractParamGroup(groupVal as Record<string, unknown>);
      if (props.length > 0) {
        groups.push({ name: groupName, props });
      }
    }

    groups.sort((a, b) => {
      const ai = PRIORITY_GROUPS.indexOf(a.name);
      const bi = PRIORITY_GROUPS.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return groups;
  } catch {
    return [];
  }
}

function extractParamGroup(
  group: Record<string, unknown>
): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  for (const [, paramVal] of Object.entries(group)) {
    if (typeof paramVal === "object" && paramVal !== null) {
      const p = paramVal as Record<string, unknown>;
      const paramName = p.name || p.Name;
      const paramValue = p.value ?? p.Value;
      if (paramName && paramValue !== undefined && paramValue !== null) {
        result.push({ key: String(paramName), value: formatValue(paramValue) });
      }
    }
  }
  return result;
}

function createSection(
  label: string,
  props: Array<{ key: string; value: string }>
): HTMLElement {
  const section = document.createElement("div");
  section.className = "pp-section";
  const sectionHeader = document.createElement("div");
  sectionHeader.className = "pp-section-header";
  sectionHeader.textContent = label;
  section.appendChild(sectionHeader);
  section.appendChild(createPropertyTable(props));
  return section;
}

function createPropertyTable(
  props: Array<{ key: string; value: string }>
): HTMLElement {
  const table = document.createElement("div");
  table.className = "pp-table";
  for (const { key, value } of props) {
    const row = document.createElement("div");
    row.className = "pp-row";
    const isVar = value === "VAR";
    row.innerHTML = `<span class="pp-key">${esc(key)}</span><span class="pp-value${isVar ? " pp-var" : ""}">${esc(value)}</span>`;
    table.appendChild(row);
  }
  return table;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "\u2014";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return Number.isInteger(val) ? String(val) : val.toFixed(3);
  return String(val);
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
