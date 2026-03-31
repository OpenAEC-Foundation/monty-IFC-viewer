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

  // Custom touch pinch zoom: proportional to distance (slower when close)
  // Bypasses Speckle's adjustOrbit which has internal clamping that ignores sensitivity.
  // Sets goalSpherical.radius directly. Mouse zoom is unaffected.
  type OrbitInternals = {
    pointers: Array<{ clientX: number; clientY: number }>;
    lastSeparation: number;
    _container: HTMLElement;
    goalSpherical: { radius: number };
    spherical: { radius: number };
    twoTouchDistance: (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => number;
    panPerPixel: number;
    movePan: (dx: number, dy: number) => void;
    touchModeZoom: ((dx: number, dy: number) => void) | null;
  };
  const orbitControls = (camera as unknown as { _orbitControls: OrbitInternals })._orbitControls;

  orbitControls.touchModeZoom = (dx: number, dy: number) => {
    const radius = orbitControls.spherical.radius;
    const sep = orbitControls.twoTouchDistance(orbitControls.pointers[0], orbitControls.pointers[1]);
    const pinch = (orbitControls.lastSeparation - sep) / orbitControls._container.offsetHeight;
    orbitControls.lastSeparation = sep;
    orbitControls.goalSpherical.radius = Math.max(0.1, radius + pinch * radius * 15.0);
    if (orbitControls.panPerPixel > 0) orbitControls.movePan(dx, dy);
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
