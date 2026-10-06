import { GlassButton, usePageTitle, Icon, FaqAccordion } from "@hungernet/ui/legacy"
import { useEffect } from "react"

const faqs = [
  {
    q: "Is this an official OptiFine port?",
    a: "No. OptiFine for Fabric is an independent project that replicates OptiFine's functionality using native Fabric mods (Sodium, Iris, Continuity, etc.). It is not affiliated with sp614x or the official OptiFine team.",
  },
  {
    q: "Does it support OptiFine shader packs?",
    a: "Yes. Iris — the shader engine bundled with this pack — was designed from the ground up to support OptiFine-format shader packs (GLSL Shaders). Most popular packs (BSL, Complementary, Sildurs, etc.) work out of the box.",
  },
  {
    q: "Is it free?",
    a: "Yes, completely. All mods included in OptiFine for Fabric are free and open source, published under permissive licences.",
  },
  {
    q: "How do I install shaders?",
    a: "Launch Minecraft with the pack installed, open Options → Video Settings → Shader Packs, and click Open Shader Pack Folder. Drop your .zip shader pack in there, select it in the list, and apply. No restart required.",
  },
  {
    q: "Does it work on macOS and Linux?",
    a: "Yes. The pack is platform-independent — it runs wherever Fabric Loader runs. macOS and Linux are fully supported.",
  },
  {
    q: "How much faster is it compared to vanilla?",
    a: "Results vary by hardware, but most players see 5-8× higher FPS at equivalent settings. Sodium targets modern GPU APIs, which especially benefits lower-end and integrated graphics hardware.",
  },
  {
    q: "Where do I report bugs?",
    a: "Open an issue on GitHub. Include your Minecraft version, Fabric Loader version, and the relevant section of your crash report or latest.log.",
  },
]

export default function Help() {
  usePageTitle("OptiFine for Fabric | Help")

  // Inject Tawk.to widget safely
  useEffect(() => {
    const s1 = document.createElement("script")
    s1.async = true
    s1.src = "https://embed.tawk.to/6913ebffc3f840195fe58a21/1j9qt3o0u"
    s1.charset = "UTF-8"
    s1.setAttribute("crossorigin", "*")
    document.body.appendChild(s1)

    return () => {
      document.body.removeChild(s1)
    }
  }, [])

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>FAQ</h1>
        <p>Answers to the most common questions about OptiFine for Fabric.</p>
      </div>

      <section className="section">
        <div className="faq-list stagger">
          {faqs.map(({ q, a }, i) => (
            <FaqAccordion key={q} q={q} a={a} style={{ "--i": i }} />
          ))}
        </div>
      </section>

      <div className="cta-section fade-in-up">
        <h2>Still have questions?</h2>
        <p>Join the Discord or browse the GitHub repository for more detailed information.</p>
        <div className="cta-actions">
          <GlassButton href="https://discord.gg/aNUYADauTJ" variant="primary">
            <Icon name="discord" size={16} />
            Discord
          </GlassButton>
          <GlassButton href="https://github.com/iFamishedX/optifine-for-fabric" variant="ghost">
            <Icon name="github" size={16} />
            GitHub
          </GlassButton>
        </div>
      </div>
    </div>
  )
}
