import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { createApiClient } from "@hungernet/api-client";
import type { ProjectRecord, ProjectSummary, PublicProfile } from "@hungernet/types";
import { GlassCard, InputBox, usePageTitle } from "@hungernet/ui";

const localProjects: ProjectSummary[] = [
  { id: "hungerbridge", slug: "hungerbridge", name: "HungerBridge", description: "A lightweight multiloader HTTP bridge for secure server automation and remote control.", url: "https://github.com/iFamished/HungerBridge" },
  { id: "hungerlib", slug: "hungerlib", name: "HungerLib", description: "Python clients for command execution, log streaming, and status polling.", url: "https://github.com/iFamished/HungerLib" },
  { id: "mapres", slug: "mapres", name: "MapRes", description: "A fast string-mapping library designed for scalable datamaps.", url: "https://github.com/iFamished/mapres" },
  { id: "optifine-for-fabric", slug: "optifine-for-fabric", name: "OptiFine for Fabric", description: "A modern Fabric-native performance and visual mod collection.", url: "https://optifineforfabric.com" },
  { id: "the-hunger-smp", slug: "the-hunger-smp", name: "The Hunger SMP", description: "A semi-anarchy server built on HungerNet infrastructure.", url: "https://hungersmp.com" },
  { id: "mysticroot-smp", slug: "mysticroot-smp", name: "MysticRoot SMP", description: "An Origins Minecraft server for a friendly community, backed by HungerNet infrastructure.", url: "https://mysticaltree.net/mysticroot-smp/", status: "NEW" },
  { id: "c2e", slug: "c2e", name: "C2E", description: "Console Command Engine, a readable Python library for console-based commands.", url: "https://github.com/iFamished/C2E", status: "NEW" },
];
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const domainPattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;

export function HomePage() {
  usePageTitle("HungerNet");
  const highlights = [["Hosting Partner", "Fast, reliable infrastructure for game servers, web apps, and custom projects."], ["Unified Project Hub", "OptiFine for Fabric, Raven Client, New Moon, Hunger SMP, and ecosystem projects."], ["Secure by Default", "HTTPS, Cloudflare protection, hardened configs, and deployment pipelines."], ["Developer-Focused", "Clean APIs, modular systems, and tools designed for rapid iteration."]];
  return <div className="site-page"><GlassCard className="site-hero"><p className="section-label">Projects &amp; Tools</p><h1>HungerNet</h1><p className="site-copy">A unified ecosystem powering developers, modders, website designers, and creators.</p><div className="tag-list">{["Infrastructure", "Hosting", "Projects", "Open-Source", "Security"].map((tag) => <span className="site-tag" key={tag}>{tag}</span>)}</div><div className="site-actions"><Link className="site-button primary" to="/hosting">Get Hosting</Link><Link className="site-button" to="/projects">View Projects</Link><Link className="site-button" to="/tools">View Tools</Link></div><div className="site-grid" style={{ marginTop: "2rem" }}>{[["Developer", "Oriented"], ["8+", "Active Projects"], ["100%", "Open-Source"]].map(([value, label]) => <div key={label}><strong>{value}</strong><p className="site-meta">{label}</p></div>)}</div></GlassCard><section><h2>Your ecosystem for servers, tools, and development.</h2><p className="site-meta">Minecraft infrastructure, web apps, modding tools, guides, and project management.</p><div className="site-grid" style={{ marginTop: "1rem" }}>{highlights.map(([title, desc]) => <GlassCard className="site-card" key={title}><h3>{title}</h3><p>{desc}</p></GlassCard>)}</div></section><GlassCard className="site-card"><h2>Explore the ecosystem</h2><p>Browse projects, use tools, or find platform members.</p><div className="site-actions"><Link className="site-button primary" to="/projects">Projects</Link><Link className="site-button" to="/tools">Tools</Link></div></GlassCard></div>;
}

