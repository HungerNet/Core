import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { GlassButton, Icon, usePageTitle, MarkdownRenderer } from "@hungernet/ui/components"
import type { ModrinthVersion } from "@hungernet/types"
import { getPackVersion } from "../../utils/getPackVersion"

interface DownloadVersionData extends ModrinthVersion {
  version_type: string
  game_versions: string[]
}

export default function DownloadVersion() {
  const { version = "" } = useParams()
  const decodedVersion = decodeURIComponent(version)

  const [data, setData] = useState<DownloadVersionData | null>(null)
  const [error, setError] = useState("")

  const Spacer = (
    <div
      style={{
        display: "block",
        height: 0,
        overflow: "hidden",
        borderTop: "0.0000001vh solid transparent",
      }}
    />
  )

  usePageTitle(`Download ${decodedVersion}`)

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `https://api.modrinth.com/v2/project/optifine-for-fabric/version/${decodedVersion}`
      )
      const json = (await res.json()) as DownloadVersionData
      setData(json)
    }
    load()
  }, [decodedVersion])

  // -------------------------------------------------------
  // Deep-link detection
  // -------------------------------------------------------
  function openModrinth(versionId: string) {
    let appOpened = false

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        appOpened = true
      }
    }

    document.addEventListener("visibilitychange", onVisibility)

    // Attempt to open Modrinth App
    window.location.href = `modrinth://version/${versionId}`

    // After 800ms, if still visible → failed
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibility)

      if (!appOpened) {
        setError("The Modrinth App could not be opened. It may not be installed on this device.")
      }
    }, 800)
  }

  if (!data) {
    return (
      <div className="page version-page fade-in-up">
        <p>Loading…</p>
      </div>
    )
  }

  const mc = data.game_versions[0]
  const packVersion = getPackVersion(data.version_number)

  const match = data.version_number.match(/-(alpha|beta|hotfix)\.?(\d+)?$/i)
  const channelType = match ? match[1] : data.version_type
  const channelNum = match ? match[2] : ""
  const channelLabel = channelNum
    ? `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} ${channelNum}`
    : channelType.charAt(0).toUpperCase() + channelType.slice(1)

  return (
    <div className="page version-page fade-in-up">
      {Spacer}

      <h1 className="version-title">OptiFine for Fabric {packVersion}</h1>

      <div className="tech-tag-list">
        <span className="tech-tag">Minecraft {mc}</span>
        <span className="tech-tag">{channelLabel}</span>
      </div>

      <div className="version-actions">
        <GlassButton variant="primary" onClick={() => openModrinth(data.id)}>
          <Icon name="modrinth" size={16} />
          Open in Modrinth App
        </GlassButton>

        <GlassButton
          variant="ghost"
          href={`https://modrinth.com/modpack/optifine-for-fabric/version/${data.version_number}`}
        >
          <Icon name="download" size={16} />
          Direct Download
        </GlassButton>
      </div>

      {error && (
        <div
          className="version-error fade-in-up"
          style={{
            marginTop: "var(--space-5)",
            marginBottom: "var(--space-5)",
            padding: "var(--space-4)",
            borderRadius: "12px",
            background: "rgba(255, 65, 65, 0.12)",
            border: "1px solid rgba(255, 65, 65, 0.4)",
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
          }}
        >
          <Icon
            name="error"
            size={20}
            style={{
              color: "rgb(255, 90, 90)",
              flexShrink: 0,
              marginTop: "2px",
            }}
          />

          <div style={{ color: "var(--text-primary)", lineHeight: 1.55 }}>
            <strong style={{ display: "block", marginBottom: "4px" }}>
              Error
            </strong>
            {error}
          </div>
        </div>
      )}

      <section className="version-changelog">
        <h2>Changelog</h2>

        <MarkdownRenderer
          text={data.changelog || "_No changelog provided._"}
        />
      </section>
    </div>
  )
}
