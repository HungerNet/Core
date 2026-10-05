import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchModrinthProjectVersion, fetchModrinthProjectVersions, getPackVersion } from "@hungernet/api-client";
import type { ModrinthVersion } from "@hungernet/types";
import { FaqAccordion, GlassCard, usePageTitle } from "@hungernet/ui";

interface SiteVersion extends ModrinthVersion {
  game_versions?: string[];
  version_type?: string;
  changelog?: string | null;
  date_published?: string;
}
const project = "optifine-for-fabric";
const helpFaqs = [
  ["Is this an official OptiFine port?", "No. OptiFine for Fabric is an independent project that recreates related features using native Fabric mods. It is not affiliated with sp614x or the official OptiFine team."],
  ["Does it support OptiFine shader packs?", "Yes. Iris supports OptiFine-format shader packs. Most popular packs work out of the box."],
  ["Is it free?", "Yes. The included mods are free and open source."],
  ["How do I install shaders?", "Open Options → Video Settings → Shader Packs, choose Open Shader Pack Folder, add your shader zip, select it, and apply."],
  ["Does it work on macOS and Linux?", "Yes. It runs wherever Fabric Loader runs."],
  ["How much faster is it than vanilla?", "Results vary by hardware; many users see substantial FPS improvements, especially on lower-end and integrated GPUs."],
  ["Where do I report bugs?", "Open a GitHub issue and include your Minecraft/Fabric versions and relevant log or crash report."],
];
const featureItems = [
  ["Sodium Rendering Engine", "Modern chunk rendering with major FPS improvements on supported hardware."],
  ["Lithium Game Logic", "Optimizes physics, mob AI, and chunk scheduling without changing gameplay."],
  ["Starlight Lighting", "A rewritten lighting engine for faster chunk lighting updates."],
  ["Iris Shader Support", "Use OptiFine-format shaders without restarting the game."],
  ["Connected Textures", "Continuity adds connected textures and emissive rendering."],
  ["Smooth Zoom", "Configurable zoom bound to a key with adjustable sensitivity."],
  ["Dynamic Lighting", "Held torches and glowing items illuminate nearby surroundings."],
  ["Modpack Compatible", "Components can be removed independently for a modular setup."],
];

