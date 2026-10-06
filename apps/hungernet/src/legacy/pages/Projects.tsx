import { GlassCard, GlassButton, usePageTitle } from "@hungernet/ui/legacy"

const projects = [
  {
    name: "HungerBridge",
    description:
      "A lightweight multiloader HTTP bridge for Minecraft servers. Provides secure run, log, and ping endpoints for automation, dashboards, and remote control.",
    stack: ["Fabric", "Paper", "Purpur", "Folia"],
    features: [
      "Secure /run, /log, /ping endpoints",
      "Zero-noise, automation-focused design",
      "Ideal for dashboards and remote control",
    ],
    owner: "iFamished",
    github: "https://github.com/iFamished/HungerBridge",
    modrinth: "https://modrinth.com/project/hungerbridge",
  },
  {
    name: "HungerLib",
    description:
      "A Python library mainly for interacting with Minecraft servers. Clients for command execution, log streaming, and server status polling.",
    stack: ["Python", "Library", "API"],
    features: [
      "Command execution and log streaming",
      "Pterodactyl Panel integration",
      "Clean API and codebase, ideal for automation and scripting",
      "Lightweight and easy to integrate",
    ],
    owner: "iFamished",
    github: "https://github.com/iFamished/HungerLib",
    pypi: "https://pypi.org/project/hungerlib/",
  },
  {
    name: "MapRes",
    description:
      "A fast, modern string mapping Python library designed with scalability in mind.",
    stack: ["Python", "Utility"],
    features: [
      "Optimized for speed and low memory usage",
      "Highly intuitive API for string mapping and transformation",
      "Supports large datamaps and complex mapping scenarios",
    ],
    owner: "iFamished",
    github: "https://github.com/iFamished/mapres",
    pypi: "https://pypi.org/project/mapres/",
  },
  {
    name: "OptiFine for Fabric",
    description:
      "A modern OptiFine alternative built natively for Fabric. Provides performance boosts, visual enhancements, and shader support where applicable.",
    stack: ["Fabric", "Performance", "Shaders"],
    features: [
      "Performance enhancements",
      "Visual improvements",
      "Shader support",
    ],
    owner: "iFamished",
    github: "https://github.com/iFamished/optifine-for-fabric",
    modrinth: "https://modrinth.com/project/optifine-for-fabric",
  },
  {
    name: "The Hunger SMP",
    description:
      "A semi-anarchy Minecraft server focused on performance and minimal rules. Powered by custom tooling including HungerBridge and HungerLib.",
    stack: ["SMP", "Semi-Anarchy", "Performance"],
    features: [
      "Minimal rules, high freedom",
      "Performance-tuned server environment",
      "Custom backend tooling",
    ],
    owner: "iFamished",
    website: "https://hungersmp.com/",
    modrinth: "https://modrinth.com/server/the-hunger-smp",
  },
  {
    name: "MysticRoot SMP",
    description:
      "An Origins Minecraft server based on a friendly community. Powered by HungerNet infrastructure.",
    stack: ["SMP", "Origins Mod", "Performance"],
    features: [
      "Friendly community",
      "Origins mod",
      "Backed by HungerNet",
    ],
    owner: "Mystical_Tree_",
    status: "NEW",
    website: "https://mysticaltree.net/mysticroot-smp/",
  },
  {
    name: "C2E",
    description:
      "Console Command Engine: A powerful Python library for console-based commands.",
    stack: ["Python", "Library", "Utility"],
    features: [
      "Built for readability",
      "Works on Pterodactyl panels",
      "Lightweight and easy to integrate",
    ],
    owner: "iFamished",
    status: "NEW",
    github: "https://github.com/iFamished/C2E",
    pypi: "https://pypi.org/project/C2E/",
  },
]

