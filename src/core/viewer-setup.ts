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

  // Dynamic zoom: mouse = 1.0, touch = distance-based gradient
  container.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") {
      const dist = camera.getPosition().distanceTo(camera.getTarget());
      // Far (>50) = 0.4, close (<2) = 0.05, linear gradient
      const s = Math.max(0.05, Math.min(0.4, dist * 0.008));
      camera.options = { ...camera.options, zoomSensitivity: s };
    } else {
      camera.options = { ...camera.options, zoomSensitivity: 1.0 };
    }
  });

  // Also update during pinch (touchmove fires while fingers move)
  container.addEventListener("touchmove", () => {
    const dist = camera.getPosition().distanceTo(camera.getTarget());
    const s = Math.max(0.05, Math.min(0.4, dist * 0.008));
    camera.options = { ...camera.options, zoomSensitivity: s };
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
