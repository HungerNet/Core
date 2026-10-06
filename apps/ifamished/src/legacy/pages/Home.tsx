import { GlassCard, GlassButton, usePageTitle, StatPill, Icon } from "@hungernet/ui/legacy"

const overview = [
  {
    icon: "tool",
    title: "Development Work",
    text: "Multiloader tooling spanning Fabric, Paper, Purpur, Quilt, and NeoForge — built for reliability.",
  },
  {
    icon: "puzzle",
    title: "Minecraft Projects",
    text: "Mods, datapacks, client enhancements, and OptiFine alternatives.",
  },
  {
    icon: "cube",
    title: "Server Infrastructure",
    text: "Automation, performance tuning, and open-source tooling powering SMP backends.",
  },
  {
    icon: "sparkles",
    title: "Community Involvement",
    text: "Semi-anarchy servers, PvP servers, open-source releases, and innovative projects to the wider scene.",
  },
]

const tech = [
    "Python", "Docker", "Cloudflare", "Linux", "Minecraft"
]

const stats = [
  { value: "5+ yrs", label: "Experience" },
  { value: "750K+", label: "Downloads" },
  { value: "30+", label: "Projects" },
  { value: "∞", label: "Ideas" },
]

export default function Home() {
  usePageTitle("iFamished")

  return (
    <div className="page">

      {/* HERO */}
      <section className="section">
        <GlassCard variant="hero" className="hero fade-in-up">

          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Developer — Creator — Infrastructure Engineer
          </div>

          <h1 className="hero-name">
            <span className="gradient-text">iFamished</span>
          </h1>

          <p className="hero-subtitle">
            Building modern Minecraft tools, performance mods, and server infrastructure —
            blending engineering discipline with community-driven creativity.
          </p>

          <div className="tech-tag-list" style={{ justifyContent: "center", marginBottom: "var(--space-4)" }}>
            {tech.map((tag) => (
              <span key={tag} className="tech-tag">{tag}</span>
            ))}
          </div>

          <div className="hero-actions">
            <GlassButton to="/projects" variant="primary">
              <Icon name="bolt" size={16} />
              Projects
            </GlassButton>
            <GlassButton to="/about">
              <Icon name="cpu" size={16} />
              About Me
            </GlassButton>
            <GlassButton to="/contact" variant="ghost">
              <Icon name="email" size={16} />
              Contact
            </GlassButton>
          </div>

          <div className="stat-pills">
            {stats.map((s) => (
              <StatPill key={s.label} value={s.value} label={s.label} />
            ))}
          </div>

        </GlassCard>
      </section>

      {/* OVERVIEW */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">What I Do</div>
          <h2>Engineering meets creativity.</h2>
          <p>
            A hybrid of software engineering, Minecraft ecosystem tooling, and community-driven innovation.
          </p>
        </div>

        <div className="overview-grid stagger">
          {overview.map(({ icon, title, text }, i) => (
            <GlassCard key={title} className="overview-card" style={{ "--i": i }}>
              <div className="icon-badge">
                <Icon name={icon} size={22} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FEATURED PROJECTS CTA */}
      <div className="cta-section fade-in-up">
        <h2>Explore my work</h2>
        <p>
          From performance mods to server infrastructure, here’s what I’ve been building.
        </p>
        <div className="cta-actions">
          <GlassButton to="/projects" variant="primary">
            <Icon name="folder" size={16} />
            View Projects
          </GlassButton>
          <GlassButton to="/contact" variant="ghost">
            <Icon name="email" size={16} />
            Get in Touch
          </GlassButton>
        </div>
      </div>

    </div>
  )
}
