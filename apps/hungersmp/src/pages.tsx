import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createApiClient } from "@hungernet/api-client";
import type { AnnouncementSummary, ProjectRecord, ProjectSummary } from "@hungernet/types";
import { CopyField, FaqAccordion, GlassCard, Icon, usePageTitle } from "@hungernet/ui";

const faqItems = [
  ["How do I join?", "Add mc.hungersmp.com to your server list and connect."],
  ["Is it modded?", "There are a few vanilla+ mods. Additional Fabric client mods are optional."],
  ["Is griefing allowed?", "Yes. This is an anarchy server; players may grief, steal, and fight."],
  ["Are there resets?", "Yes. Each season introduces new world generation and enhanced features."],
];
const features = [
  ["Version", "Minecraft 1.21.11; supports clients 1.21+. Bedrock clients are also supported."],
  ["High-Performance", "Optimized hardware for smooth gameplay, even with many players online."],
  ["Region", "Hosted in Ashburn for low latency in most regions."],
  ["Playstyle", "Anarchy with very few rules. Players are free to build, destroy, fight, and explore."],
  ["Whitelist", "Disabled. Anyone can join without an application or verification."],
  ["Rules", "No hacking or exploiting. See the Rules tab for the complete list."],
  ["Gameplay", "A small selection of performance and quality-of-life mods."],
  ["Store", "Free to play, with no paid features or in-game advantages."],
];
const comparisons = ["Clear, simple rules", "Active Discord community", "Stable uptime & low latency", "Whitelist-free access", "Basic anti-cheat protection", "Strong anti-cheat enforcement", "Anarchy freedom", "Active development & frequent updates", "No pay-to-win", "Transparent moderation", "High-performance hardware", "Minimal Vanilla+ mod list"];
const defaultProject: ProjectSummary = { id: "hunger-smp", slug: "hunger-smp", name: "The Hunger SMP", description: "A long-term, community-driven anarchy SMP focused on vanilla+ gameplay, performance, and player freedom.", url: "https://modrinth.com/server/the-hunger-smp" };

function JoinActions() {
  return <div className="site-actions"><CopyField value="mc.hungersmp.com" label="Copy IP" /><a className="site-button" href="lunarclient://play?serverAddress=mc.hungersmp.com">Play with Lunar Client</a><Link className="site-button" to="/info"><Icon name="info" size={16} />Server Info</Link></div>;
}

