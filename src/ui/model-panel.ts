import type { IViewer } from "@speckle/viewer";
import { SpeckleLoader } from "@speckle/viewer";
import type { LoadedModel } from "../core/stream-loader";

// Stacked layers icon — clear "models" metaphor
const LAYERS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;

interface ModelState {
  model: LoadedModel;
  visible: boolean;
}

/**
 * Creates the floating toggle button + dropdown model panel.
 * Returns a container element with both inside.
 */
export function createModelPanel(
  viewer: IViewer,
  models: LoadedModel[]
): HTMLElement {
  const wrapper = document.createElement("div");

  // Floating toggle button (always visible, left side)
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "model-toggle-btn";
  toggleBtn.title = "Modellen aan/uit";
  toggleBtn.innerHTML = LAYERS_ICON;

  // Dropdown panel (hidden by default)
  const panel = document.createElement("div");
  panel.id = "model-panel";
  panel.classList.add("hidden");

  toggleBtn.addEventListener("click", () => {
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

  const states: ModelState[] = models.map((m) => ({ model: m, visible: true }));

  for (const state of states) {
    const item = document.createElement("div");
    item.className = "mp-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.className = "mp-checkbox";

    const label = document.createElement("span");
    label.className = "mp-name";
    label.textContent = formatBranchName(state.model.name);
    label.title = state.model.name;

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
        }
      } catch (err) {
        console.error("Model toggle failed:", err);
        checkbox.checked = state.visible;
      }
      checkbox.disabled = false;
    });

    item.appendChild(checkbox);
    item.appendChild(label);
    body.appendChild(item);
  }

  panel.appendChild(header);
  panel.appendChild(body);

  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(panel);

  return wrapper;
}

function formatBranchName(name: string): string {
  return name
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
