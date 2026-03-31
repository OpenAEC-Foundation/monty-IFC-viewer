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

  // Override touch zoom: bypass Speckle's adjustOrbit (has its own min/max clamping
  // that ignores our sensitivity). Directly set goalSpherical.radius instead.
  const orbitControls = (camera as unknown as { _orbitControls: {
    pointers: Array<{ clientX: number; clientY: number }>;
    lastSeparation: number;
    _container: HTMLElement;
    goalSpherical: { radius: number };
    spherical: { radius: number };
    twoTouchDistance: (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => number;
    panPerPixel: number;
    movePan: (dx: number, dy: number) => void;
    touchModeZoom: ((dx: number, dy: number) => void) | null;
    computeMinMaxRadius: () => void;
  } })._orbitControls;

  // Debug overlay (temporary)
  const debugEl = document.createElement("div");
  debugEl.id = "zoom-debug";
  debugEl.style.cssText = "position:fixed;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:#0f0;font:12px monospace;padding:6px 10px;border-radius:6px;z-index:9999;pointer-events:none;";
  document.body.appendChild(debugEl);

  // Replace touchModeZoom: set radius directly, proportional to current distance
  orbitControls.touchModeZoom = (dx: number, dy: number) => {
    const currentRadius = orbitControls.spherical.radius;
    const sep = orbitControls.twoTouchDistance(orbitControls.pointers[0], orbitControls.pointers[1]);
    const pinchDelta = (orbitControls.lastSeparation - sep) / orbitControls._container.offsetHeight;
    orbitControls.lastSeparation = sep;

    // Radius change = percentage of current radius (closer = smaller absolute step)
    // pinchDelta ~0.01-0.05 per frame, multiply by radius for proportional zoom
    const step = pinchDelta * currentRadius * 3.0;
    const newRadius = Math.max(0.1, currentRadius + step);
    orbitControls.goalSpherical.radius = newRadius;

    if (orbitControls.panPerPixel > 0) orbitControls.movePan(dx, dy);

    debugEl.textContent = `r=${currentRadius.toFixed(2)} step=${step.toFixed(4)} pinch=${pinchDelta.toFixed(4)}`;
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
