import { GlassCard, GlassButton, usePageTitle, Icon, StatPill } from "@hungernet/ui/components"
import CopyIPButton from "../components/CopyIPButton"

const highlights = [
  {
    icon: "users",
    title: "Community Driven",
    desc: "A long-term anarchy SMP with a focus on community and player-driven content.",
  },
  {
    icon: "shield",
    title: "Fair Play",
    desc: "No pay-to-win, no admin abuse, no griefing — just pure anarchy SMP.",
  },
  {
    icon: "map",
    title: "Expansive World",
    desc: "Overhauled terrain generation, custom structures, and no capped world border.",
  },
  {
    icon: "sparkles",
    title: "Vanilla+ Enhancements",
    desc: "Light QoL tweaks that keep the game feeling fresh without changing core gameplay.",
  },
]

const techTags = ["Anarchy", "Vanilla+", "Community", "Survival", "SMP"]

const stats = [
  { value: "24 / 7", label: "Uptime" },
  { value: "50ms", label: "Latency" },
  { value: "Anarchy", label: "Freedom" },
  { value: "Active", label: "Community" },
]

export default function Home() {
  usePageTitle("Hunger SMP")

  return (
    <div className="page">
      {/* Hero */}
      <section className="section">
        <GlassCard variant="hero" className="hero fade-in-up">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Survival Multiplayer
          </div>

          <h1 className="hero-name">
            <span className="gradient-text">Hunger SMP</span>
          </h1>

          <p className="hero-subtitle">
            A long-term, community-driven anarchy SMP.
          </p>

          <div
            className="tech-tag-list"
            style={{ justifyContent: "center", marginBottom: "var(--space-4)" }}
          >
            {techTags.map((tag) => (
              <span key={tag} className="tech-tag">{tag}</span>
            ))}
          </div>

          <div className="hero-actions">
            <CopyIPButton />

            <GlassButton href="lunarclient://play?serverAddress=mc.hungersmp.com">
              <Icon name="play" size={16} />
              Play with Lunar Client
            </GlassButton>

            <GlassButton to="/info" variant="ghost">
              <Icon name="info" size={16} />
              Server Info
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
          <div className="section-label">Why play?</div>
          <h2>A server built for anarchy freedom.</h2>
          <p>
            The Hunger SMP focuses on vanilla+ enhancements, anarchy, and community-driven content.
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
        <h2>Ready to join?</h2>
        <p>Connect now or read more about the server.</p>

        <div className="cta-actions">
          <CopyIPButton />

          <GlassButton href="lunarclient://play?serverAddress=mc.hungersmp.com" variant="ghost">
            <Icon name="play" size={16} />
            Play with Lunar Client
          </GlassButton>

          <GlassButton to="/info" variant="ghost">
            <Icon name="info" size={16} />
            Server Info
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
