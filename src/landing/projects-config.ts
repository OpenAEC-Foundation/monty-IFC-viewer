export interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  phase: string;
  updated: string;
  elements: number;
  active: boolean;
  location?: string;
  lat?: number;
  lng?: number;
  speckleBase: string;
}

export interface MontyConfig {
  client: string;
  freeLimit: number;
  projects: Project[];
}

export const PHASE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "Uitvoering": { bg: "#ECFDF5", color: "#065F46", border: "rgba(5,150,105,.2)" },
  "DO":         { bg: "#F5F3FF", color: "#4C1D95", border: "rgba(124,58,237,.2)" },
  "VO":         { bg: "#FFFBEB", color: "#78350F", border: "rgba(245,158,11,.25)" },
  "AO":         { bg: "#F1F5F9", color: "#334155", border: "rgba(100,116,139,.2)" },
  "Gemonteerd": { bg: "#F0FDF4", color: "#14532D", border: "rgba(22,163,74,.2)" },
};

/**
 * Default project data.
 * In production, override via window.MONTY_CONFIG = { client, freeLimit, projects }.
 */
export const PROJECTS: Project[] = [
  {
    id: "b48733162c",
    title: "PR235078 Woning Kralingseweg 370 Rotterdam",
    description: "CLT Woning Kralingseweg 370 Rotterdam",
    type: "wonen",
    phase: "Uitvoering",
    updated: "2026-03-30",
    elements: 0,
    active: true,
    location: "Rotterdam",
    lat: 51.9225,
    lng: 4.4792,
    speckleBase: "https://app.montyviewer.com",
  },
  {
    id: "25349df1bc",
    title: "PR235031 Leeuwenhoek PZ09 Delft",
    description: "CLT Appartementencomplex Leeuwenhoek PZ09 Delft",
    type: "wonen",
    phase: "Gemonteerd",
    updated: "2026-03-30",
    elements: 0,
    active: true,
    location: "Delft",
    lat: 52.0116,
    lng: 4.3571,
    speckleBase: "https://app.montyviewer.com",
  },
  {
    id: "8225330c71",
    title: "CLT Appartementen Blauwgroep Delft",
    description: "CLT Appartementen Blauwgroep Delft",
    type: "wonen",
    phase: "Uitvoering",
    updated: "2026-04-13",
    elements: 0,
    active: true,
    location: "Delft",
    lat: 52.0116,
    lng: 4.3571,
    speckleBase: "https://app.montyviewer.com",
  },
  // Projects below freeLimit (3) — locked
  {
    id: "6aa8af2d3e",
    title: "JM25-020 TV Luck Raeck",
    description: "CLT en Glulam Tennisvereniging TV Luck Raeck",
    type: "sport",
    phase: "Gemonteerd",
    updated: "2026-03-30",
    elements: 381,
    active: true,
    location: "Maarssen",
    lat: 52.1363,
    lng: 5.0418,
    speckleBase: "https://app.montyviewer.com",
  },
  {
    id: "4e5da159c4",
    title: "JM25-074 Amsteldijk 802 Amsterdam",
    description: "Waterwoning Amsteldijk 802",
    type: "wonen",
    phase: "Gemonteerd",
    updated: "2026-03-16",
    elements: 0,
    active: false,
    location: "Amsterdam",
    lat: 52.3446,
    lng: 4.9168,
    speckleBase: "https://app.montyviewer.com",
  },
];

export const DEFAULT_CONFIG: MontyConfig = {
  client: "JM Concepten",
  freeLimit: 3,
  projects: PROJECTS,
};
