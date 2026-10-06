import { GlassCard, GlassButton, usePageTitle, Icon, StatPill } from "@hungernet/ui/legacy"

const highlights = [
  {
    icon: "bolt",
    title: "Performance",
    desc: "Powered by Sodium, Lithium, and Starlight — massive FPS gains over vanilla with no gameplay changes.",
  },
  {
    icon: "palette",
    title: "Visual Enhancements",
    desc: "Connected textures, custom skies, zoom, and emissive rendering right out of the box.",
  },
  {
    icon: "sparkles",
    title: "Shader Support",
    desc: "Full Iris integration. Drop in any OptiFine-compatible shader pack and switch in-game instantly.",
  },
  {
    icon: "puzzle",
    title: "Modpack Friendly",
    desc: "Lightweight and modular — every mod is independently removable with near-zero conflicts.",
  },
]

const techTags = ["Fabric", "Sodium", "Iris", "Lithium", "Starlight", "DynamicLights"]

const stats = [
  { value: "8×", label: "FPS Boost" },
  { value: "500k+", label: "Total Downloads" },
  { value: "26.2", label: "Latest versions" },
  { value: "<1 MB", label: "Lightweight Install" },
  { value: "100%", label: "Free & open-source" },
]

export default function Home() {
  usePageTitle("OptiFine for Fabric")

  return (
    <div className="page">
      {/* Hero */}
      <section className="section">
        <GlassCard variant="hero" className="hero fade-in-up">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Fabric Mod Collection
          </div>

          <h1 className="hero-name">
            <span className="gradient-text">OptiFine for Fabric</span>
          </h1>

          <p className="hero-subtitle">
            The modern, Fabric-native replacement for OptiFine — faster rendering,
            beautiful shaders, and zero compromises on compatibility.
          </p>

          <div className="tech-tag-list" style={{ justifyContent: "center", marginBottom: "var(--space-4)" }}>
            {techTags.map((tag) => (
              <span key={tag} className="tech-tag">{tag}</span>
            ))}
          </div>

          <div className="hero-actions">
            <GlassButton to="/download" variant="primary">
              <Icon name="download" size={16} />
              Download
            </GlassButton>
            <GlassButton to="/features">
              <Icon name="sparkles" size={16} />
              Features
            </GlassButton>
            <GlassButton to="/install" variant="ghost">
              <Icon name="tool" size={16} />
              Install Guide
            </GlassButton>
          </div>

          <div className="stat-pills">
            {stats.map((s) => (
              <StatPill key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </GlassCard>
      </section>

      {/* Overview */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">What's included</div>
          <h2>Everything OptiFine offered — and more.</h2>
          <p>
            A curated collection of the best Fabric performance and visual mods,
            pre-configured to work together seamlessly.
          </p>
        </div>

        <div className="overview-grid stagger">
          {highlights.map(({ icon, title, desc }, i) => (
            <GlassCard key={title} className="overview-card" style={{ "--i": i }}>
              <div className="icon-badge">
                <Icon name={icon} size={22} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section fade-in-up">
        <h2>Ready to get started?</h2>
        <p>Download the latest release and follow the guide — you'll be up and running in minutes.</p>
        <div className="cta-actions">
          <GlassButton to="/download" variant="primary">
            <Icon name="download" size={16} />
            Get the Latest Release
          </GlassButton>
          <GlassButton to="/install" variant="ghost">
            <Icon name="tool" size={16} />
            Installation Guide
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