export function HostingPage() {
  usePageTitle("HungerNet | Hosting");
  const features = [["Insane Performance", "Top-tier hardware with fast CPUs and NVMe storage."], ["Instant Setup", "Provision a Minecraft server in minutes."], ["Reliable & Secure", "DDoS protection, backups, and a modern panel."], ["Modded or Vanilla", "Fabric, Forge, Paper, Purpur, Folia, and modpacks."], ["Community Ready", "Plans scale from small SMPs to larger communities."], ["Affordable", "Plans start at $1/month."]];
  return <div className="site-page"><header className="page-header"><h1>Minecraft Hosting</h1><p>High-performance servers powered by SparkedHost — fast, reliable, and affordable.</p></header><div className="site-grid">{features.map(([title, desc]) => <GlassCard className="site-card" key={title}><h3>{title}</h3><p>{desc}</p></GlassCard>)}</div><GlassCard className="site-card"><h2>Get Hosting with SparkedHost</h2><p>Performance, reliability, and affordability for Minecraft servers of any size.</p><ul>{["NVMe storage", "High-end CPUs", "Instant setup", "DDoS protection", "One-click mod-loader installers", "Control panel", "Plans from $1/month"].map((feature) => <li key={feature}>{feature}</li>)}</ul><div className="site-actions"><a className="site-button primary" href="https://billing.sparkedhost.com/aff.php?aff=3222">Get Hosting</a><Link className="site-button" to="/tools/srv-generator">SRV Generator</Link><Link className="site-button" to="/tools/email">Email Setup</Link></div></GlassCard></div>;
}

export function ProjectsPage() {
  usePageTitle("HungerNet | Projects");
  const [projects, setProjects] = useState(localProjects);
  const [source, setSource] = useState("Showing featured projects");
  useEffect(() => {
    const client = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" });
    void client.get<ProjectRecord[]>("/projects").then((result) => {
      if (Array.isArray(result) && result.length) {
        setProjects(result.filter((project) => project.status === "published").map((project) => ({
          id: project.id,
          slug: project.slug,
          name: project.title,
          description: project.body,
          status: project.status,
        })));
        setSource("Projects from HungerNet platform");
      }
    }).catch(() => undefined);
  }, []);
  return <div className="site-page"><header className="page-header"><h1>Projects</h1><p>Servers, tools, mods, and infrastructure.</p><span className="site-meta">{source}</span></header><div className="site-grid">{projects.map((project) => <GlassCard className="site-card" key={project.id}><p className="section-label">{project.status ?? "PROJECT"}</p><h2>{project.name}</h2><p>{project.description}</p>{project.url && <div className="link-row"><a className="site-button" href={project.url}>Open project</a></div>}</GlassCard>)}</div></div>;
}

export function ToolsPage() {
  usePageTitle("HungerNet | Tools");
  return <div className="site-page"><header className="page-header"><h1>Tools</h1><p>Utilities for DNS, email, Minecraft servers, and Hunger SMP infrastructure.</p></header><div className="site-grid">{[["SRV Record Generator", "Validate domains and create Cloudflare-ready Minecraft SRV record values.", "/tools/srv-generator", ["Domain validation", "Automatic SRV name", "Testing links"]], ["Email Setup Guide", "Create a personalized Cloudflare or HungerNet SMTP and forwarding guide.", "/tools/email", ["Gmail send-as setup", "Cloudflare routing", "Token masking"]]].map(([title, description, href, features]) => <GlassCard className="site-card" key={title as string}><h2>{title}</h2><p>{description}</p><ul>{(features as string[]).map((feature) => <li key={feature}>{feature}</li>)}</ul><Link className="site-button primary" to={href as string}>Open Tool</Link></GlassCard>)}</div></div>;
}

