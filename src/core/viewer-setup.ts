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
    // Multiplier scales with distance: far (r>10) = faster, close (r<2) = slower
    const mult = radius > 10 ? 25.0 : radius > 3 ? 15.0 : 8.0;
    orbitControls.goalSpherical.radius = Math.max(0.1, radius + pinch * radius * mult);
    if (orbitControls.panPerPixel > 0) orbitControls.movePan(dx, dy);
  };

  const selection = viewer.createExtension(SelectionExtension);
  const filtering = viewer.createExtension(FilteringExtension);
  const sections = viewer.createExtension(OrientedSectionTool);
  viewer.createExtension(SectionOutlines);
  const measurements = viewer.createExtension(MeasurementsExtension);
  measurements.options = { ...measurements.options, vertexSnap: true, units: "mm", precision: 0 };

  // Override snap: vertex > edge > face hierarchy with large thresholds
  type NDCPoint = { x: number; y: number; z: number; distanceTo: (b: NDCPoint) => number; unproject: (cam: unknown) => unknown };
  type SnapInternals = {
    renderer: {
      renderingCamera: unknown;
      NDCToScreen: (x: number, y: number) => { x: number; y: number };
    };
  };
  const measInternals = measurements as unknown as SnapInternals;

  /** Closest point on line segment AB to point P (all in screen coords) */
  function closestPointOnSegment(
    ax: number, ay: number, bx: number, by: number, px: number, py: number
  ): { x: number; y: number; t: number } {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return { x: ax, y: ay, t: 0 };
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return { x: ax + t * dx, y: ay + t * dy, t };
  }

  (measurements as unknown as { snap: (intersection: {
    point: { project: (cam: unknown) => NDCPoint };
    face: { a: number; b: number; c: number; normal: unknown };
    batchObject: { accelerationStructure: { getVertexAtIndex: (i: number) => { project: (cam: unknown) => NDCPoint } } };
  }, outPoint: { copy: (v: unknown) => void }, outNormal: { copy: (v: unknown) => void }) => void }).snap = (intersection, outPoint, outNormal) => {
    const cam = measInternals.renderer.renderingCamera;
    if (!cam) return;

    const accel = intersection.batchObject.accelerationStructure;
    const ndcA = accel.getVertexAtIndex(intersection.face.a).project(cam);
    const ndcB = accel.getVertexAtIndex(intersection.face.b).project(cam);
    const ndcC = accel.getVertexAtIndex(intersection.face.c).project(cam);
    const hitNDC = intersection.point.project(cam);

    const toScreen = measInternals.renderer.NDCToScreen.bind(measInternals.renderer);
    const sA = toScreen(ndcA.x, ndcA.y);
    const sB = toScreen(ndcB.x, ndcB.y);
    const sC = toScreen(ndcC.x, ndcC.y);
    const sHit = toScreen(hitNDC.x, hitNDC.y);
    const dpr = window.devicePixelRatio;

    // 1. Vertex snap (50px threshold) — highest priority
    const verts = [
      { ndc: ndcA, screen: sA },
      { ndc: ndcB, screen: sB },
      { ndc: ndcC, screen: sC },
    ].sort((a, b) => {
      const da = Math.hypot(a.screen.x - sHit.x, a.screen.y - sHit.y);
      const db = Math.hypot(b.screen.x - sHit.x, b.screen.y - sHit.y);
      return da - db;
    });

    const vertDist = Math.hypot(verts[0].screen.x - sHit.x, verts[0].screen.y - sHit.y);
    if (vertDist < 50 * dpr) {
      outPoint.copy(verts[0].ndc.unproject(cam));
      outNormal.copy(intersection.face.normal);
      return;
    }

    // 2. Edge snap (30px threshold) — second priority
    const edges: Array<{ a: NDCPoint; b: NDCPoint; sA: { x: number; y: number }; sB: { x: number; y: number } }> = [
      { a: ndcA, b: ndcB, sA, sB },
      { a: ndcB, b: ndcC, sA: sB, sB: sC },
      { a: ndcC, b: ndcA, sA: sC, sB: sA },
    ];

    let bestEdgeDist = Infinity;
    let bestEdgePoint: NDCPoint | null = null;
    let bestT = 0;
    let bestEdge: typeof edges[0] | null = null;

    for (const edge of edges) {
      const cp = closestPointOnSegment(edge.sA.x, edge.sA.y, edge.sB.x, edge.sB.y, sHit.x, sHit.y);
      const dist = Math.hypot(cp.x - sHit.x, cp.y - sHit.y);
      if (dist < bestEdgeDist) {
        bestEdgeDist = dist;
        bestT = cp.t;
        bestEdge = edge;
      }
    }

    if (bestEdge && bestEdgeDist < 30 * dpr) {
      // Interpolate in NDC space, then unproject to get 3D point on edge
      const edgeNDC = {
        x: bestEdge.a.x + bestT * (bestEdge.b.x - bestEdge.a.x),
        y: bestEdge.a.y + bestT * (bestEdge.b.y - bestEdge.a.y),
        z: bestEdge.a.z + bestT * (bestEdge.b.z - bestEdge.a.z),
      };
      // Use vertex A's unproject by creating an interpolated point
      // We need a Three.js Vector3 — borrow from ndcA
      const pointOnEdge = accel.getVertexAtIndex(intersection.face.a).project(cam);
      pointOnEdge.x = edgeNDC.x;
      pointOnEdge.y = edgeNDC.y;
      pointOnEdge.z = edgeNDC.z;
      outPoint.copy(pointOnEdge.unproject(cam));
      outNormal.copy(intersection.face.normal);
      return;
    }

    // 3. Face point — lowest priority (no snap, use intersection point)
  };

  const explode = viewer.createExtension(ExplodeExtension);

  return { viewer, camera, selection, filtering, measurements, sections, explode };
}

export { SPECKLE_SERVER, MeasurementType };
