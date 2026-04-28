import { SpeckleLoader, LoaderEvent, type IViewer } from "@speckle/viewer";
import { SPECKLE_SERVER } from "./viewer-setup";

export interface StreamParams {
  projectId: string;
  modelId?: string;
  objectId?: string;
}

interface BranchInfo {
  name: string;
  objectId: string;
}

export interface LoadedModel {
  name: string;
  objectId: string;
  url: string;
}

/**
 * Parse stream parameters from URL query string.
 * Supports:
 *   ?project=abc123              — load all models
 *   ?project=abc123&model=name   — load specific branch
 *   ?project=abc123&object=id    — load specific object
 *   ?url=https://app.montyviewer.com/projects/abc123/models/def456
 */
export function parseStreamParams(): StreamParams | null {
  const params = new URLSearchParams(window.location.search);

  const projectId = params.get("project");
  if (projectId) {
    return {
      projectId,
      modelId: params.get("model") ?? undefined,
      objectId: params.get("object") ?? undefined,
    };
  }

  const fullUrl = params.get("url");
  if (fullUrl) return parseSpeckleUrl(fullUrl);

  return null;
}

function parseSpeckleUrl(url: string): StreamParams | null {
  const match = url.match(
    /\/projects\/([a-f0-9]+)(?:\/models\/([a-f0-9@]+))?/
  );
  if (!match) return null;

  return {
    projectId: match[1],
    modelId: match[2] ?? undefined,
  };
}

/**
 * Resolve all branches with commits in a project.
 */
async function resolveAllBranches(projectId: string): Promise<BranchInfo[]> {
  const query = `{
    stream(id: "${projectId}") {
      branches {
        items {
          name
          commits(limit: 1) {
            items { referencedObject }
          }
        }
      }
    }
  }`;

  const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const data = await response.json();
  const branches = data?.data?.stream?.branches?.items ?? [];

  return branches
    .filter(
      (b: { commits: { items: { referencedObject: string }[] } }) =>
        b.commits.items.length > 0
    )
    .map(
      (b: {
        name: string;
        commits: { items: { referencedObject: string }[] };
      }) => ({
        name: b.name,
        objectId: b.commits.items[0].referencedObject,
      })
    );
}

/**
 * Resolve the object ID for a specific branch.
 */
async function resolveBranchObjectId(
  projectId: string,
  branchName: string
): Promise<string> {
  const query = `{
    stream(id: "${projectId}") {
      branch(name: "${branchName}") {
        commits(limit: 1) {
          items { referencedObject }
        }
      }
    }
  }`;

  const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const data = await response.json();
  const commits = data?.data?.stream?.branch?.commits?.items;

  if (!commits || commits.length === 0) {
    throw new Error(`Geen commits gevonden in branch "${branchName}"`);
  }

  return commits[0].referencedObject;
}

/**
 * Load a single object into the viewer.
 */
async function loadObject(
  viewer: IViewer,
  projectId: string,
  objectId: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const url = `${SPECKLE_SERVER}/streams/${projectId}/objects/${objectId}`;
  console.log("Loading:", url);

  const loader = new SpeckleLoader(viewer.getWorldTree(), url, "");

  if (onProgress) {
    loader.on(LoaderEvent.LoadProgress, (args: { progress: number }) => {
      onProgress(args.progress);
    });
  }

  await viewer.loadObject(loader, true);
}

/**
 * Load model(s) from Speckle server into the viewer.
 * If no specific model/object is given, loads ALL branches.
 * Returns info about all loaded models.
 */
export async function loadStream(
  viewer: IViewer,
  params: StreamParams,
  onProgress?: (progress: number) => void
): Promise<LoadedModel[]> {
  const models: LoadedModel[] = [];

  // Case 1: specific object ID
  if (params.objectId) {
    const url = buildUrl(params.projectId, params.objectId);
    await loadObject(viewer, params.projectId, params.objectId, onProgress);
    models.push({ name: "Object", objectId: params.objectId, url });
    return models;
  }

  // Case 2: specific branch/model name
  if (params.modelId) {
    const objectId = await resolveBranchObjectId(
      params.projectId,
      params.modelId
    );
    const url = buildUrl(params.projectId, objectId);
    await loadObject(viewer, params.projectId, objectId, onProgress);
    models.push({ name: params.modelId, objectId, url });
    return models;
  }

  // Case 3: load ALL branches with commits
  const branches = await resolveAllBranches(params.projectId);
  if (branches.length === 0) {
    throw new Error("Geen modellen gevonden in dit project");
  }

  console.log(
    `Loading ${branches.length} models:`,
    branches.map((b) => b.name)
  );

  let loaded = 0;
  for (const branch of branches) {
    const url = buildUrl(params.projectId, branch.objectId);
    await loadObject(
      viewer,
      params.projectId,
      branch.objectId,
      (progress) => {
        const total = (loaded + progress) / branches.length;
        onProgress?.(total);
      }
    );
    models.push({ name: branch.name, objectId: branch.objectId, url });
    loaded++;
  }

  return models;
}

function buildUrl(projectId: string, objectId: string): string {
  return `${SPECKLE_SERVER}/streams/${projectId}/objects/${objectId}`;
}
