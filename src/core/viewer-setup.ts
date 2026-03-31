import {
  Viewer,
  DefaultViewerParams,
  CameraController,
  SelectionExtension,
  FilteringExtension,
  MeasurementsExtension,
  MeasurementType,
  OrientedSectionTool,
  SectionOutlines,
  ExplodeExtension,
  type IViewer,
} from "@speckle/viewer";

const SPECKLE_SERVER = "https://app.montyviewer.com";

export interface ViewerInstance {
  viewer: IViewer;
  camera: CameraController;
  selection: SelectionExtension;
  filtering: FilteringExtension;
  measurements: MeasurementsExtension;
  sections: OrientedSectionTool;
  explode: ExplodeExtension;
}

export async function initViewer(
  container: HTMLElement
): Promise<ViewerInstance> {
  const params = {
    ...DefaultViewerParams,
    showStats: false,
    verbose: false,
  };

  const viewer = new Viewer(container, params);
  await viewer.init();

  const camera = viewer.createExtension(CameraController);
  camera.options = {
    ...camera.options,
    zoomToCursor: true,
    orbitAroundCursor: true,
  };

  // Override touch zoom: replace Speckle's touchModeZoom with distance-based version
  // Speckle applies zoomSensitivity² (once in touchModeZoom, again in userAdjustOrbit)
  // so setting the option is not enough. We replace the handler entirely.
  const orbitControls = (camera as unknown as { _orbitControls: {
    _options: { zoomSensitivity: number; enableZoom: boolean; inputSensitivity: number };
    pointers: Array<{ clientX: number; clientY: number }>;
    lastSeparation: number;
    _container: HTMLElement;
    twoTouchDistance: (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => number;
    adjustOrbit: (theta: number, phi: number, zoom: number) => void;
    panPerPixel: number;
    movePan: (dx: number, dy: number) => void;
    touchModeZoom: ((dx: number, dy: number) => void) | null;
  } })._orbitControls;

  // Debug overlay (temporary)
  const debugEl = document.createElement("div");
  debugEl.id = "zoom-debug";
  debugEl.style.cssText = "position:fixed;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:#0f0;font:12px monospace;padding:6px 10px;border-radius:6px;z-index:9999;pointer-events:none;";
  document.body.appendChild(debugEl);

  // Replace touchModeZoom with distance-aware version
  orbitControls.touchModeZoom = (dx: number, dy: number) => {
    const dist = camera.getPosition().distanceTo(camera.getTarget());
    // Logarithmic sensitivity: far=0.4, close=0.02
    const sensitivity = Math.max(0.02, Math.min(0.4, Math.log10(Math.max(dist, 0.1)) * 0.2));

    const sep = orbitControls.twoTouchDistance(orbitControls.pointers[0], orbitControls.pointers[1]);
    const delta = 0.08 * sensitivity * (orbitControls.lastSeparation - sep) * 50 / orbitControls._container.offsetHeight;
    orbitControls.lastSeparation = sep;
    // Call adjustOrbit directly (bypasses userAdjustOrbit's second sensitivity multiply)
    orbitControls.adjustOrbit(0, 0, delta);
    if (orbitControls.panPerPixel > 0) orbitControls.movePan(dx, dy);

    debugEl.textContent = `dist=${dist.toFixed(1)} sens=${sensitivity.toFixed(3)} delta=${delta.toFixed(4)}`;
  };

  const selection = viewer.createExtension(SelectionExtension);
  const filtering = viewer.createExtension(FilteringExtension);
  const sections = viewer.createExtension(OrientedSectionTool);
  viewer.createExtension(SectionOutlines);
  const measurements = viewer.createExtension(MeasurementsExtension);
  measurements.options = { ...measurements.options, vertexSnap: true };
  const explode = viewer.createExtension(ExplodeExtension);

  return { viewer, camera, selection, filtering, measurements, sections, explode };
}

export { SPECKLE_SERVER, MeasurementType };
