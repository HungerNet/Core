// getPackVersion.js
export function getPackVersion(raw: string): string {
  // Literal legacy versions only
  if (raw.endsWith("-legacy") || raw.toLowerCase() === "legacy") {
    return "Legacy"
  }

  // Strip channel suffix: -alpha.1, -beta.2, -hotfix.1
  const base = raw.replace(/-(alpha|beta|hotfix)\.?(\d+)?$/i, "")
  const parts = base.split(".")

  const [major, minor = "0", patch = "0"] = parts

  if (patch !== "0") return `v${major}.${minor}.${patch}`
  if (minor !== "0") return `v${major}.${minor}`
  return `v${major}`
}