export default function Projects() {
  usePageTitle("HungerNet | Projects")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Projects</h1>
        <p>Servers, tools, mods, and infrastructure.</p>
      </div>

      <section className="section">
        <div className="projects-grid stagger">
          {projects.map((p, i) => (
            <GlassCard key={p.name} className="project-card" style={{ "--i": i }}>

              {p.status && (
                <div className="project-status">
                  <span className="project-status-dot" />
                  {p.status}
                </div>
              )}

              <div className="project-header">
                <h3 className="project-title">{p.name}</h3>
                {p.owner && (
                  <span className="project-owner">
                    {p.owner.toUpperCase()}
                  </span>
                )}
              </div>

              <p className="project-desc">{p.description}</p>

              <div className="project-stack">
                {p.stack.map((t) => (
                  <span key={t} className="tech-tag">
                    {t}
                  </span>
                ))}
              </div>

              <ul className="project-list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <div className="project-links">
                {p.website && (
                  <GlassButton href={p.website} size="sm" variant="primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9m0-18c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9m-7-9h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Website
                  </GlassButton>
                )}

                {p.github && (
                  <GlassButton href={p.github} size="sm" variant="primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.43 7.86 10.96.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.55-3.87-1.55-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.21 1.78 1.21 1.04 1.78 2.73 1.27 3.4.97.1-.76.41-1.27.75-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a10.9 10.9 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.8 1.08.8 2.18v3.23c0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5z"/>
                    </svg>
                    GitHub
                  </GlassButton>
                )}

                {p.modrinth && (
                  <GlassButton href={p.modrinth} size="sm" variant="primary">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12.252.004a11.78 11.768 0 0 0-8.92 3.73a11 11 0 0 0-2.17 3.11a11.37 11.359 0 0 0-1.16 5.169c0 1.42.17 2.5.6 3.77c.24.759.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c.44.05 2.54.07 2.76.02c.2-.04.22.1-.26-1.7l-.36-1.37l-1.01-.06a8.5 8.489 0 0 1-5.18-1.8a5.3 5.3 0 0 1-1.3-1.26c0-.05.34-.28.74-.5a37.572 37.545 0 0 1 2.88-1.629c.03 0 .5.45 1.06.98l1 .97l2.07-.43l2.06-.43l1.47-1.47c.8-.8 1.48-1.5 1.48-1.52c0-.09-.42-1.63-.46-1.7c-.04-.06-.2-.03-1.02.18c-.53.13-1.2.3-1.45.4l-.48.15l-.53.53l-.53.53l-.93.1l-.93.07l-.52-.5a2.7 2.7 0 0 1-.96-1.7l-.13-.6l.43-.57c.68-.9.68-.9 1.46-1.1c.4-.1.65-.2.83-.33c.13-.099.65-.579 1.14-1.069l.9-.9l-.7-.7l-.7-.7l-1.95.54c-1.07.3-1.96.53-1.97.53c-.03 0-2.23 2.48-2.63 2.97l-.29.35l.28 1.03c.16.56.3 1.16.31 1.34l.03.3l-.34.23c-.37.23-2.22 1.3-2.84 1.63c-.36.2-.37.2-.44.1c-.08-.1-.23-.6-.32-1.03c-.18-.86-.17-2.75.02-3.73a8.84 8.84 0 0 1 7.9-6.93c.43-.03.77-.08.78-.1c.06-.17.5-2.999.47-3.039c-.01-.02-.1-.02-.2-.03Zm3.68.67c-.2 0-.3.1-.37.38c-.06.23-.46 2.42-.46 2.52c0 .04.1.11.22.16a8.51 8.499 0 0 1 2.99 2a8.38 8.379 0 0 1 2.16 3.449a6.9 6.9 0 0 1 .4 2.8c0 1.07 0 1.27-.1 1.73a9.4 9.4 0 0 1-1.76 3.769c-.32.4-.98 1.06-1.37 1.38c-.38.32-1.54 1.1-1.7 1.14c-.1.03-.1.06-.07.26c.03.18.64 2.56.7 2.78l.06.06a12.07 12.058 0 0 0 7.27-9.4c.13-.77.13-2.58 0-3.4a11.96 11.948 0 0 0-5.73-8.578c-.7-.42-2.05-1.06-2.25-1.06Z"/>
                    </svg>
                    Modrinth
                  </GlassButton>
                )}

                {p.pypi && (
                  <GlassButton href={p.pypi} size="sm" variant="primary">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M23.922 13.58v3.912L20.55 18.72l-.078.055.052.037 3.45-1.256.026-.036v-3.997l-.053-.036-.025.092zM23.621 5.618l-3.04 1.107v3.912l3.339-1.215V5.509zM23.92 13.457V9.544l-3.336 1.215v3.913zM20.47 14.71V10.8L17.17 12v3.913zM17.034 19.996v-3.912l-3.313 1.206v3.912zM17.17 16.057v3.868l3.314-1.206V14.85l-3.314 1.206zm2.093 1.882c-.367.134-.663-.074-.663-.463s.296-.814.663-.947c.365-.133.662.075.662.464s-.297.814-.662.946zM13.225 9.315l.365-.132-3.285-1.197-3.323 1.21.102.037 3.184 1.16zM20.507 10.664V6.751L17.17 7.965v3.913l3.317-1.207zM17.058 11.918V8005l-3.302 1.202v3.912zM13.643 9.246l-3.336 1.215v3.913l3.336-1.215zM6.907 13.165l3.322 1.209v-3.913L6.907 9.252zM10.34 7.873l3.281 1.193V5.198l-3.28-1.193zM20.507 2.715L17.19 3.922v3.913l3.317-1.207zM16.95 3.903L13.724 2.73l-3.269 1.19 3.225 1.174zM15.365 4.606l-1.624.592v3.868l3.317-1.207V3.991l-1.693.615zm-.391 2.778c-.367.134-.662-.074-.662-.464s.295-.813.662-.946c.366-.133.663.074.663.464s-.297.813-.663.946zM10.229 18.41v-3.914l-3.322-1.209V17.2zM13.678 17.182v-3.913l-3.371 1.227v3.913zM13.756 17.154l3.3-1.2V12.04l-3.3 1.2zM13.678 21.217l-3.371 1.227v-3.912h-.078v3.912l-3.322-1.209v-3.913l-.053-.058-.025-.06-3.336-1.21v-3.948l.034.013 3.287 1.196.015-.078-3.261-1.187 3.26-1.187v-.109L3.876 9.62l-.307-.112 3.26-1.188v.877l.079-.055V6.769l3.257 1.185.058-.061L7.084 6.75l-.102-.037 3.24-1.179v-.083L6.854 6.677v.018l-.025.018v1.523L3.44 9.47v.02l-.025.017v4.007l-3.39 1.233v.019L0 14.784v3.995l.025.037 3.4 1.237.008-.006.007.01 3.4 1.238.008-.006.006.01 3.4 1.237.014-.009.012.01 3.45-1.256.026-.037-.078-.027zM3.493 9.563l3.257 1.185-3.257 1.187V9.562zM3.4 19.96L.078 18.752v-3.913l2.361.86.96.349v3.913zm.015-3.99L.335 14.85l-.182-.066 3.262-1.187v2.374zm3.399 5.231l-3.321-1.209v-3.912l3.321 1.209v3.912zM23.791 5.434l-3.21-1.17v2.338zM20.387 2.643l-3.24-1.18-3.27 1.19 3.247 1.182z"/>
                    </svg>
                    PyPI
                  </GlassButton>
                )}
              </div>

            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  )
}
