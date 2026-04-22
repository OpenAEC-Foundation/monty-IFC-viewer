import type { ViewerInstance } from "./viewer-setup";
import type { PhaseMapping } from "../addons/bouwvolgorde/mark-parser";

let cltHidden = false;
let mapping: PhaseMapping | null = null;
const listeners = new Set<(hidden: boolean) => void>();

export function setFilterStateMapping(m: PhaseMapping): void {
  mapping = m;
}

export function getCltHidden(): boolean {
  return cltHidden;
}

export function setCltHidden(value: boolean): void {
  if (cltHidden === value) return;
  cltHidden = value;
  for (const fn of listeners) fn(cltHidden);
}

export function onCltHiddenChange(fn: (hidden: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Apply CLT hide overlay on top of current filter state. Call AFTER any isolateObjects.
 *  ghost=false: CLT tags are completely invisible (not just transparent). */
export function applyCltOverlay(instance: ViewerInstance): void {
  if (!cltHidden || !mapping || mapping.cltTagIds.length === 0) return;
  instance.filtering.hideObjects(mapping.cltTagIds, undefined, true, false);
}
