import { GlassCard, GlassButton, usePageTitle, Icon, FaqAccordion } from "@hungernet/ui/components"

const ruleSections = [
  {
    q: "Cheating",
    a: (
      <>
        <div className="compare-grid" style={{ marginBottom: "1.5rem" }}>
          {/* Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="checkCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Allowed</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Minecraft clients such as Lunar Client that do not give unfair advantages</li>
              <li>Performance mods (Sodium, Lithium, Starlight, etc.)</li>
              <li>Cosmetic mods (emotes, capes, UI tweaks)</li>
              <li>PC optimization tools (MSI Afterburner, Swills, etc.)</li>
              <li>Resource packs such as low fire and other visual enhancements</li>
            </ul>
          </GlassCard>

          {/* Not Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="xCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Not Allowed</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Hacked clients that offer modules designed to provide unfair advantages</li>
              <li>Assistive mods (full list at /disallowed-mods)</li>
              <li>Any mod designed to duplicate items</li>
            </ul>
          </GlassCard>
        </div>
      </>
    ),
  },

  {
    q: "Exploits & Glitches",
    a: (
      <>
        <div className="compare-grid" style={{ marginBottom: "1.5rem" }}>
          {/* Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="checkCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Allowed</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Attribute swapping</li>
              <li>TNT dupers</li>
              <li>Tripwire duping</li>
              <li>String duping</li>
              <li>Sand and Gravel duping</li>
            </ul>
          </GlassCard>

          {/* Not Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="xCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Not Allowed</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Lag machines</li>
              <li>Chunk loading for the purpose of increasing server load</li>
              <li>Anything that intentionally crashes the server</li>
              <li>Duping any items not in the allowed list</li>
            </ul>
          </GlassCard>
        </div>
      </>
    ),
  },

  {
    q: "Chatting and Behavior",
    a: (
      <>
        <div className="compare-grid" style={{ marginBottom: "1.5rem" }}>
          {/* Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="checkCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Allowed</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Spamming</li>
              <li>Trolling</li>
              <li>Cursing</li>
            </ul>
          </GlassCard>

          {/* Not Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="xCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>Not Allowed</h3>
            </div>
              <p>Chat behavior is <strong>not moderated.</strong>{" "}
              <a href="https://modrinth.com/mod/no-chat-reports" target="_blank" rel="noopener noreferrer">No Chat Reports</a> is installed, but Mojang may still ban players for any reason, including chat messages.</p>
              <p>The Hunger SMP does not endorse or take responsibility for player chat messages.</p>
          </GlassCard>
        </div>
      </>
    ),
  },

  {
    q: "Enforcement & Bans",
    a: (
      <>
        <div className="compare-grid" style={{ marginBottom: "1.5rem" }}>
          {/* Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="checkCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>What Staff Will Do</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Issue warnings for minor issues</li>
              <li>Apply temporary bans for repeated offenses</li>
              <li>Ban hackers, exploiters, and rule‑breakers</li>
              <li>Review appeals through Discord or email</li>
              <li>Reimburse players for items lost due to staff error</li>
            </ul>
          </GlassCard>

          {/* Not Allowed */}
          <GlassCard className="compare-card">
            <div className="compare-card-header">
              <div className="icon-badge" style={{ width: 36, height: 36 }}>
                <Icon name="xCircle" size={18} strokeWidth={1.75} />
              </div>
              <h3>What Staff Will NOT Do</h3>
            </div>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li>Interfere with gameplay or PvP</li>
              <li>Ban players without evidence</li>
              <li>Blackmail users into compliance</li>
              <li>Use exploits to gain evidence on suspected rule-breakers</li>
            </ul>
          </GlassCard>
        </div>
      </>
    ),
  },
]

export default function Rules() {
  usePageTitle("Hunger SMP | Rules")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Rules</h1>
        <p>Click the dropdowns to view each rule section. These rules apply only to the Minecraft server.</p>
      </div>

      <section className="section">
        <div className="faq-list stagger">
          {ruleSections.map(({ q, a }, i) => (
            <FaqAccordion key={q} q={q} a={a} style={{ "--i": i }} />
          ))}
        </div>
      </section>

      <div className="cta-section fade-in-up">
        <h2>Need more detail?</h2>
        <p>Join the Discord or check the FAQ for edge cases and clarifications.</p>
        <div className="cta-actions">
          <GlassButton href="https://discord.gg/KQHZcWMFtf" variant="primary">
            <Icon name="discord" size={16} />
            Discord
          </GlassButton>
          <GlassButton to="/faq" variant="ghost">
            <Icon name="helpCircle" size={16} />
            FAQ
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
