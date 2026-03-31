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

  // Override snap: vertex snap radius 50px (default 10px) so vertices are dominant
  // Speckle's snap() projects face vertices to screen, snaps if within threshold.
  // We increase the threshold so vertex snap wins over face hit at greater distance.
  type SnapInternals = {
    renderer: {
      renderingCamera: unknown;
      NDCToScreen: (x: number, y: number) => { x: number; y: number };
    };
    screenBuff0: { set: (x: number, y: number) => void; distanceTo: (b: unknown) => number };
    screenBuff1: { set: (x: number, y: number) => void };
  };
  const measInternals = measurements as unknown as SnapInternals;
  const originalSnap = (measurements as unknown as { snap: (...args: unknown[]) => void }).snap.bind(measurements);

  (measurements as unknown as { snap: (intersection: {
    point: { project: (cam: unknown) => { x: number; y: number; z: number; distanceTo: (b: unknown) => number; unproject: (cam: unknown) => unknown };  };
    face: { a: number; b: number; c: number; normal: unknown };
    batchObject: { accelerationStructure: { getVertexAtIndex: (i: number) => { project: (cam: unknown) => { x: number; y: number; z: number; distanceTo: (b: unknown) => number; unproject: (cam: unknown) => unknown } } } };
  }, outPoint: { copy: (v: unknown) => void }, outNormal: { copy: (v: unknown) => void }) => void }).snap = (intersection, outPoint, outNormal) => {
    const cam = measInternals.renderer.renderingCamera;
    if (!cam) return;

    const vA = intersection.batchObject.accelerationStructure.getVertexAtIndex(intersection.face.a).project(cam);
    const vB = intersection.batchObject.accelerationStructure.getVertexAtIndex(intersection.face.b).project(cam);
    const vC = intersection.batchObject.accelerationStructure.getVertexAtIndex(intersection.face.c).project(cam);
    const hitNDC = intersection.point.project(cam);

    const verts = [vA, vB, vC].sort((a, b) => hitNDC.distanceTo(a) - hitNDC.distanceTo(b));
    const closest = verts[0];
    const closestScreen = measInternals.renderer.NDCToScreen(closest.x, closest.y);
    const hitScreen = measInternals.renderer.NDCToScreen(hitNDC.x, hitNDC.y);

    measInternals.screenBuff0.set(closestScreen.x, closestScreen.y);
    measInternals.screenBuff1.set(hitScreen.x, hitScreen.y);

    // 50px threshold (vs Speckle's 10px) — vertex snap is dominant
    if (measInternals.screenBuff0.distanceTo(measInternals.screenBuff1) < 50 * window.devicePixelRatio) {
      outPoint.copy(closest.unproject(cam));
      outNormal.copy(intersection.face.normal);
    } else {
      // Fall back to Speckle default (face point)
      originalSnap(intersection, outPoint, outNormal);
    }
  };

  const explode = viewer.createExtension(ExplodeExtension);

  return { viewer, camera, selection, filtering, measurements, sections, explode };
}

export { SPECKLE_SERVER, MeasurementType };
