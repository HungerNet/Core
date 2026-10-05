export interface ModrinthVersionFile {
  url?: string;
  filename?: string;
  size?: number;
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  version_number: string;
  version_type?: string;
  date_published?: string;
  name?: string;
  game_versions?: string[];
  changelog?: string | null;
  files?: ModrinthVersionFile[];
  [key: string]: unknown;
}

function isModrinthVersion(entry: unknown): entry is ModrinthVersion {
  if (!entry || typeof entry !== "object") return false;

  const candidate = entry as Partial<ModrinthVersion>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.version_number === "string" &&
    (candidate.version_type === undefined || typeof candidate.version_type === "string") &&
    (candidate.date_published === undefined || typeof candidate.date_published === "string") &&
    (candidate.game_versions === undefined ||
      (Array.isArray(candidate.game_versions) && candidate.game_versions.every((version) => typeof version === "string")))
  );
}

export function getPackVersion(raw: string): string {
  if (raw.endsWith("-legacy") || raw.toLowerCase() === "legacy") {
    return "Legacy";
  }

  const base = raw.replace(/-(alpha|beta|hotfix)\.?(\d+)?$/i, "");
  const parts = base.split(".");
  const [major = "0", minor = "0", patch = "0"] = parts;

  if (patch !== "0") return `v${major}.${minor}.${patch}`;
  if (minor !== "0") return `v${major}.${minor}`;
  return `v${major}`;
}

export async function fetchModrinthProjectVersions(
  projectSlug: string,
  fetcher: typeof fetch = fetch,
): Promise<ModrinthVersion[]> {
  const url = `https://api.modrinth.com/v2/project/${projectSlug}/version`;

  const response = await fetcher(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Modrinth API request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(isModrinthVersion);
}

export async function fetchModrinthProjectVersion(
  projectSlug: string,
  versionIdentifier: string,
  fetcher: typeof fetch = fetch,
): Promise<ModrinthVersion> {
  const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectSlug)}/version/${encodeURIComponent(versionIdentifier)}`;
  const response = await fetcher(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Modrinth API request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isModrinthVersion(payload)) {
    throw new Error("Modrinth returned an invalid version payload");
  }

  return payload as ModrinthVersion;
}
