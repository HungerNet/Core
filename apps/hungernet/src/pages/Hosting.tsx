import { GlassCard, GlassButton, usePageTitle, Icon } from "@hungernet/ui/components"

const hostingFeatures = [
  {
    icon: "bolt",
    title: "Insane Performance",
    desc: "SparkedHost uses top‑tier hardware with blazing‑fast CPUs and NVMe storage. Your server launches instantly and runs smoothly even under heavy load.",
  },
  {
    icon: "checkCircle",
    title: "Instant Setup",
    desc: "Pay → Provision → Play. Your Minecraft server is online in under 5 minutes with zero hassle.",
  },
  {
    icon: "shield",
    title: "Reliable & Secure",
    desc: "DDoS protection, automatic backups, and a modern control panel keep your server safe and stable.",
  },
  {
    icon: "cpu",
    title: "Modded or Vanilla",
    desc: "Run Fabric, Forge, Paper, Purpur, Folia, or any modpack with one‑click installers and optimized performance.",
  },
  {
    icon: "users",
    title: "Perfect for Communities",
    desc: "Whether you're hosting a small SMP or a large public server, SparkedHost scales effortlessly.",
  },
  {
    icon: "sparkles",
    title: "Shockingly Affordable",
    desc: "Plans start as low as $1/month — one of the best price‑to‑performance ratios in the entire hosting industry.",
  },
]

export default function Hosting() {
  usePageTitle("HungerNet | Hosting")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Minecraft Hosting</h1>
        <p>High‑performance servers powered by SparkedHost — fast, reliable, and insanely affordable.</p>
      </div>

      {/* Feature cards */}
      <section className="section">
        <div className="features-grid stagger">
          {hostingFeatures.map(({ icon, title, desc }, i) => (
            <GlassCard key={title} className="feature-card" style={{ "--i": i }}>
              <div className="icon-badge">
                <Icon name={icon} size={22} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Single Big Hosting Card */}
      <section className="section">
        <GlassCard className="project-card fade-in-up" style={{ "--i": 0 }}>
          <h3 className="project-title">Get Hosting with SparkedHost</h3>
          <p className="project-desc">
            SparkedHost offers unmatched performance, reliability, and affordability — making it one of the best hosting providers for Minecraft servers of any size.
          </p>

          <ul className="project-list">
            <li>Blazing‑fast NVMe storage</li>
            <li>High‑end CPUs for maximum performance</li>
            <li>Instant server setup</li>
            <li>Enterprise‑grade DDoS protection</li>
            <li>Perfect for SMPs, modded servers, and large communities</li>
            <li>One‑click installers for Fabric, Forge, Purpur, Folia, and more</li>
            <li>Modern, easy‑to‑use control panel</li>
            <li>Plans starting at just $1/month</li>
          </ul>

          <div className="project-links">
            <GlassButton
              href="https://billing.sparkedhost.com/aff.php?aff=3222"
              size="sm"
              variant="primary"
            >
              <Icon name="arrowRight" size={16} />
              Get Hosting
            </GlassButton>
          </div>
        </GlassCard>
      </section>

      {/* CTA */}
      <div className="cta-section fade-in-up">
        <h2>Looking for other tools?</h2>
        <p>Check out some below.</p>

        <div className="cta-actions">
          <GlassButton
            href="https://billing.sparkedhost.com/aff.php?aff=3222"
            variant="primary"
          >
            <Icon name="server" size={16} />
            Get Hosting Now
          </GlassButton>

          <GlassButton to="/tools/srv-generator" variant="ghost">
            <Icon name="settings" size={16} />
            SRV Generator
          </GlassButton>

          <GlassButton to="/tools/email" variant="ghost">
            <Icon name="mail" size={16} />
            Email Setup Guide
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