export function HomePage() {
  usePageTitle("Hunger SMP");
  const highlights = [["Community Driven", "A long-term anarchy SMP focused on community and player-driven content."], ["Fair Play", "No pay-to-win and no admin abuse; pure anarchy gameplay."], ["Expansive World", "Overhauled terrain generation, custom structures, and no capped world border."], ["Vanilla+ Enhancements", "Light quality-of-life tweaks without changing core gameplay."]];
  return <div className="site-page"><GlassCard className="site-hero"><div className="site-hero__copy"><p className="section-label">Survival Multiplayer</p><h1><span className="gradient-text">Hunger SMP</span></h1><p className="site-copy">A long-term, community-driven anarchy SMP.</p><div className="tag-list">{["Anarchy", "Vanilla+", "Community", "Survival", "SMP"].map((tag) => <span className="site-tag" key={tag}>{tag}</span>)}</div><JoinActions /><div className="site-hero__stats">{[["24 / 7", "Uptime"], ["50ms", "Latency"], ["Anarchy", "Freedom"], ["Active", "Community"]].map(([value,label]) => <div className="site-hero__stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></div><div className="site-hero__visual"><img className="site-hero__mark" src="/favicons/android-chrome-512x512.png" alt="Hunger SMP crossed swords mark" /><span className="site-hero__caption">Vanilla+ · survival · no whitelist</span></div></GlassCard><section><h2>A server built for anarchy freedom.</h2><p className="site-meta">Vanilla+ enhancements, anarchy, and community-driven content.</p><div className="site-grid" style={{ marginTop:"1rem" }}>{highlights.map(([title,description]) => <GlassCard className="site-card" key={title}><h3>{title}</h3><p>{description}</p></GlassCard>)}</div></section><GlassCard className="site-card"><h2>Ready to join?</h2><p>Connect now or read more about the server.</p><JoinActions /></GlassCard></div>;
}

export function InfoPage() {
  usePageTitle("Hunger SMP | Info");
  return <div className="site-page"><header className="page-header"><h1>Server Info</h1><p>Everything you need to know before joining the Hunger SMP.</p></header><div className="site-grid">{features.map(([title,description]) => <GlassCard className="site-card" key={title}><h2>{title}</h2><p>{description}</p></GlassCard>)}</div><section><h2>Other servers vs Hunger SMP</h2><p className="site-meta">A direct comparison of what we stand for and offer.</p><div className="compare-grid">{["Other Servers","Hunger SMP"].map((heading,index) => <GlassCard className="site-card" key={heading}><h3>{heading}</h3><ul>{comparisons.map((label,i) => { const isHungerAdvantage = i >= 5; const applies = index === 0 ? !isHungerAdvantage : true; return <li key={label} aria-label={`${applies ? "Included" : "Not included"}: ${label}`}>{applies ? "✓" : "−"} {label}</li>; })}</ul></GlassCard>)}</div></section><GlassCard className="site-card"><h2>Ready to join?</h2><JoinActions /></GlassCard></div>;
}

export function FAQPage() {
  usePageTitle("Hunger SMP | FAQ");
  return <div className="site-page"><header className="page-header"><h1>FAQ</h1><p>Answers to common questions about the Hunger SMP.</p></header><div className="faq-list">{faqItems.map(([q,a]) => <FaqAccordion key={q} q={q} a={a} />)}</div><GlassCard className="site-card"><h2>Still have questions?</h2><p>Join the Discord or browse the Docs for more detailed information.</p><div className="site-actions"><a className="site-button primary" href="https://discord.gg/KQHZcWMFtf">Discord</a><a className="site-button" href="https://docs.hungersmp.com">Docs</a></div></GlassCard></div>;
}

export function RulesPage() {
  usePageTitle("Hunger SMP | Rules");
  const sections = [
    { q:"Cheating", a:<div className="compare-grid"><GlassCard className="site-card"><h3>Allowed</h3><ul><li>Lunar Client without unfair advantages</li><li>Performance mods: Sodium, Lithium, Starlight</li><li>Cosmetic mods and UI tweaks</li><li>PC optimization tools</li><li>Low-fire and visual resource packs</li></ul></GlassCard><GlassCard className="site-card"><h3>Not Allowed</h3><ul><li>Hacked clients with unfair modules</li><li>Assistive mods listed by staff</li><li>Mods designed to duplicate items</li></ul></GlassCard></div> },
    { q:"Exploits & Glitches", a:<div className="compare-grid"><GlassCard className="site-card"><h3>Allowed</h3><ul><li>Attribute swapping</li><li>TNT, tripwire, string, sand, and gravel duping</li></ul></GlassCard><GlassCard className="site-card"><h3>Not Allowed</h3><ul><li>Lag machines or intentional crashes</li><li>Chunk loading intended to increase server load</li><li>Duping outside the allowed list</li></ul></GlassCard></div> },
    { q:"Chatting and Behavior", a:<div className="compare-grid"><GlassCard className="site-card"><h3>Allowed</h3><ul><li>Spamming</li><li>Trolling</li><li>Cursing</li></ul></GlassCard><GlassCard className="site-card"><h3>Chat is not moderated</h3><p>No Chat Reports is installed, but Mojang may still ban players for chat messages. The Hunger SMP is not responsible for player messages.</p></GlassCard></div> },
    { q:"Enforcement & Bans", a:<div className="compare-grid"><GlassCard className="site-card"><h3>What Staff Will Do</h3><ul><li>Warn for minor issues and temporarily ban repeated offenses</li><li>Ban hackers, exploiters, and rule-breakers</li><li>Review appeals through Discord or email</li><li>Reimburse losses caused by staff error</li></ul></GlassCard><GlassCard className="site-card"><h3>What Staff Will Not Do</h3><ul><li>Interfere with gameplay or PvP</li><li>Ban without evidence</li><li>Blackmail users</li><li>Exploit suspected rule-breakers</li></ul></GlassCard></div> },
  ];
  return <div className="site-page"><header className="page-header"><h1>Rules</h1><p>These rules apply only to the Minecraft server.</p></header><div className="faq-list">{sections.map(({q,a}) => <FaqAccordion key={q} q={q} a={a} />)}</div><GlassCard className="site-card"><h2>Need more detail?</h2><p>Join Discord or check the FAQ for clarifications.</p><div className="site-actions"><a className="site-button primary" href="https://discord.gg/KQHZcWMFtf">Discord</a><Link className="site-button" to="/faq">FAQ</Link></div></GlassCard></div>;
}

export function ProjectsPage() {
  usePageTitle("Hunger SMP | Projects");
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const client = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" }); void client.get<ProjectRecord>("/projects/hunger-smp").then((record) => { setProject({ id: record.id, slug: record.slug, name: record.title, description: record.body, status: record.status, url: "https://modrinth.com/server/the-hunger-smp" }); }).catch(() => setProject(defaultProject)).finally(() => setLoading(false)); }, []);
  return <div className="site-page"><header className="page-header"><h1>Projects</h1><p>Hunger SMP project information and related resources.</p></header>{loading ? <p>Loading project…</p> : project && <GlassCard className="site-card"><p className="section-label">{project.status ?? "MINECRAFT SERVER"}</p><h2>{project.name}</h2><p>{project.description}</p><p className="site-meta">Minecraft 1.21.11 · Java 1.21+ · Bedrock supported · Whitelist disabled</p><div className="site-actions"><a className="site-button primary" href={project.url ?? "https://modrinth.com/server/the-hunger-smp"}>Project details</a><CopyField value="mc.hungersmp.com" label="Copy IP" /></div></GlassCard>}</div>;
}

export function AnnouncementsPage() {
  usePageTitle("Hunger SMP | Announcements");
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { const client = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" }); void client.get<AnnouncementSummary[]>("/announcements?project_slug=hunger-smp").then((items) => setAnnouncements(Array.isArray(items) ? items : [])).catch(() => setError("Announcements are temporarily unavailable.")).finally(() => setLoading(false)); }, []);
  return <div className="site-page"><header className="page-header"><h1>Announcements</h1><p>News and updates from The Hunger SMP.</p></header>{loading ? <p>Loading announcements…</p> : error ? <GlassCard className="site-card"><p role="status">{error}</p></GlassCard> : announcements.length ? <div className="site-grid">{announcements.map((entry) => <GlassCard className="site-card" key={entry.id}><p className="site-meta">{new Date(entry.published_at).toLocaleDateString()}</p><h2>{entry.title}</h2><p>{entry.body}</p></GlassCard>)}</div> : <GlassCard className="site-card"><h2>No announcements yet</h2><p>Check back for Hunger SMP news and updates.</p></GlassCard>}</div>;
}
