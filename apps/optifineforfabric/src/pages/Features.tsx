import { GlassCard, GlassButton, usePageTitle, Icon } from "@hungernet/ui/components"

const features = [
  {
    icon: "bolt",
    title: "Sodium Rendering Engine",
    desc: "Replaces the vanilla chunk rendering pipeline with a highly optimized modern implementation. Expect 5-8× FPS improvements on most hardware.",
  },
  {
    icon: "battery",
    title: "Lithium Game Logic",
    desc: "Rewrites physics, mob AI, chunk scheduling, and more — speeding up server-side tick rates without changing gameplay.",
  },
  {
    icon: "star",
    title: "Starlight Lighting",
    desc: "Complete rewrite of Minecraft's lighting engine. Eliminates light-update lag and drastically speeds up chunk loading.",
  },
  {
    icon: "sparkles",
    title: "Iris Shader Support",
    desc: "Full support for OptiFine shader packs via Iris. Switch shaders in-game without restarting — even with Sodium running.",
  },
  {
    icon: "palette",
    title: "Connected Textures",
    desc: "Continuity brings connected textures and emissive rendering. Glass panes connect, leaves blend, and custom resource packs shine.",
  },
  {
    icon: "zoom",
    title: "Smooth Zoom",
    desc: "Configurable zoom — bound to a key, with adjustable scroll sensitivity and no clunky FOV snapping.",
  },
  {
    icon: "lightbulb",
    title: "Dynamic Lighting",
    desc: "Held torches and glowing items light up the world around you in real time — no shader pack required.",
  },
  {
    icon: "puzzle",
    title: "Modpack Compatible",
    desc: "Every mod is independently removable. Use what you need, skip what you don't — almost zero hard conflicts.",
  },
]

const comparison = [
  { label: "Hardware-accelerated rendering", vanilla: true, fabric: true },
  { label: "Works with resource packs", vanilla: true, fabric: true },
  { label: "Multi-threaded chunk rendering", vanilla: false, fabric: true },
  { label: "Advanced block/entity culling", vanilla: false, fabric: true },
  { label: "Faster world loading", vanilla: false, fabric: true },
  { label: "Borderless fullscreen", vanilla: false, fabric: true },
  { label: "Rebuilt lighting engine", vanilla: false, fabric: true },
  { label: "Shader pack support", vanilla: false, fabric: true },
  { label: "Connected textures", vanilla: false, fabric: true },
  { label: "Configurable zoom", vanilla: false, fabric: true },
  { label: "Dynamic lighting for held items", vanilla: false, fabric: true },
]

export default function Features() {
  usePageTitle("OptiFine for Fabric | Features")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Features</h1>
        <p>Everything included in the OptiFine for Fabric experience — and why each piece matters.</p>
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
          <h2>Vanilla vs OptiFine for Fabric</h2>
          <p>A direct comparison of what changes when you make the switch.</p>
        </div>

        <div className="compare-grid stagger">
          <GlassCard className="compare-card" style={{ "--i": 0 }}>
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="xCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Vanilla Minecraft</h3>
            </div>
            <ul className="compare-list">
              {comparison.map(({ label, vanilla }, idx) => (
                <li key={label}>
                  <span className={`compare-list-icon compare-list-icon--${vanilla ? "yes" : "no"}`}>
                    <Icon name={vanilla ? "check" : "x"} size={16} strokeWidth={2.5} />
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
              <h3><span className="gradient-text">OptiFine for Fabric</span></h3>
            </div>
            <ul className="compare-list">
              {comparison.map(({ label, fabric }) => (
                <li key={label}>
                  <span className={`compare-list-icon compare-list-icon--${fabric ? "yes" : "no"}`}>
                    <Icon name={fabric ? "check" : "x"} size={16} strokeWidth={2.5} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      <div className="cta-section fade-in-up">
        <h2>Convinced?</h2>
        <p>Download the latest release and see the difference yourself.</p>
        <div className="cta-actions">
          <GlassButton to="/download" variant="primary">
            <Icon name="download" size={16} />
            Download
          </GlassButton>
          <GlassButton to="/help" variant="ghost">Help</GlassButton>
        </div>
      </div>
    </div>
  )
}
