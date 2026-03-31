import { initViewer, type ViewerInstance } from "./core/viewer-setup";
import { parseStreamParams, loadStream } from "./core/stream-loader";
import { createToolbar } from "./ui/toolbar";
import { createPropertyPanel, setPropertyPanelMapping } from "./ui/property-panel";
import { createModelPanel } from "./ui/model-panel";
import { createContextMenu, setContextMenuMapping, setMultiSelectMode } from "./ui/context-menu";
import { createFilterPanel } from "./ui/filter-panel";
import { parseMarks, PhaseManager, createTimelineUI } from "./addons/bouwvolgorde";
import "./style.css";

async function main(): Promise<void> {
  const container = document.getElementById("viewer-container");
  const loadingIndicator = document.getElementById("loading-indicator");

  if (!container) {
    throw new Error("Viewer container element not found");
  }

  // Parse stream from URL
  const streamParams = parseStreamParams();
  if (!streamParams) {
    showMessage(
      "Geen model opgegeven. Gebruik ?project=... of ?url=https://app.montyviewer.com/projects/..."
    );
    return;
  }

  // Initialize Speckle viewer
  let instance: ViewerInstance;
  try {
    instance = await initViewer(container);
  } catch (error) {
    console.error("Viewer init failed:", error);
    showMessage("Viewer kon niet worden gestart.");
    return;
  }

  // Add toolbar + property panel
  const overlay = document.getElementById("overlay");
  const toolbar = createToolbar(instance);
  overlay?.appendChild(toolbar);
  const { panel: propertyPanel, infoBtn } = createPropertyPanel(instance);
  overlay?.appendChild(propertyPanel);
  const contextMenu = createContextMenu(instance);
  overlay?.appendChild(contextMenu);

  // Load model(s)
  try {
    const models = await loadStream(instance.viewer, streamParams, (progress) => {
      if (loadingIndicator) {
        const pct = Math.round(progress * 100);
        loadingIndicator.textContent = `Model laden... ${pct}%`;
      }
    });

    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }

    // Zoom to fit after loading
    instance.camera.setCameraView([], true);

    // Left toolbar (model toggle + filter button in one bar)
    const leftToolbar = document.createElement("div");
    leftToolbar.id = "left-toolbar";

    // Info button for touch devices (property panel toggle)
    leftToolbar.appendChild(infoBtn);

    // Multi-select toggle for touch devices
    if (window.matchMedia("(pointer: coarse)").matches) {
      const multiBtn = document.createElement("button");
      multiBtn.className = "left-tb-btn";
      multiBtn.id = "multi-select-btn";
      multiBtn.title = "Multi-selectie";
      multiBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
      multiBtn.addEventListener("click", () => {
        const active = multiBtn.classList.toggle("active");
        setMultiSelectMode(active);
      });
      leftToolbar.appendChild(multiBtn);
    }

    if (models.length > 1) {
      const { button, panel } = createModelPanel(instance.viewer, models);
      leftToolbar.appendChild(button);
      overlay?.appendChild(panel);
    }

    overlay?.appendChild(leftToolbar);

    // Expose for debugging
    (window as unknown as Record<string, unknown>).__instance = instance;

    console.log("Model loaded successfully");

    // Initialize bouwvolgorde player + filter panel
    initBouwvolgorde(instance, streamParams.projectId, overlay, leftToolbar);
  } catch (error) {
    console.error("Model load failed:", error);
    showMessage("Model kon niet worden geladen. Controleer de stream URL.");
  }
}

async function initBouwvolgorde(
  instance: ViewerInstance,
  projectId: string,
  overlay: HTMLElement | null,
  leftToolbar: HTMLElement
): Promise<void> {
  try {
    console.log("Bouwvolgorde: parsing marks...");
    const mapping = await parseMarks(instance.viewer, projectId);

    if (mapping.phases.length === 0) {
      console.log("Bouwvolgorde: no Mark properties found, skipping player");
      return;
    }

    // Share mapping with property panel and context menu for linked selection
    setPropertyPanelMapping(mapping);
    setContextMenuMapping(mapping);

    const manager = new PhaseManager(instance, mapping);
    const timeline = createTimelineUI(manager);
    overlay?.appendChild(timeline);

    // Add filter button to left toolbar, panel to overlay
    const { button: filterBtn, panel: filterPanel } = createFilterPanel(instance, mapping);
    leftToolbar.appendChild(filterBtn);
    overlay?.appendChild(filterPanel);

    console.log(`Bouwvolgorde: player ready with ${mapping.phases.length} phases`);
  } catch (error) {
    console.error("Bouwvolgorde init failed:", error);
  }
}

function showMessage(text: string): void {
  const loading = document.getElementById("loading-indicator");
  if (loading) {
    loading.textContent = text;
    loading.classList.add("error");
  }
}

main();
