import type { IViewer } from "@speckle/viewer";
import { SpeckleLoader } from "@speckle/viewer";
import type { LoadedModel } from "../core/stream-loader";

interface ModelState {
  model: LoadedModel;
  visible: boolean;
}

export function createModelPanel(
  viewer: IViewer,
  models: LoadedModel[]
): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "model-panel";

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
    // Clean up branch name: remove "main" prefix, show friendly name
    label.textContent = formatBranchName(state.model.name);
    label.title = state.model.name;

    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      try {
        if (checkbox.checked) {
          // Reload the model
          const loader = new SpeckleLoader(
            viewer.getWorldTree(),
            state.model.url,
            ""
          );
          await viewer.loadObject(loader, false);
          state.visible = true;
        } else {
          // Unload the model
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

  return panel;
}

export function toggleModelPanel(): void {
  const panel = document.getElementById("model-panel");
  panel?.classList.toggle("hidden");
}

function formatBranchName(name: string): string {
  // "main" → "Main", "structure" → "Structure", etc.
  return name
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
