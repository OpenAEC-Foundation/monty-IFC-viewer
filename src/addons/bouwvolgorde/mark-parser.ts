import type { IViewer } from "@speckle/viewer";
import { SPECKLE_SERVER } from "../../core/viewer-setup";

export interface PhaseMapping {
  /** Sorted unique mark values (phases) */
  phases: string[];
  /** Map from mark value to array of WorldTree node IDs */
  markToIds: Map<string, string[]>;
  /** All element node IDs that have a Mark */
  allMarkedIds: string[];
  /** Element node IDs without a Mark */
  unmarkedIds: string[];
  /** Reverse lookup: node ID → mark value (for selection linking) */
  nodeIdToMark: Map<string, string>;
  /** Map from Original Type value to array of node IDs */
  typeToIds: Map<string, string[]>;
  /** Reverse lookup: node ID → Original Type */
  nodeIdToType: Map<string, string>;
  /** Map from collectie index (100-tal) to array of node IDs (Parts + Generic Models) */
  collectieToIds: Map<number, string[]>;
}

interface ElementInfo {
  nodeId: string;
  objectId: string;
}

/**
 * Parse Mark property from all elements in the model.
 * Walks the WorldTree, batch-fetches Mark values from Speckle API.
 */
export async function parseMarks(
  viewer: IViewer,
  projectId: string,
  onProgress?: (pct: number) => void
): Promise<PhaseMapping> {
  const tree = viewer.getWorldTree();
  if (!tree) throw new Error("WorldTree not available");

  // Collect all node IDs from the tree, and RevitObjects separately for Mark scanning
  const elements: ElementInfo[] = [];
  const allNodeIds = new Set<string>();
  tree.walk((node) => {
    const raw = node.model?.raw;
    if (raw?.id) {
      allNodeIds.add(raw.id);
      // RevitObjects can have Mark or CLT_T_Mark properties
      if (raw.category && raw.speckle_type?.includes("RevitObject")) {
        elements.push({ nodeId: raw.id, objectId: raw.id });
      }
    }
    return true;
  });

  console.log(`Bouwvolgorde: found ${elements.length} elements to scan`);

  // Batch-fetch Mark + Type values from Speckle API
  const markToIds = new Map<string, string[]>();
  const nodeIdToMark = new Map<string, string>();
  const typeToIds = new Map<string, string[]>();
  const nodeIdToType = new Map<string, string>();
  const allMarkedIds: string[] = [];
  const unmarkedIds: string[] = [];

  // Fetch in parallel batches
  const BATCH_SIZE = 20;
  let completed = 0;

  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((el) => fetchMarkAndType(projectId, el.objectId))
    );

    for (let j = 0; j < batch.length; j++) {
      const { mark, originalType } = results[j];
      const nodeId = batch[j].nodeId;

      if (mark !== null) {
        allMarkedIds.push(nodeId);
        nodeIdToMark.set(nodeId, mark);
        const existing = markToIds.get(mark);
        if (existing) {
          existing.push(nodeId);
        } else {
          markToIds.set(mark, [nodeId]);
        }
      } else {
        unmarkedIds.push(nodeId);
      }

      if (originalType !== null) {
        nodeIdToType.set(nodeId, originalType);
        const existing = typeToIds.get(originalType);
        if (existing) {
          existing.push(nodeId);
        } else {
          typeToIds.set(originalType, [nodeId]);
        }
      }

    }

    completed += batch.length;
    onProgress?.(completed / elements.length);
  }

  // Sort phases: try numeric, fall back to string sort
  const phases = Array.from(markToIds.keys()).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // Add all non-marked node IDs to unmarkedIds (generic models, annotations, etc.)
  const markedSet = new Set(allMarkedIds);
  for (const id of allNodeIds) {
    if (!markedSet.has(id) && !unmarkedIds.includes(id)) {
      unmarkedIds.push(id);
    }
  }

  // Build collectie map: group marks per 100 (0-99, 100-199, etc.)
  const collectieToIds = new Map<number, string[]>();
  for (const [mark, ids] of markToIds) {
    const num = parseInt(mark, 10);
    if (isNaN(num)) continue;
    const collectie = Math.floor(num / 100);
    const existing = collectieToIds.get(collectie);
    if (existing) {
      existing.push(...ids);
    } else {
      collectieToIds.set(collectie, [...ids]);
    }
  }

  console.log(
    `Bouwvolgorde: ${phases.length} fases, ` +
    `${allMarkedIds.length} met Mark, ` +
    `${typeToIds.size} types, ` +
    `${collectieToIds.size} collecties`
  );

  return { phases, markToIds, allMarkedIds, unmarkedIds, nodeIdToMark, typeToIds, nodeIdToType, collectieToIds };
}

interface FetchResult {
  mark: string | null;
  originalType: string | null;
}

async function fetchMarkAndType(
  projectId: string,
  objectId: string
): Promise<FetchResult> {
  try {
    const url = `${SPECKLE_SERVER}/objects/${projectId}/${objectId}/single`;
    const resp = await fetch(url);
    if (!resp.ok) return { mark: null, originalType: null };

    const obj = await resp.json();
    const instanceParams =
      obj?.properties?.Parameters?.["Instance Parameters"];
    if (!instanceParams) return { mark: null, originalType: null };

    // --- Mark ---
    let mark: string | null = null;

    // Check Text → CLT_T_Mark first (Generic Models with CLT tags)
    // Must be checked before Identity Data/Mark because CLT TAGs have Mark=0
    const textGroup = instanceParams["Text"];
    if (textGroup) {
      const cltParam = textGroup["CLT_T_Mark"] || textGroup["clt_t_mark"];
      if (cltParam) {
        const value = cltParam.value ?? cltParam;
        if (value !== null && value !== undefined && value !== "" && String(value) !== "0")
          mark = String(value);
      }
    }

    // Check Identity Data → Mark (Parts, structural elements)
    const identityData = instanceParams["Identity Data"];
    if (!mark && identityData) {
      const markParam = identityData.Mark || identityData.mark;
      if (markParam) {
        const value = markParam.value ?? markParam;
        if (value !== null && value !== undefined && value !== "" && String(value) !== "0")
          mark = String(value);
      }
    }

    // --- Original Type ---
    let originalType: string | null = null;
    if (identityData) {
      const typeParam = identityData["Original Type"] || identityData["original type"] || identityData["Type Name"] || identityData["type name"];
      if (typeParam) {
        const value = typeParam.value ?? typeParam;
        if (value !== null && value !== undefined && value !== "")
          originalType = String(value);
      }
    }

    return { mark, originalType };
  } catch {
    return { mark: null, originalType: null };
  }
}
