import { Link } from "react-router-dom";
import { GlassCard, Icon } from "@hungernet/ui";
import { usePageTitle } from "@hungernet/ui";

const projects = [
  { name: "HungerNet", description: "A central hub connecting infrastructure, tools, libraries, and community projects.", tags: ["Minecraft", "Discord"], features: ["Unified source for HungerNet", "UX-focused", "Scalable architecture", "Zero-noise design"], website: "https://hungernet.dev" },
  { name: "HungerBridge", description: "A lightweight multiloader HTTP bridge for secure server automation, dashboards, and remote control.", tags: ["Fabric", "Paper", "Purpur", "Folia"], features: ["Secure run/log/ping endpoints", "Automation-focused", "Dashboard integration"], github: "https://github.com/iFamished/HungerBridge", modrinth: "https://modrinth.com/project/hungerbridge", status: "INDEV" },
  { name: "HungerLib", description: "A Python library for command execution, log streaming, and Minecraft server status polling.", tags: ["Python", "Library", "API"], features: ["Pterodactyl integration", "Clean API", "Lightweight"], github: "https://github.com/iFamished/HungerLib", pypi: "https://pypi.org/project/hungerlib/" },
  { name: "MapRes", description: "A fast, modern string-mapping Python library designed with scalability in mind.", tags: ["Python", "Utility"], features: ["Low memory use", "Intuitive transformation API", "Large datamaps"], github: "https://github.com/iFamished/mapres", pypi: "https://pypi.org/project/mapres/" },
  { name: "OptiFine for Fabric", description: "A Fabric-native OptiFine alternative with performance boosts, visual enhancements, and shader support.", tags: ["Fabric", "Performance", "Shaders"], features: ["Performance", "Visual improvements", "Shader support"], github: "https://github.com/iFamished/optifine-for-fabric", modrinth: "https://modrinth.com/project/optifine-for-fabric" },
  { name: "The Hunger SMP", description: "A semi-anarchy Minecraft server focused on performance and minimal rules.", tags: ["SMP", "Semi-Anarchy"], features: ["High freedom", "Performance-tuned", "Custom backend tooling"], website: "https://hungersmp.com/", modrinth: "https://modrinth.com/server/the-hunger-smp" },
  { name: "C2E", description: "Console Command Engine, a readable and lightweight Python library for console commands.", tags: ["Python", "Library"], features: ["Pterodactyl support", "Easy integration"], github: "https://github.com/iFamished/C2E", pypi: "https://pypi.org/project/C2E/", status: "NEW" },
  { name: "Nerfed SMP", description: "Assisting with moderation and development of a new Minecraft server.", tags: ["Minecraft", "Discord"], features: ["SparkedHost", "Unique modset"], website: "https://hungernet.dev", status: "3RD PARTY" },
];
const aboutSections = [
  ["Started", "Minecraft Modding", "Client enhancements, performance patches, and quality-of-life mods for Fabric."],
  ["Growth", "Plugin Development", "Server-side tools, multiloader bridges, command APIs, and backend utilities."],
  ["Scaling", "Server Infrastructure", "Automation pipelines, remote execution, and monitoring tools for SMP servers."],
  ["Automation", "Cloudflare Automation", "Edge automation, DNS routing, and proxy workflows."],
  ["Today", "Open-Source Release", "Maintaining HungerBridge, HungerLib, MapRes, and community projects."],
];
const contactLinks = [
  ["Discord", "DM me directly or ping me in shared servers.", "https://discord.com/users/iFamished"],
  ["Email", "For longer thoughts, proposals, or anything detailed.", "mailto:me@ifamished.com"],
  ["GitHub", "Source code, experiments, and backend tooling.", "https://github.com/iFamished"],
  ["Modrinth", "Minecraft mods, server tooling, and releases.", "https://modrinth.com/user/iFamished"],
  ["YouTube", "Videos, showcases, and development content.", "https://youtube.com/@iFamished"],
  ["ifamished.com", "My main site and hub.", "https://ifamished.com"],
  ["HungerNet", "A unified utility ecosystem.", "https://hungernet.dev"],
  ["OptiFine for Fabric", "Home of OptiFine for Fabric.", "https://optifineforfabric.com"],
  ["Hunger SMP", "Semi-anarchy, performance-tuned.", "https://hungersmp.com"],
];

