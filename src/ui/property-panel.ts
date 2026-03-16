import { ViewerEvent, type SelectionEvent } from "@speckle/viewer";
import type { ViewerInstance } from "../core/viewer-setup";
import { SPECKLE_SERVER } from "../core/viewer-setup";

export function createPropertyPanel(instance: ViewerInstance): HTMLElement {
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

  const body = document.createElement("div");
  body.className = "pp-body";
  panel.appendChild(body);

  // Get projectId from URL for API calls
  const projectId = new URLSearchParams(window.location.search).get("project") || "";

  instance.viewer.on(ViewerEvent.ObjectClicked, (event: SelectionEvent | null) => {
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

    // Show panel with basic info immediately
    body.innerHTML = "";

    const name = raw.name || raw.Name || "Element";
    const category = raw.category || raw.Category || "";

    const elHeader = document.createElement("div");
    elHeader.className = "pp-element-header";
    elHeader.innerHTML = `<span class="pp-element-name">${esc(String(name))}</span>`;
    if (category) {
      elHeader.innerHTML += `<span class="pp-element-category">${esc(String(category))}</span>`;
    }
    body.appendChild(elHeader);

    // Show basic properties immediately
    const basicProps: Array<{ key: string; value: string }> = [];
    if (raw.level) basicProps.push({ key: "Level", value: String(raw.level) });
    if (raw.properties?.elementId) basicProps.push({ key: "Element ID", value: String(raw.properties.elementId) });

    if (basicProps.length > 0) {
      body.appendChild(createSection("properties", basicProps));
    }

    // Show loading indicator for parameters
    const paramsContainer = document.createElement("div");
    paramsContainer.className = "pp-section";
    paramsContainer.innerHTML = `<div class="pp-section-header">Parameters</div><div class="pp-table"><div class="pp-row"><span class="pp-key pp-loading">Laden...</span></div></div>`;
    body.appendChild(paramsContainer);

    panel.classList.remove("hidden");

    // Fetch deep properties from Speckle API
    fetchParameterGroups(projectId, raw.id).then((groups) => {
      paramsContainer.innerHTML = "";
      if (groups.length > 0) {
        for (const group of groups) {
          paramsContainer.appendChild(createSection(group.name, group.props));
        }
      } else {
        paramsContainer.remove();
      }
    });
  });

  return panel;
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

    // Sort: priority groups first, then alphabetical
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
    row.innerHTML = `<span class="pp-key">${esc(key)}</span><span class="pp-value">${esc(value)}</span>`;
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
