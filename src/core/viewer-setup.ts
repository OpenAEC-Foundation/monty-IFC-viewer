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

  // Dynamic zoom sensitivity: normal for mouse, distance-based for touch
  let isTouch = false;
  container.addEventListener("pointerdown", (e) => {
    isTouch = e.pointerType === "touch";
  });

  // Gradient zoom for touch: slower when closer to target
  function updateTouchZoomSensitivity(): void {
    requestAnimationFrame(updateTouchZoomSensitivity);
    if (!isTouch) {
      if (camera.options.zoomSensitivity !== 1.0) {
        camera.options = { ...camera.options, zoomSensitivity: 1.0 };
      }
      return;
    }
    const pos = camera.getPosition();
    const target = camera.getTarget();
    const dist = pos.distanceTo(target);
    // Scale: far (>50) = 0.3, close (<5) = 0.05, gradient between
    const sensitivity = Math.max(0.05, Math.min(0.3, dist * 0.006));
    camera.options = { ...camera.options, zoomSensitivity: sensitivity };
  }
  requestAnimationFrame(updateTouchZoomSensitivity);

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