function channelLabel(version: SiteVersion) {
  const match = version.version_number.match(/-(alpha|beta|hotfix)\.?(\d+)?$/i);
  const type = match?.[1] ?? version.version_type ?? "release";
  const number = match?.[2] ?? "";
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}${number ? ` ${number}` : ""}`;
}

export function HomePage() {
  usePageTitle("OptiFine for Fabric");
  return <div className="site-page"><GlassCard className="site-hero"><p className="section-label">Fabric Mod Collection</p><h1>OptiFine for Fabric</h1><p className="site-copy">The modern, Fabric-native replacement for OptiFine: faster rendering, beautiful shaders, and broad mod compatibility.</p><div className="tag-list">{["Fabric", "Sodium", "Iris", "Lithium", "Starlight", "DynamicLights"].map((tag) => <span className="site-tag" key={tag}>{tag}</span>)}</div><div className="site-actions"><Link className="site-button primary" to="/download">Download</Link><Link className="site-button" to="/features">Features</Link><Link className="site-button" to="/install">Install Guide</Link></div><div className="site-grid" style={{ marginTop:"2rem" }}>{[["8×", "FPS Boost"], ["500k+", "Total Downloads"], ["26.2", "Latest versions"], ["<1 MB", "Lightweight"], ["100%", "Free & open-source"]].map(([value,label]) => <div key={label}><strong>{value}</strong><p className="site-meta">{label}</p></div>)}</div></GlassCard><section><h2>Everything OptiFine offered — and more.</h2><p className="site-meta">A curated collection of Fabric performance and visual mods.</p><div className="site-grid" style={{ marginTop:"1rem" }}>{[["Performance", "Sodium, Lithium, and Starlight improve rendering and game performance."], ["Visual Enhancements", "Connected textures, custom skies, zoom, and emissive rendering."], ["Shader Support", "Iris integration for compatible shader packs."], ["Modpack Friendly", "Lightweight and modular components."]].map(([title,description]) => <GlassCard className="site-card" key={title}><h3>{title}</h3><p>{description}</p></GlassCard>)}</div></section><GlassCard className="site-card"><h2>Ready to get started?</h2><p>Get the latest release and follow the installation guide.</p><div className="site-actions"><Link className="site-button primary" to="/download">Latest Release</Link><Link className="site-button" to="/install">Installation Guide</Link></div></GlassCard></div>;
}

export function DownloadPage() {
  usePageTitle("OptiFine for Fabric | Download");
  const [versions, setVersions] = useState<SiteVersion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [releaseType, setReleaseType] = useState("All");
  const [mcVersion, setMcVersion] = useState("All");
  const [packVersion, setPackVersion] = useState("All");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  useEffect(() => { void fetchModrinthProjectVersions(project).then((items) => setVersions((items as SiteVersion[]).sort((left, right) => new Date(right.date_published ?? 0).getTime() - new Date(left.date_published ?? 0).getTime()))).catch(() => setError("Could not load releases from Modrinth. Please try again later.")).finally(() => setLoading(false)); }, []);
  const mcVersions = ["All", ...new Set(versions.flatMap((version) => version.game_versions ?? []))].sort((a,b) => a === "All" ? -1 : b.localeCompare(a, undefined, { numeric:true }));
  const packVersions = (() => { let legacy = false; const items = new Set<string>(); versions.forEach((version) => { const value = getPackVersion(version.version_number); if (value === "Legacy") { legacy = true; return; } if (value.toLowerCase() !== "vlegacy" && value.replace("v", "").split(".").length !== 3) items.add(value); }); const sorted = [...items].sort((a,b) => { const [aMajor,aMinor=0] = a.replace("v", "").split(".").map(Number); const [bMajor,bMinor=0] = b.replace("v", "").split(".").map(Number); return bMajor-aMajor || bMinor-aMinor; }); if (legacy) sorted.push("Legacy"); return ["All", ...sorted]; })();
  const filtered = versions.filter((version) => {
    if (releaseType !== "All" && version.version_type !== releaseType.toLowerCase()) return false;
    if (mcVersion !== "All" && !(version.game_versions ?? []).includes(mcVersion)) return false;
    if (packVersion !== "All") { const legacy = version.version_number.toLowerCase() === "legacy" || version.version_number.toLowerCase().endsWith("-legacy"); if (packVersion === "Legacy" ? !legacy : getPackVersion(version.version_number) !== packVersion) return false; }
    const needle = search.trim().toLowerCase(); return !needle || [version.name ?? "", version.version_number, version.version_type ?? ""].some((text) => text.toLowerCase().includes(needle));
  });
  return <div className="site-page"><header className="page-header"><h1>Download</h1><p>Choose the release that matches your Minecraft version.</p></header><div className="site-form"><div className="site-field"><label htmlFor="release-search">Search</label><input id="release-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search releases" /></div><Filter label="Release Type" value={releaseType} onChange={setReleaseType} options={["All", "release", "beta", "alpha"]} /><Filter label="Minecraft Version" value={mcVersion} onChange={setMcVersion} options={mcVersions} /><Filter label="Pack Version" value={packVersion} onChange={setPackVersion} options={packVersions} /></div>{loading ? <p role="status">Loading releases…</p> : error ? <GlassCard className="site-card"><p role="alert" className="site-error">{error}</p></GlassCard> : filtered.length ? <div className="download-grid">{filtered.map((version) => <button className="glass-card download-card version-card" key={version.id} onClick={() => navigate(`/download/${encodeURIComponent(version.version_number)}`)}><div className="version-head"><span className="site-tag">{channelLabel(version)}</span><span className="site-meta">Minecraft {version.game_versions?.[0] ?? "Unknown"}</span></div><h2>{getPackVersion(version.version_number)}</h2><p>{version.name ?? "OptiFine for Fabric"}</p><p className="site-meta">{getPackVersion(version.version_number)} · {version.game_versions?.[0] ?? "Unknown"} · {channelLabel(version)}</p></button>)}</div> : <GlassCard className="site-card"><p>No releases match these filters.</p></GlassCard>}</div>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  const id = `filter-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="site-field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option === "All" ? "All" : option}</option>)}</select></div>;
}

