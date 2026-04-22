import type { ViewerInstance } from "../../core/viewer-setup";
import type { PhaseMapping } from "./mark-parser";
import { applyCltOverlay } from "../../core/filter-state";

/** Colors for phase states */
const COLORS = {
  current: "#f5a623",   // Orange — being placed now
};

export class PhaseManager {
  private instance: ViewerInstance;
  private mapping: PhaseMapping;
  private _currentPhase = -1;

  constructor(instance: ViewerInstance, mapping: PhaseMapping) {
    this.instance = instance;
    this.mapping = mapping;
  }

  get phaseCount(): number {
    return this.mapping.phases.length;
  }

  get currentPhase(): number {
    return this._currentPhase;
  }

  get currentPhaseName(): string {
    if (this._currentPhase < 0 || this._currentPhase >= this.mapping.phases.length) {
      return "";
    }
    return this.mapping.phases[this._currentPhase];
  }

  /** Set the active phase (0-based index). All elements up to this phase are shown. */
  setPhase(index: number): void {
    if (index < 0 || index >= this.mapping.phases.length) return;
    this._currentPhase = index;
    this.applyPhase();
  }

  /** Go to next phase. Returns false if already at last phase. */
  next(): boolean {
    if (this._currentPhase >= this.mapping.phases.length - 1) return false;
    this.setPhase(this._currentPhase + 1);
    return true;
  }

  /** Go to previous phase. Returns false if already at first phase. */
  prev(): boolean {
    if (this._currentPhase <= 0) return false;
    this.setPhase(this._currentPhase - 1);
    return true;
  }

  /** Reset: show all elements with original colors (CLT hide overlay preserved if active). */
  reset(): void {
    this._currentPhase = -1;
    this.instance.filtering.removeUserObjectColors();
    this.instance.filtering.resetFilters();
    applyCltOverlay(this.instance);
    this.instance.viewer.requestRender();
  }

  private applyPhase(): void {
    const { phases, markToIds } = this.mapping;
    const filtering = this.instance.filtering;

    // Collect IDs for visible phases (past + current)
    const visibleIds: string[] = [];
    const currentIds: string[] = [];

    for (let i = 0; i < phases.length; i++) {
      const ids = markToIds.get(phases[i]);
      if (!ids || ids.length === 0) continue;

      if (i <= this._currentPhase) {
        visibleIds.push(...ids);
        if (i === this._currentPhase) {
          currentIds.push(...ids);
        }
      }
    }

    // Reset first
    filtering.resetFilters();

    // Isolate visible elements — future phases + unmarked become ghosted (transparent + grey outlines)
    filtering.isolateObjects(visibleIds, undefined, true, true);

    // Highlight current phase in orange
    if (currentIds.length > 0) {
      filtering.setUserObjectColors([{ objectIds: currentIds, color: COLORS.current }]);
    }

    // setUserObjectColors overrides hide — re-apply CLT overlay last so tags stay hidden
    applyCltOverlay(this.instance);
  }
}
