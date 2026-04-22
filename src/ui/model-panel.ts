import { SpeckleLoader, type IViewer } from "@speckle/viewer";
import type { LoadedModel } from "../core/stream-loader";
import type { ViewerInstance } from "../core/viewer-setup";
import { applyCltOverlay } from "../core/filter-state";

const LAYERS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
const ISOLATE_ICON = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/></svg>`;
const HIDE_ICON = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 10s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z"/><line x1="4" y1="16" x2="16" y2="4"/></svg>`;

type ModelAction = "isolated" | "hidden" | null;

interface ModelState {
  model: LoadedModel;
  visible: boolean;
  action: ModelAction;
  isolateBtn: HTMLButtonElement;
  hideBtn: HTMLButtonElement;
}

export interface PanelParts {
  button: HTMLButtonElement;
  panel: HTMLElement;
}

/**
 * Creates the model toggle button + panel.
 * Returns button and panel separately for layout by caller.
 */
export function createModelPanel(
  instance: ViewerInstance,
  models: LoadedModel[]
): PanelParts {
  const viewer = instance.viewer;

  const button = document.createElement("button");
  button.className = "left-tb-btn";
  button.title = "Modellen aan/uit";
  button.innerHTML = LAYERS_ICON;

  const panel = document.createElement("div");
  panel.id = "model-panel";
  panel.classList.add("hidden");

  button.addEventListener("click", () => {
    // Close sibling panels
    document.getElementById("filter-panel")?.classList.add("hidden");
    panel.classList.toggle("hidden");
  });

  // Header
  const header = document.createElement("div");
  header.className = "mp-header";

  const title = document.createElement("span");
  title.className = "mp-title";
  title.textContent = "Modellen";

  const closeBtn = document.createElement("button");
  closeBtn.className = "mp-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => panel.classList.add("hidden"));

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "mp-body";

  const states: ModelState[] = [];

  for (const model of models) {
    const item = document.createElement("div");
    item.className = "mp-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.className = "mp-checkbox";

    const label = document.createElement("span");
    label.className = "mp-name";
    label.textContent = formatBranchName(model.name);
    label.title = model.name;

    const isolateBtn = document.createElement("button");
    isolateBtn.className = "mp-action-btn";
    isolateBtn.title = "Isoleer dit model";
    isolateBtn.innerHTML = ISOLATE_ICON;

    const hideBtn = document.createElement("button");
    hideBtn.className = "mp-action-btn";
    hideBtn.title = "Verberg dit model";
    hideBtn.innerHTML = HIDE_ICON;

    const state: ModelState = {
      model,
      visible: true,
      action: null,
      isolateBtn,
      hideBtn,
    };
    states.push(state);

    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      try {
        if (checkbox.checked) {
          const loader = new SpeckleLoader(
            viewer.getWorldTree(),
            state.model.url,
            ""
          );
          await viewer.loadObject(loader, false);
          state.visible = true;
        } else {
          await viewer.unloadObject(state.model.url);
          state.visible = false;
          // Model unloaded: any isolation/hide referencing it is stale, clear UI
          if (state.action !== null) {
            state.action = null;
            updateActionButtons(state);
          }
        }
      } catch (err) {
        console.error("Model toggle failed:", err);
        checkbox.checked = state.visible;
      }
      checkbox.disabled = false;
    });

    isolateBtn.addEventListener("click", () => {
      handleAction(instance, states, state, "isolated");
    });

    hideBtn.addEventListener("click", () => {
      handleAction(instance, states, state, "hidden");
    });

    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(isolateBtn);
    item.appendChild(hideBtn);
    body.appendChild(item);
  }

  panel.appendChild(header);
  panel.appendChild(body);

  return { button, panel };
}

function handleAction(
  instance: ViewerInstance,
  states: ModelState[],
  target: ModelState,
  action: "isolated" | "hidden"
): void {
  if (action === "isolated") {
    handleIsolate(instance, states, target);
  } else {
    handleHide(instance, states, target);
  }
}

/** Isolate is singular: only one model isolated at a time. Others get visual "hidden" state. */
function handleIsolate(
  instance: ViewerInstance,
  states: ModelState[],
  target: ModelState
): void {
  // Toggle off: same model isolated again -> full reset
  if (target.action === "isolated") {
    instance.filtering.removeUserObjectColors();
    instance.filtering.resetFilters();
    applyCltOverlay(instance);
    for (const s of states) {
      s.action = null;
      updateActionButtons(s);
    }
    instance.viewer.requestRender();
    return;
  }

  const ids = getModelNodeIds(instance.viewer, target.model.url);
  if (ids.length === 0) return;

  instance.filtering.removeUserObjectColors();
  instance.filtering.resetFilters();
  instance.filtering.isolateObjects(ids, undefined, true, true);
  applyCltOverlay(instance);
  instance.viewer.requestRender();

  // Target isolated; others become visually "hidden"
  for (const s of states) {
    s.action = s === target ? "isolated" : "hidden";
    updateActionButtons(s);
  }
}

/** Hide is additive: any combination of models can be hidden. Isolate (if any) is cleared. */
function handleHide(
  instance: ViewerInstance,
  states: ModelState[],
  target: ModelState
): void {
  // Clear any isolate state before toggling hide
  for (const s of states) {
    if (s.action === "isolated") s.action = null;
  }

  // Toggle target's hidden state
  target.action = target.action === "hidden" ? null : "hidden";

  // Collect all IDs of currently-hidden models
  const hiddenIds: string[] = [];
  for (const s of states) {
    if (s.action === "hidden") {
      hiddenIds.push(...getModelNodeIds(instance.viewer, s.model.url));
    }
  }

  instance.filtering.removeUserObjectColors();
  instance.filtering.resetFilters();
  if (hiddenIds.length > 0) {
    instance.filtering.hideObjects(hiddenIds, undefined, true, true);
  }
  applyCltOverlay(instance);
  instance.viewer.requestRender();

  for (const s of states) updateActionButtons(s);
}

function updateActionButtons(state: ModelState): void {
  state.isolateBtn.classList.toggle("active", state.action === "isolated");
  state.hideBtn.classList.toggle("active", state.action === "hidden");
}

function getModelNodeIds(viewer: IViewer, url: string): string[] {
  const tree = viewer.getWorldTree();
  if (!tree) return [];

  type TreeChild = { model?: { id?: string; raw?: { id?: string } }; children?: TreeChild[] };
  const rootChildren = (tree.root as unknown as { children?: TreeChild[] }).children ?? [];
  const subtreeRoot = rootChildren.find((c) => c.model?.id === url);
  if (!subtreeRoot) return [];

  // Walk the subtree manually — tree.walk() always starts from _root in this build
  const ids: string[] = [];
  const stack: TreeChild[] = [subtreeRoot];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const id = node.model?.raw?.id;
    // Skip the subtree root itself (its id is the URL, not an element id)
    if (id && node !== subtreeRoot) ids.push(id);
    if (node.children) {
      for (const child of node.children) stack.push(child);
    }
  }
  return ids;
}

function formatBranchName(name: string): string {
  return name
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