export function HomePage() {
  usePageTitle("iFamished");
  return <div className="site-page">
    <GlassCard className="site-hero">
      <div className="site-hero__copy">
        <p className="section-label">Developer · Creator · Infrastructure Engineer</p>
        <h1><span className="gradient-text">iFamished</span></h1>
        <p className="site-copy">Building modern Minecraft tools, performance mods, and server infrastructure, blending engineering discipline with community-driven creativity.</p>
        <div className="tag-list">{["Python", "Docker", "Cloudflare", "Linux", "Minecraft"].map((tag) => <span className="site-tag" key={tag}>{tag}</span>)}</div>
        <div className="site-actions">
          <Link className="site-button primary" to="/projects"><Icon name="spark" size={16} />Projects</Link>
          <Link className="site-button" to="/about">About Me</Link>
          <Link className="site-button" to="/contact">Contact</Link>
        </div>
        <div className="site-hero__stats">{[["5+ yrs", "Experience"], ["750K+", "Downloads"], ["30+", "Projects"], ["∞", "Ideas"]].map(([value, label]) => <div className="site-hero__stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      </div>
      <div className="site-hero__visual">
        <img className="site-hero__portrait" src="/images/profile.png" alt="iFamished Minecraft avatar" />
        <span className="site-hero__caption">Engineering meets creativity</span>
      </div>
    </GlassCard>
    <section><h2>Engineering meets creativity.</h2><p className="muted">A hybrid of software engineering, Minecraft ecosystem tooling, and community-driven innovation.</p><div className="site-grid" style={{ marginTop: "1rem" }}>{[["Development Work", "Multiloader tooling for Fabric, Paper, Purpur, Quilt, and NeoForge."], ["Minecraft Projects", "Mods, datapacks, client enhancements, and OptiFine alternatives."], ["Server Infrastructure", "Automation, performance tuning, and open-source SMP tooling."], ["Community Involvement", "Semi-anarchy servers, PvP, open-source releases, and community projects."]].map(([title, text]) => <GlassCard className="site-card" key={title}><h3>{title}</h3><p>{text}</p></GlassCard>)}</div></section>
    <GlassCard className="site-card"><h2>Explore my work</h2><p>From performance mods to server infrastructure, here’s what I’ve been building.</p><div className="site-actions"><Link className="site-button primary" to="/projects">View Projects</Link><Link className="site-button" to="/contact">Get in Touch</Link></div></GlassCard>
  </div>;
}

export function AboutPage() {
  usePageTitle("iFamished | About");
  return <div className="site-page"><header className="page-header"><h1>About</h1><p>The story, the skills, and the milestones behind the work.</p></header><GlassCard className="site-card"><img className="profile-avatar" src="/images/profile.png" alt="iFamished Minecraft avatar" /><h2>iFamished</h2><p>Developer · Creator · Minecrafter</p><div className="site-copy"><p>I build tooling across the Minecraft ecosystem, from client-side enhancements and performance tweaks to server plugins and backend infrastructure. Most of what I do is about making servers easier to run, automate, and observe.</p><p>Recent work includes HungerBridge and HungerLib, connecting Minecraft servers to external tools, dashboards, and automation workflows. I care about clean APIs, predictable behavior, and simple integration.</p><p>On infrastructure, I lean on Cloudflare, Pterodactyl, and custom projects for edge routing, remote execution, log streaming, and status polling.</p></div></GlassCard><section><h2>Skills &amp; Milestones</h2><p className="muted">How the toolkit came together over time.</p><div className="site-timeline">{aboutSections.map(([year, title, text]) => <article key={title}><span className="section-label">{year}</span><h3>{title}</h3><p className="muted">{text}</p></article>)}</div></section></div>;
}

export function ProjectsPage() {
  usePageTitle("iFamished | Projects");
  return <div className="site-page"><header className="page-header"><h1>Projects</h1><p>Tools, mods, and infrastructure across the Minecraft ecosystem.</p></header><div className="site-grid">{projects.map((project) => <GlassCard className="site-card" key={project.name}><p className="section-label">{project.status ?? "PROJECT"}</p><h2>{project.name}</h2><p>{project.description}</p><div className="tag-list">{project.tags.map((tag) => <span className="site-tag" key={tag}>{tag}</span>)}</div><ul>{project.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><div className="link-row">{[project.website, project.github, project.modrinth, project.pypi].filter(Boolean).map((url) => <a className="site-button" key={url} href={url}>{url?.includes("github") ? "GitHub" : url?.includes("modrinth") ? "Modrinth" : url?.includes("pypi") ? "PyPI" : "Website"}</a>)}</div></GlassCard>)}</div></div>;
}

export function ContactPage() {
  usePageTitle("iFamished | Contact");
  return <div className="site-page"><header className="page-header"><h1>Contact</h1><p>Find me across the web — wherever you prefer to reach out.</p></header><div className="site-grid">{contactLinks.map(([label, description, href]) => <GlassCard className="site-card" key={label}><h2>{label}</h2><p>{description}</p><div className="link-row"><a className="site-button primary" href={href}>{label}</a></div></GlassCard>)}</div></div>;
}