export function SrvGeneratorPage() {
  usePageTitle("HungerNet | SRV Generator");
  const [params, setParams] = useSearchParams();
  const [domain, setDomain] = useState(params.get("endDomain") ?? "");
  const [hostname, setHostname] = useState(params.get("hostname") ?? "");
  const [port, setPort] = useState(params.get("port") ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const [generated, setGenerated] = useState(Boolean(params.get("endDomain") && params.get("hostname") && params.get("port")));
  const validDomain = domainPattern.test(domain);
  const validHostname = /^[a-zA-Z0-9.-]+$/.test(hostname);
  const validPort = /^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535;
  const subdomain = domain.split(".")[0];
  const rootDomain = domain.split(".").slice(1).join(".");
  function generate(event: FormEvent) { event.preventDefault(); if (!validDomain || !validHostname || !validPort) { setShowErrors(true); return; } setParams({ endDomain: domain, hostname, port }); setGenerated(true); }
  function reset() { setParams({}); setDomain(""); setHostname(""); setPort(""); setGenerated(false); setShowErrors(false); }
  return <div className="site-page"><header className="page-header"><h1>Minecraft SRV Generator</h1><p>Generate a valid SRV record for Minecraft servers.</p></header><GlassCard className="site-card">{!generated ? <form onSubmit={generate}><h2>Enter Your Details</h2><p>Fill out the fields below to generate your SRV record.</p><div className="site-form"><div className="site-field"><label htmlFor="srv-domain">End domain</label><InputBox id="srv-domain" value={domain} onChange={setDomain} placeholder="play.example.com" aria-invalid={showErrors && !validDomain} />{showErrors && !validDomain && <span className="site-error">Invalid domain</span>}</div><div className="site-field"><label htmlFor="srv-host">Target host</label><InputBox id="srv-host" value={hostname} onChange={setHostname} placeholder="172.0.0.1" aria-invalid={showErrors && !validHostname} />{showErrors && !validHostname && <span className="site-error">Invalid hostname</span>}</div><div className="site-field"><label htmlFor="srv-port">Port</label><InputBox id="srv-port" value={port} onChange={setPort} placeholder="25565" inputMode="numeric" aria-invalid={showErrors && !validPort} />{showErrors && !validPort && <span className="site-error">Port must be 1–65535</span>}</div></div><button className="site-button primary" type="submit">Generate SRV</button></form> : <><p className="section-label">SRV Record</p><h2>Configuration for {rootDomain}</h2><dl className="result-grid">{[["Type", "SRV"], ["Name", `_minecraft._tcp.${subdomain}`], ["Priority", "0"], ["Weight", "0"], ["Port", port], ["Target", hostname], ["TTL", "Auto"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><code>{value}</code></dd></div>)}</dl><p>Save the record in Cloudflare. DNS propagation may take up to 5 minutes. Test with mcsrvstat.org, dnschecker.org, or dig.</p><p>Players can join at <strong>{domain.replace(/\.$/, "")}</strong> without typing a port.</p><button className="site-button" onClick={reset}>Back</button></>}</GlassCard></div>;
}

export function EmailGuidePage() {
  usePageTitle("HungerNet | Email Setup");
  const [params, setParams] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [name, setName] = useState(params.get("name") ?? "");
  const [password, setPassword] = useState("");
  const provider = params.get("provider") === "hungernet" ? "hungernet" : "cloudflare";
  const [showErrors, setShowErrors] = useState(false);
  const [generated, setGenerated] = useState(params.get("guide") === "1");
  const validEmail = emailPattern.test(email);
  const validName = name.trim().length > 0;
  const validPassword = password.startsWith("cfut_");
  function generate(event: FormEvent) { event.preventDefault(); if (!validEmail || !validName || !validPassword) { setShowErrors(true); return; } setParams({ email, name, provider, guide: "1" }); setGenerated(true); }
  function reset() { setParams({ provider }); setEmail(""); setName(""); setPassword(""); setGenerated(false); setShowErrors(false); }
  return <div className="site-page"><header className="page-header"><h1>Email Setup Guide</h1><p>{provider === "hungernet" ? "Generate a HungerNet email setup guide." : "Generate a Cloudflare email setup guide."}</p></header><GlassCard className="site-card">{!generated ? <form onSubmit={generate}><h2>Enter Your Details</h2><p>Fill out the fields below to generate a personalized setup guide.</p><div className="site-form"><div className="site-field"><label htmlFor="email-address">Email address</label><InputBox id="email-address" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" aria-invalid={showErrors && !validEmail} />{showErrors && !validEmail && <span className="site-error">Please enter a valid email address</span>}</div><div className="site-field"><label htmlFor="email-name">Name</label><InputBox id="email-name" value={name} onChange={setName} placeholder="John Doe" autoComplete="name" aria-invalid={showErrors && !validName} />{showErrors && !validName && <span className="site-error">Name cannot be empty</span>}</div><div className="site-field"><label htmlFor="email-token">Cloudflare API token</label><InputBox id="email-token" value={password} onChange={setPassword} placeholder="cfut_…" type="password" autoComplete="off" aria-invalid={showErrors && !validPassword} />{showErrors && !validPassword && <span className="site-error">API token must begin with cfut_</span>}</div></div><p className="site-meta">The token is used only to display the masked configuration and is never written to the URL or sent to the platform API.</p><button className="site-button primary" type="submit">Generate Guide</button></form> : <><p className="section-label">Setup Guide</p><h2>Your Configuration</h2><p>This guide is customized for <strong>{email}</strong>.</p><ol className="guide-list"><li><h3>Forwarding Setup</h3><p>{provider === "hungernet" ? "Contact HungerNet to enable forwarding, then approve the Cloudflare verification email." : "In Cloudflare Dashboard, open Email Routing, enable forwarding, and approve the verification email."}</p></li><li><h3>Add Your Address in Gmail</h3><p>Settings → See all settings → Accounts and import → Send mail as → Add another email address.</p></li><li><h3>Information Setup</h3><CopyValue label="Name" value={name} /><CopyValue label="Email address" value={email} /><CopyValue label="Treat as an alias" value="No" /></li><li><h3>SMTP Configuration</h3><CopyValue label="SMTP Server" value="smtp.mx.cloudflare.net" /><CopyValue label="Port" value="465" /><CopyValue label="Username" value="api_token" /><CopyValue label="Password" value={password} secret /><CopyValue label="Security" value="SSL" /></li><li><h3>Finished</h3><p>You can now send mail from <strong>{email}</strong>{provider === "hungernet" ? " using HungerNet's email service." : "."}</p></li></ol><button className="site-button" onClick={reset}>Back</button></>}</GlassCard></div>;
}

function CopyValue({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shown = secret ? `${value.slice(0, 5)}••••••••••••` : value;
  async function copy() { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } }
  return <div className="copy-field"><label>{label}</label><input className="copy-field__input" readOnly value={shown} /><button className="copy-field__button" type="button" onClick={() => void copy()}>{copied ? "Copied!" : "Copy"}</button></div>;
}

export function PublicProfilePage() {
  const { username = "" } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");
  usePageTitle(`HungerNet | ${username}`);
  useEffect(() => {
    const client = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" });
    void client.get<{ username: string; display_name: string; avatar_url: string | null; bio: string | null }>(`/public/users/${encodeURIComponent(username)}`).then((result) => {
      setProfile({
        id: result.username,
        username: result.username,
        displayName: result.display_name,
        avatarUrl: result.avatar_url,
        bio: result.bio ?? undefined,
      });
    }).catch(() => setError("This profile is unavailable or private."));
  }, [username]);
  return <div className="site-page"><header className="page-header"><h1>Community Profile</h1></header>{profile ? <GlassCard className="site-card"><h2>{profile.displayName}</h2><p className="site-meta">@{profile.username ?? username}</p>{profile.avatarUrl && <img className="profile-avatar" src={profile.avatarUrl} alt="" />}{profile.bio && <p>{profile.bio}</p>}</GlassCard> : <GlassCard className="site-card"><p>{error || "Loading profile…"}</p></GlassCard>}</div>;
}
