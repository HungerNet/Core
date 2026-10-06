import { GlassCard, GlassButton, usePageTitle, Icon } from "@hungernet/ui/components"

const links = [
  {
    label: "Discord",
    href: "https://discord.com/users/iFamished",
    description: "DM me directly or ping me in shared servers.",
    icon: <Icon name="discord" size={22} />,
  },
  {
    label: "Email",
    href: "mailto:me@ifamished.com",
    description: "For longer thoughts, proposals, or anything detailed.",
    icon: <Icon name="email" size={22} />,
  },
  {
    label: "GitHub",
    href: "https://github.com/iFamished",
    description: "Source code, experiments, and backend tooling.",
    icon: <Icon name="github" size={22} />,
  },
  {
    label: "Modrinth",
    href: "https://modrinth.com/user/iFamished",
    description: "Minecraft mods, server tooling, and releases.",
    icon: <Icon name="modrinth" size={22} />,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@iFamished",
    description: "Videos, showcases, and dev content.",
    icon: <Icon name="youtube" size={22} />,
  },
  {
    label: "ifamished.com",
    href: "https://ifamished.com",
    description: "My main site and hub.",
    icon: <Icon name="website" size={22} />,
  },
  {
    label: "hungernet.dev",
    href: "https://hungernet.dev",
    description: "A unified utility ecosystem.",
    icon: <Icon name="website" size={22} />,
  },
  {
    label: "optifineforfabric.com",
    href: "https://optifineforfabric.com",
    description: "Home of OptiFine for Fabric.",
    icon: <Icon name="website" size={22} />,
  },
  {
    label: "hungersmp.com",
    href: "https://hungersmp.com",
    description: "The Hunger SMP — semi‑anarchy, performance‑tuned.",
    icon: <Icon name="website" size={22} />,
  },
]

export default function Contact() {
  usePageTitle("iFamished | Contact")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Contact</h1>
        <p>Find me across the web — wherever you prefer to reach out.</p>
      </div>

      <section className="section">
        <div
          className="contact-socials"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-3)",
          }}
        >
          {links.map((link, index) => (
            <GlassCard
              key={link.label}
              className="contact-card fade-in-up"
              style={{
                width: 300,
                minHeight: 200,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "var(--space-3)",
                animationDelay: `${index * 0.06}s`,
              }}
            >
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "radial-gradient(circle at center, rgba(34,211,238,0.25), transparent 70%)",
                  }}
                >
                  {link.icon}
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{link.label}</h3>
                  <p className="text-muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                    {link.description}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "var(--space-3)" }}>
                <GlassButton href={link.href} variant="primary" block size="sm">
                  {link.icon}
                  <span>{link.label}</span>
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  )
}
