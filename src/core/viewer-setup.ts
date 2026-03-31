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

  // Dynamic zoom: mouse = 1.0, touch = distance-based (logarithmic)
  function touchZoomSensitivity(): number {
    const dist = camera.getPosition().distanceTo(camera.getTarget());
    // Logarithmic scale: slows down dramatically when close
    // dist=100 → 0.35, dist=10 → 0.18, dist=1 → 0.01, dist=0.1 → 0.0
    return Math.max(0.01, Math.min(0.35, Math.log10(Math.max(dist, 0.1)) * 0.17));
  }

  container.addEventListener("pointerdown", (e) => {
    const s = e.pointerType === "touch" ? touchZoomSensitivity() : 1.0;
    camera.options = { ...camera.options, zoomSensitivity: s };
  });

  container.addEventListener("touchmove", () => {
    camera.options = { ...camera.options, zoomSensitivity: touchZoomSensitivity() };
  }, { passive: true });

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
