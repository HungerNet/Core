export const NORMAL_DOMAINS = {
  api: "https://api.hungernet.dev/api/v1",
  accounts: "https://accounts.hungernet.dev",
  hungernet: "https://hungernet.dev",
  admin: "https://admin.hungernet.dev",
  ifamished: "https://ifamished.com",
  optifineforfabric: "https://optifineforfabric.com",
  hungersmp: "https://hungersmp.com",
} as const;

export const WORKERS_DEV_DOMAINS = {
  api: "https://api.hacklets.dev/api/v1",
  accounts: "https://accounts.millered001.workers.dev",
  hungernet: "https://hungernet.millered001.workers.dev",
  admin: "https://admin.millered001.workers.dev",
  ifamished: "https://ifamished.millered001.workers.dev",
  optifineforfabric: "https://optifineforfabric.millered001.workers.dev",
  hungersmp: "https://hungersmp.millered001.workers.dev",
} as const;

const APP_HOSTS = new Set(
  Object.entries(NORMAL_DOMAINS)
    .filter(([name]) => name !== "api")
    .map(([, domain]) => new URL(domain).hostname.toLowerCase()),
);

const LOCAL_APP_ORIGINS = new Set([
  "http://localhost:4173",
  "http://localhost:4174",
  "http://localhost:4180",
  "http://localhost:4181",
  "http://localhost:4182",
  "http://localhost:4183",
]);

export function usesFirstPartyApi(origin: string): boolean {
  const url = new URL(origin);
  const hostname = url.hostname.toLowerCase();
  return (
    hostname.endsWith(".workers.dev") ||
    APP_HOSTS.has(hostname) ||
    LOCAL_APP_ORIGINS.has(url.origin)
  );
}

export function getDomainConfig() {
  return new URL(window.location.origin).hostname
    .toLowerCase()
    .endsWith(".workers.dev")
    ? WORKERS_DEV_DOMAINS
    : NORMAL_DOMAINS;
}
