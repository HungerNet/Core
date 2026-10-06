import { GlassCard, GlassButton, usePageTitle, Icon } from "@hungernet/ui/components"
import CopyIPButton from "../components/CopyIPButton"

const features = [
  {
    icon: "play",
    title: "Version",
    desc: "We run Minecraft 1.21.11, but support clients 1.21+. Bedrock clients are also supported.",
  },
  {
    icon: "cpu",
    title: "High-Performance",
    desc: "The Hunger SMP runs on a high-end, optimized server. Expect smooth gameplay even with many players online.",
  },
  {
    icon: "map",
    title: "Region",
    desc: "Hosted in Ashburn, we have low latency for players in most regions.",
  },
  {
    icon: "shield",
    title: "Playstyle",
    desc: "We offer a unique anarchy experience with very few rules. Players are free to build, destroy, fight, and explore as they wish.",
  },
  {
    icon: "users",
    title: "Whitelist",
    desc: "Whitelist is disabled on our server. Anyone can join and play, no application or verification required.",
  },
  {
    icon: "info",
    title: "Rules",
    desc: "Due to the anarchy nature of the server, our main rules are no hacking or exploiting. You can find a full list of rules in the \"Rules\" tab.",
  },
  {
    icon: "sparkles",
    title: "Gameplay",
    desc: "The Hunger SMP uses a small selection of mods to enhance gameplay. These mods are designed to improve performance, add quality-of-life features, and provide a more enjoyable experience.",
  },
  {
    icon: "helpCircle",
    title: "Store",
    desc: "We do not have a store or any paid features. The server is free to play and we do not sell any in-game items or advantages.",
  },
]

const comparison = [
  // Shared traits (both true)
  { label: "Clear, simple rules", other: true, hunger: true },
  { label: "Active Discord community", other: true, hunger: true },
  { label: "Stable uptime & low latency", other: true, hunger: true },
  { label: "Whitelist-free access", other: true, hunger: true },
  { label: "Basic anti-cheat protection", other: true, hunger: true },

  // Hunger SMP advantages
  { label: "Strong anti-cheat enforcement", other: false, hunger: true },
  { label: "Anarchy freedom", other: false, hunger: true },
  { label: "Active development & frequent updates", other: false, hunger: true },
  { label: "No pay-to-win or paid advantages", other: false, hunger: true },
  { label: "Transparent moderation", other: false, hunger: true },
  { label: "High-performance server hardware", other: false, hunger: true },
  { label: "Minimal, Vanilla+ mod list", other: false, hunger: true },
]

export default function Info() {
  usePageTitle("Hunger SMP | Info")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Server Info</h1>
        <p>Everything you need to know before joining the Hunger SMP.</p>
      </div>

      {/* Feature cards */}
      <section className="section">
        <div className="features-grid stagger">
          {features.map(({ icon, title, desc }, i) => (
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

      {/* Comparison */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Side by side</div>
          <h2>Other servers vs Hunger SMP</h2>
          <p>A direct comparison of what we stand for and offer.</p>
        </div>

        <div className="compare-grid stagger">
          <GlassCard className="compare-card" style={{ "--i": 0 }}>
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="xCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Other Servers</h3>
            </div>
            <ul className="compare-list">
              {comparison.map(({ label, other }, idx) => (
                <li key={label}>
                  <span className={`compare-list-icon compare-list-icon--${other ? "yes" : "no"}`}>
                    <Icon name={other ? "check" : "x"} size={16} strokeWidth={2.5} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="compare-card" style={{ "--i": 1 }}>
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="checkCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3><span className="gradient-text">Hunger SMP</span></h3>
            </div>
            <ul className="compare-list">
              {comparison.map(({ label, hunger }) => (
                <li key={label}>
                  <span className={`compare-list-icon compare-list-icon--${hunger ? "yes" : "no"}`}>
                    <Icon name={hunger ? "check" : "x"} size={16} strokeWidth={2.5} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section fade-in-up">
        <h2>Ready to join?</h2>
        <p>Join our community and experience the best of Minecraft.</p>

        <div className="cta-actions">
          <CopyIPButton />

          <GlassButton href="lunarclient://play?serverAddress=mc.hungersmp.com" variant="ghost">
            <Icon name="play" size={16} />
            Play with Lunar Client
          </GlassButton>

          <GlassButton to="/faq" variant="ghost">
            <Icon name="info" size={16} />
            FAQs
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
