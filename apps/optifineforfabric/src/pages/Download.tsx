import { useEffect, useState } from "react"
import { GlassCard, usePageTitle, Dropdown, Searchbar } from "@hungernet/ui/components"
import { useNavigate } from "react-router-dom"
import type { ModrinthVersion } from "@hungernet/types"
import { getPackVersion } from "../utils/getPackVersion"

interface DownloadVersion extends ModrinthVersion {
  name: string
  version_type: string
  date_published: string
  game_versions: string[]
}

export default function Download() {
  usePageTitle("OptiFine for Fabric | Download")

  const [versions, setVersions] = useState<DownloadVersion[]>([])
  const [filtered, setFiltered] = useState<DownloadVersion[]>([])

  const [releaseType, setReleaseType] = useState("All")
  const [mcVersion, setMcVersion] = useState("All")
  const [packVersion, setPackVersion] = useState("All")
  const [search, setSearch] = useState("")

  const [mcVersions, setMcVersions] = useState<string[]>([])
  const [packVersions, setPackVersions] = useState<string[]>([])

  const navigate = useNavigate()

  // Spacer fix: ensure page has height at mount
  const Spacer = <div style={{display: "block", height: 0, overflow: "hidden", borderTop: "0.0000001vh solid transparent"}} />


  // Load versions
  useEffect(() => {
    async function load() {
      const res = await fetch(
        "https://api.modrinth.com/v2/project/optifine-for-fabric/version"
      )
      const data = (await res.json()) as DownloadVersion[]

      data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime())

      setVersions(data)
      setFiltered(data)

      const mc = new Set<string>()
      data.forEach(v => v.game_versions.forEach(g => mc.add(g)))
      setMcVersions(["All", ...Array.from(mc).sort().reverse()])

      const pv = new Set<string>()
      let hasLegacy = false

      data.forEach(v => {
        const pvRaw = getPackVersion(v.version_number)

        if (pvRaw === "Legacy") {
          hasLegacy = true
          return
        }

        if (pvRaw.toLowerCase() === "vlegacy") return

        const parts = pvRaw.replace("v", "").split(".")
        if (parts.length === 3) return

        pv.add(pvRaw)
      })

      let pvList = Array.from(pv)

      pvList.sort((a, b) => {
        const pa = a.replace("v", "").split(".").map(Number)
        const pb = b.replace("v", "").split(".").map(Number)

        if (pa[0] !== pb[0]) return pb[0] - pa[0]
        return (pb[1] || 0) - (pa[1] || 0)
      })

      if (hasLegacy) pvList.push("Legacy")

      setPackVersions(["All", ...pvList])
    }

    load()
  }, [])

  // Filtering + stagger fix
  useEffect(() => {
    let out = versions

    if (releaseType !== "All") {
      out = out.filter(v => v.version_type === releaseType.toLowerCase())
    }

    if (mcVersion !== "All") {
      out = out.filter(v => v.game_versions.includes(mcVersion))
    }

    if (packVersion !== "All") {
      if (packVersion === "Legacy") {
        out = out.filter(v =>
          v.version_number.toLowerCase() === "legacy" ||
          v.version_number.toLowerCase().endsWith("-legacy")
        )
      } else {
        out = out.filter(v => getPackVersion(v.version_number) === packVersion)
      }
    }

    if (search.trim() !== "") {
      const s = search.toLowerCase()
      out = out.filter(v =>
        v.name.toLowerCase().includes(s) ||
        v.version_number.toLowerCase().includes(s) ||
        v.version_type.toLowerCase().includes(s)
      )
    }

    setFiltered(out)

    requestAnimationFrame(() => {
      document.dispatchEvent(new Event("ifamished-ui-reveal"))
    })
  }, [releaseType, mcVersion, packVersion, search, versions])

  return (
    <div className="page">
      {Spacer}

      <div className="page-header fade-in-up">
        <h1>Download</h1>
        <p>Choose the release that matches your Minecraft version.</p>
      </div>

      <Searchbar value={search} onChange={setSearch} />

      <section className="section fade-in-up">
        <div className="download-filters">
          <Dropdown
            label="Release Type"
            value={releaseType}
            onChange={setReleaseType}
            options={["All", "release", "beta", "alpha"]}
          />

          <Dropdown
            label="Minecraft Version"
            value={mcVersion}
            onChange={setMcVersion}
            options={mcVersions}
          />

          <Dropdown
            label="Pack Version"
            value={packVersion}
            onChange={setPackVersion}
            options={packVersions}
          />
        </div>
      </section>

      <section className="section">
        <div
          className="download-grid stagger"
          key={filtered.length + releaseType + mcVersion + packVersion + search}
        >
          {filtered.map((v, i) => {
            const match = v.version_number.match(/-(alpha|beta|hotfix)\.?(\d+)?$/i)
            const channelType = match ? match[1] : v.version_type
            const channelNum = match ? match[2] : ""
            const channelLabel = channelNum
              ? `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} ${channelNum}`
              : channelType.charAt(0).toUpperCase() + channelType.slice(1)

            return (
              <GlassCard
                key={v.id}
                className="download-card"
                onClick={() => navigate(`/download/${encodeURIComponent(v.version_number)}`)}
                style={{ "--i": i, cursor: "pointer" }}
              >
                <div className="download-card-top">
                  <div className={`version-badge version-badge--${v.version_type}`}>
                    <span className="version-badge-dot" />
                    {channelLabel}
                  </div>

                  <span className="download-mc-label">
                    Minecraft {v.game_versions[0]}
                  </span>

                  <span className="download-version">
                    {getPackVersion(v.version_number)}
                  </span>

                  <p className="download-desc">
                    OptiFine for Fabric<br />
                    {getPackVersion(v.version_number)} • {v.game_versions[0]} • {channelLabel}
                  </p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>
    </div>
  )
}
