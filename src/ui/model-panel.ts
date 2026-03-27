import type { IViewer } from "@speckle/viewer";
import { SpeckleLoader } from "@speckle/viewer";
import type { LoadedModel } from "../core/stream-loader";

const LAYERS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;

interface ModelState {
  model: LoadedModel;
  visible: boolean;
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
  viewer: IViewer,
  models: LoadedModel[]
): PanelParts {
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

  return { button, panel };
}

function formatBranchName(name: string): string {
  return name
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
