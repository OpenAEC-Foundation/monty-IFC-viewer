import { CLIENT_CONFIGS, type Project, type MontyConfig } from "../landing/projects-config";

export interface RouteInfo {
  clientSlug: string;
  config: MontyConfig | null;
  projectSlug: string | null;
  project: Project | null;
  projectIndex: number;
}

export function parseRoute(): RouteInfo {
  const segs = location.pathname.split("/").filter(Boolean);
  const clientSlug = (segs[0] ?? "").toLowerCase();
  const projectSlug = segs[1] ? segs[1].toLowerCase() : null;
  const config = CLIENT_CONFIGS[clientSlug] ?? null;

  if (!config || !projectSlug) {
    return { clientSlug, config, projectSlug, project: null, projectIndex: -1 };
  }

  const m = projectSlug.match(/^pr(\d+)$/);
  if (!m) return { clientSlug, config, projectSlug, project: null, projectIndex: -1 };

  const idx = Number(m[1]) - 1;
  const project = config.projects[idx] ?? null;
  return { clientSlug, config, projectSlug, project, projectIndex: project ? idx : -1 };
}

export function landingPath(clientSlug: string): string {
  return `/${clientSlug}/`;
}

export function projectPath(clientSlug: string, projectIndex: number): string {
  return `/${clientSlug}/pr${projectIndex + 1}`;
}