export function DownloadVersionPage() {
  const { version = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SiteVersion | null>(null);
  const [error, setError] = useState("");
  const [openError, setOpenError] = useState("");
  usePageTitle(`Download ${version}`);
  useEffect(() => { let active = true; void fetchModrinthProjectVersion(project, version).then((result) => { if (active) setData(result as SiteVersion); }).catch(() => { if (active) setError("This release could not be found on Modrinth."); }); return () => { active = false; }; }, [version]);
  function openInModrinth(versionId: string) { let opened = false; const onVisibility = () => { if (document.visibilityState === "hidden") opened = true; }; document.addEventListener("visibilitychange", onVisibility); window.location.href = `modrinth://version/${versionId}`; window.setTimeout(() => { document.removeEventListener("visibilitychange", onVisibility); if (!opened) setOpenError("The Modrinth App could not be opened. It may not be installed on this device."); }, 800); }
  if (!data) return <div className="site-page"><GlassCard className="site-card"><p role={error ? "alert" : "status"}>{error || "Loading release…"}</p><button className="site-button" onClick={() => navigate("/download")}>Back to downloads</button></GlassCard></div>;
  const packVersion = getPackVersion(data.version_number);
  const mcVersion = data.game_versions?.[0] ?? "Unknown";
  const directUrl = `https://modrinth.com/modpack/${project}/version/${data.version_number}`;
  return <div className="site-page"><header className="page-header"><h1>OptiFine for Fabric {packVersion}</h1><div className="tag-list"><span className="site-tag">Minecraft {mcVersion}</span><span className="site-tag">{channelLabel(data)}</span></div></header><div className="version-actions"><button className="site-button primary" onClick={() => openInModrinth(data.id)}>Open in Modrinth App</button><a className="site-button" href={directUrl}>Direct Download</a></div>{openError && <GlassCard className="site-card" role="alert"><strong>Error</strong><p>{openError}</p></GlassCard>}<section><h2>Changelog</h2><GlassCard className="site-card changelog">{data.changelog || "No changelog provided."}</GlassCard></section></div>;
}

export function FeaturesPage() {
  usePageTitle("OptiFine for Fabric | Features");
  const comparison = ["Hardware-accelerated rendering", "Works with resource packs", "Multi-threaded chunk rendering", "Advanced block/entity culling", "Faster world loading", "Borderless fullscreen", "Rebuilt lighting engine", "Shader pack support", "Connected textures", "Configurable zoom", "Dynamic lighting for held items"];
  return <div className="site-page"><header className="page-header"><h1>Features</h1><p>Everything included in the OptiFine for Fabric experience — and why each piece matters.</p></header><div className="site-grid">{featureItems.map(([title,description]) => <GlassCard className="site-card" key={title}><h2>{title}</h2><p>{description}</p></GlassCard>)}</div><section><h2>Vanilla vs OptiFine for Fabric</h2><p className="site-meta">A direct comparison of what changes when you make the switch.</p><div className="compare-grid">{["Vanilla Minecraft","OptiFine for Fabric"].map((heading,index) => <GlassCard className="site-card" key={heading}><h3>{heading}</h3><ul>{comparison.map((item,i) => <li key={item}>{index === 1 || i < 2 ? "✓" : "−"} {item}</li>)}</ul></GlassCard>)}</div></section><Link className="site-button primary" to="/download">Download</Link></div>;
}

export function InstallPage() {
  usePageTitle("OptiFine for Fabric | Install");
  const steps = [["Install the Modrinth App", "Download the app for Windows, macOS, or Linux. It manages Minecraft instances and modpacks.", "https://modrinth.com/app"], ["Search for versions", "Open the version list on optifineforfabric.com/download.", "/download"], ["Select a version", "Use the filters to find the release matching your Minecraft version."], ["Install", "Choose Open in Modrinth App to install the selected version."], ["Launch", "Click Play in the Modrinth App; it handles mod loading automatically."]];
  const troubleshooting = [["Modrinth App link does not open", "Ensure the Modrinth App is installed."], ["Lower FPS after installing", "Remove conflicting rendering mods such as OptiFabric or Canvas."], ["Game crashes on launch", "Check the instance logs for a failing mod."], ["Other issues", "Reach out on Discord or GitHub."]];
  return <div className="site-page"><header className="page-header"><h1>Installation Guide</h1><p>Install OptiFine for Fabric using the Modrinth App.</p></header><div className="site-grid">{steps.map(([title,body,href],i) => <GlassCard className="site-card" key={title}><p className="section-label">STEP {i+1}</p><h2>{title}</h2><p>{body}</p>{href && <a href={href}>{href}</a>}</GlassCard>)}</div><section><h2>Troubleshooting</h2><div className="faq-list">{troubleshooting.map(([q,a]) => <FaqAccordion key={q} q={q} a={a} />)}</div></section><div className="site-actions"><a className="site-button primary" href="https://discord.gg/aNUYADauTJ">Join Discord</a><Link className="site-button" to="/help">FAQ</Link></div></div>;
}

export function HelpPage() {
  usePageTitle("OptiFine for Fabric | Help");
  useEffect(() => { const script = document.createElement("script"); script.async = true; script.src = "https://embed.tawk.to/6913ebffc3f840195fe58a21/1j9qt3o0u"; script.charset = "UTF-8"; script.setAttribute("crossorigin", "*"); document.body.appendChild(script); return () => { script.remove(); }; }, []);
  return <div className="site-page"><header className="page-header"><h1>FAQ</h1><p>Answers to common questions about OptiFine for Fabric.</p></header><div className="faq-list">{helpFaqs.map(([q,a]) => <FaqAccordion key={q} q={q} a={a} />)}</div><GlassCard className="site-card"><h2>Still have questions?</h2><p>Join the Discord or browse GitHub for more detail.</p><div className="site-actions"><a className="site-button primary" href="https://discord.gg/aNUYADauTJ">Discord</a><a className="site-button" href="https://github.com/iFamishedX/optifine-for-fabric">GitHub</a></div></GlassCard></div>;
}
