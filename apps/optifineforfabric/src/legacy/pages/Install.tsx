import { GlassCard, GlassButton, usePageTitle, Icon } from "@hungernet/ui/legacy"

const steps = [
  {
    icon: "modrinth",
    title: "Install the Modrinth App",
    body: (
      <>
        Download the{" "}
        <a
          href="https://modrinth.com/app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Modrinth App
        </a>{" "}
        for Windows, macOS, or Linux. Run the installer and open the app.
        The app automatically manages your Minecraft instances and modpacks.
      </>
    ),
    tags: ["modrinth.com/app"],
  },
  {
    icon: "website",
    title: "Search for versions",
    body: (
      <>
        Once the Modrinth App is installed, go to{" "}
        <a
          href="https://optifineforfabric.com/download"
          target="_blank"
          rel="noopener noreferrer"
        >
          optifineforfabric.com/download
        </a>
        .
      </>
    ),
    tags: ["Versions"],
  },
  {
    icon: "folder",
    title: "Select the best version for you",
    body: (
      <>
        Use the provided filters to select the version of OptiFine for Fabric
        that best suits you. Once you have chosen, click that version.
      </>
    ),
    tags: ["Choose"],
  },
  {
    icon: "download",
    title: "Download",
    body: (
      <>
        Click the button that says <strong>Open in Modrinth App</strong>.
        This will automatically open and install OptiFine for Fabric in Modrinth.
      </>
    ),
    tags: ["Install"],
  },
  {
    icon: "play",
    title: "Launch the instance",
    body: (
      <>
        Once the instalation is complete, click <strong>Play</strong> inside the Modrinth App. 
        The app handles all mod loading automatically — no manual file management required.
      </>
    ),
    tags: [],
  },
]

const troubleshooting = [
  {
    heading: "The Open in Modrinth App button isn't working",
    detail:
      "Ensure the Modrinth App is installed.",
  },
  {
    heading: "Lower FPS after installing",
    detail:
      "Remove conflicting rendering mods (OptiFabric, Canvas, etc.) that override Sodium.",
  },
  {
    heading: "Game crashes on launch",
    detail:
      "Open the instance logs in the Modrinth App and check for a failing mod in the stack trace.",
  },
    {
    heading: "Other issues...",
    detail:
      "Reach out to me directly or visit the OptiFine for Fabric Discord! I'm happy to help.",
  },
]

export default function Install() {
  usePageTitle("OptiFine for Fabric | Install")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Installation Guide</h1>
        <p>Install OptiFine for Fabric using the Modrinth App.</p>
      </div>

      {/* Timeline steps */}
      <section className="section">
        <div className="install-timeline stagger">
          {steps.map(({ icon, title, body, tags }, i) => (
            <GlassCard key={title} className="install-step" style={{ "--i": i }}>
              <div className="install-step-number">
                <Icon name={icon} size={18} strokeWidth={1.75} />
              </div>

              <div className="install-step-body">
                <h3>{title}</h3>
                <p>{body}</p>

                {tags.length > 0 && (
                  <div
                    className="project-stack"
                    style={{ marginTop: "var(--space-1)" }}
                  >
                    {tags.map((tag) => (
                      <span key={tag} className="tech-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Common issues</div>
          <h2>Troubleshooting</h2>
          <p>Quick fixes for the most frequent problems.</p>
        </div>

        <GlassCard className="fade-in-up">
          <ul className="trouble-list">
            {troubleshooting.map(({ heading, detail }) => (
              <li key={heading} className="trouble-item">
                <span className="trouble-icon">
                  <Icon name="warning" size={18} strokeWidth={1.75} />
                </span>
                <p>
                  <strong>{heading}</strong> — {detail}
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      <div className="cta-section fade-in-up">
        <h2>Still stuck?</h2>
        <p>Ask in the Discord server or browse the FAQ for more answers.</p>
        <div className="cta-actions">
          <GlassButton
            href="https://discord.gg/aNUYADauTJ"
            variant="primary"
          >
            <Icon name="discord" size={16} />
            Join Discord
          </GlassButton>
          <GlassButton to="/help" variant="ghost">
            FAQ
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
