import { GlassCard, usePageTitle } from "@hungernet/ui/legacy"

const timeline = [
  { year: "Started", title: "Minecraft Modding", text: "Began building client-side enhancements, performance patches, and QoL mods for Fabric-based environments." },
  { year: "Growth", title: "Plugin Development", text: "Expanded into server-side tooling with lightweight multiloader bridges, command APIs, and backend utilities." },
  { year: "Scaling", title: "Server Infrastructure", text: "Designed automation pipelines, remote execution endpoints, and monitoring tools for SMP and production servers." },
  { year: "Automation", title: "Cloudflare Automation", text: "Built edge automation, DNS routing systems, and proxy workflows to keep infrastructure fast, secure, and resilient." },
  { year: "Today", title: "Open-Source Release", text: "Maintaining HungerBridge, HungerLib, MapRes, and supporting community-driven SMP hosting and tooling." },
]

export default function About() {
  usePageTitle("iFamished | About")
  
  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>About</h1>
        <p>The story, the skills, and the milestones behind the work.</p>
      </div>

      <section className="section">
        <GlassCard variant="profile" className="fade-in-up">
          <div className="profile-avatar">
            <img
              src="/images/profile.png"
              alt="iFamished Minecraft avatar"
            />
          </div>
          <h2 className="profile-name">iFamished</h2>
          <p className="profile-tagline">Developer · Creator · Minecrafter</p>

          <div className="profile-bio">
            <p>
              I build tooling across the Minecraft ecosystem — from client-side enhancements and performance tweaks to server plugins
              and full backend infrastructure. Most of what I do is about making servers easier to run, automate, and observe, so
              people can focus on actually playing instead of fighting their stack.
            </p>
            <p>
              Recent work includes projects like HungerBridge and HungerLib, which connect Minecraft servers to external tools,
              dashboards, and automation workflows. I care a lot about clean APIs, predictable behavior, and making it simple to
              plug Minecraft into the rest of your infrastructure without a ton of boilerplate.
            </p>
            <p>
              On the infrastructure side, I lean heavily on Cloudflare, Pterodactyl, and custom projects to keep things fast,
              secure, and resilient. That means edge routing, remote execution endpoints, log streaming, and status polling — all
              wired together so SMPs and production servers can be monitored, controlled, and scaled with confidence.
            </p>
          </div>
        </GlassCard>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Skills & Milestones</h2>
          <p>How the toolkit came together over time.</p>
        </div>

        {/* NEW GRID-BASED TIMELINE */}
        <div className="timeline">
          {timeline.map((item) => (
            <div key={item.title} className="timeline-item">
              <div className="timeline-content">
                <span className="timeline-meta">{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
