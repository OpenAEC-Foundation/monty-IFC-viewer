import { initViewer, type ViewerInstance } from "./core/viewer-setup";
import { parseStreamParams, loadStream } from "./core/stream-loader";
import { createToolbar } from "./ui/toolbar";
import { createPropertyPanel, setPropertyPanelMapping } from "./ui/property-panel";
import { createModelPanel } from "./ui/model-panel";
import {
  createContextMenu, setContextMenuMapping, setMultiSelectMode,
  isolateSelected, hideSelected, resetFilters
} from "./ui/context-menu";
import { createFilterPanel } from "./ui/filter-panel";
import { parseMarks, PhaseManager, createTimelineUI } from "./addons/bouwvolgorde";
import "./style.css";

async function main(): Promise<void> {
  const clientSlug = new URLSearchParams(window.location.search).get("client");
  if (clientSlug) {
    window.location.href = `/landing/?client=${encodeURIComponent(clientSlug)}`;
    return;
  }

  const container = document.getElementById("viewer-container");
  const loadingIndicator = document.getElementById("loading-indicator");

  if (!container) {
    throw new Error("Viewer container element not found");
  }

  // Parse stream from URL
  const streamParams = parseStreamParams();
  if (!streamParams) {
    const search = new URLSearchParams(window.location.search);
    const hasModelQuery = search.has("project") || search.has("url");

    if (!hasModelQuery) {
      window.location.href = "/landing/";
      return;
    }

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

  // Back button to project overview (if navigated from landing page)
  const overlay = document.getElementById("overlay");
  const fromClient = new URLSearchParams(window.location.search).get("from");
  if (fromClient && overlay) {
    const backBtn = document.createElement("a");
    backBtn.id = "back-to-projects";
    backBtn.href = `/?client=${fromClient}`;
    backBtn.title = "Terug naar projecten";
    backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>`;
    overlay.appendChild(backBtn);
  }

  // Add toolbar + property panel
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

    // Multi-select toggle + action panel
    {
      const multiBtn = document.createElement("button");
      multiBtn.className = "left-tb-btn";
      multiBtn.id = "multi-select-btn";
      multiBtn.title = "Multi-selectie";
      multiBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

      // Side panel (like filter panel)
      const msPanel = document.createElement("div");
      msPanel.id = "multi-select-panel";
      msPanel.classList.add("hidden");

      const msHeader = document.createElement("div");
      msHeader.className = "mp-header";
      msHeader.innerHTML = `<span class="mp-title">Multi-selectie</span>`;
      const msClose = document.createElement("button");
      msClose.className = "mp-close";
      msClose.innerHTML = "&times;";
      msClose.addEventListener("click", () => {
        multiBtn.classList.remove("active");
        setMultiSelectMode(false);
        msPanel.classList.add("hidden");
      });
      msHeader.appendChild(msClose);
      msPanel.appendChild(msHeader);

      const msBody = document.createElement("div");
      msBody.className = "ms-body";

      const ICONS = {
        add: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg>`,
        remove: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="4" y1="10" x2="16" y2="10"/></svg>`,
        isolate: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/></svg>`,
        hide: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M3 10s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z"/><line x1="4" y1="16" x2="16" y2="4"/></svg>`,
        reset: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M3 10a7 7 0 0 1 12.9-3.8"/><path d="M17 10a7 7 0 0 1-12.9 3.8"/><polyline points="3 4 3 10 9 10"/></svg>`,
      };

      // Mode buttons (+ and −) — toggle between add/remove mode
      const addBtn = document.createElement("button");
      addBtn.className = "ms-action-btn active";
      addBtn.innerHTML = `${ICONS.add}<span>Toevoegen</span>`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "ms-action-btn";
      removeBtn.innerHTML = `${ICONS.remove}<span>Verwijderen</span>`;

      addBtn.addEventListener("click", () => {
        addBtn.classList.add("active");
        removeBtn.classList.remove("active");
        setMultiSelectMode("add");
      });

      removeBtn.addEventListener("click", () => {
        removeBtn.classList.add("active");
        addBtn.classList.remove("active");
        setMultiSelectMode("remove");
      });

      msBody.appendChild(addBtn);
      msBody.appendChild(removeBtn);

      // Divider
      const divider = document.createElement("div");
      divider.style.cssText = "height:1px;background:var(--border-subtle);margin:4px 0;";
      msBody.appendChild(divider);

      // Action buttons
      const actionItems = [
        { icon: ICONS.isolate, label: "Isoleer", action: () => isolateSelected() },
        { icon: ICONS.hide, label: "Verberg", action: () => hideSelected() },
        { icon: ICONS.reset, label: "Reset", action: () => resetFilters() },
      ];

      for (const { icon, label, action } of actionItems) {
        const btn = document.createElement("button");
        btn.className = "ms-action-btn";
        btn.innerHTML = `${icon}<span>${label}</span>`;
        btn.addEventListener("click", action);
        msBody.appendChild(btn);
      }

      msPanel.appendChild(msBody);

      multiBtn.addEventListener("click", () => {
        if (multiBtn.classList.contains("active")) {
          // Deactivate multi-select
          multiBtn.classList.remove("active");
          setMultiSelectMode(false);
          msPanel.classList.add("hidden");
        } else {
          // Activate multi-select + show panel
          multiBtn.classList.add("active");
          setMultiSelectMode("add");
          addBtn.classList.add("active");
          removeBtn.classList.remove("active");
          document.getElementById("model-panel")?.classList.add("hidden");
          document.getElementById("filter-panel")?.classList.add("hidden");
          msPanel.classList.remove("hidden");
        }
      });

      leftToolbar.appendChild(multiBtn);
      overlay?.appendChild(msPanel);
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

    // Add bouwvolgorde toggle to left toolbar
    const bvToggle = document.createElement("button");
    bvToggle.className = "left-tb-btn";
    bvToggle.id = "bouwvolgorde-toggle";
    bvToggle.title = "Bouwvolgorde";
    bvToggle.classList.add("active");
    bvToggle.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>`;
    bvToggle.addEventListener("click", () => {
      const isVisible = !timeline.classList.contains("hidden");
      timeline.classList.toggle("hidden", isVisible);
      bvToggle.classList.toggle("active", !isVisible);
    });
    leftToolbar.appendChild(bvToggle);

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
