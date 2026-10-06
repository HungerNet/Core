import { GlassButton, usePageTitle, Icon, FaqAccordion } from "@hungernet/ui/legacy"

const faqs = [
  {
    q: "How do I join?",
    a: "Add mc.hungersmp.com to your server list and connect.",
  },
  {
    q: "Is it modded?",
    a: "Slightly: there are a few vanilla+ mods. You may install additional Fabric client mods. These are recommended but not required.",
  },
  {
    q: "Is griefing allowed?",
    a: "Yes. This is an anarchy server. Players are free to grief, steal, and kill each other.",
  },
  {
    q: "Are there resets?",
    a: "Yes. Each season introduces new worldgen and enhanced features.",
  },
]

export default function FAQ() {
  usePageTitle("Hunger SMP | FAQ")

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>FAQ</h1>
        <p>Answers to the most common questions about the Hunger SMP.</p>
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
        <p>Join the Discord or browse the Docs for more detailed information.</p>
        <div className="cta-actions">
          <GlassButton href="https://discord.gg/KQHZcWMFtf" variant="primary">
            <Icon name="discord" size={16} />
            Discord
          </GlassButton>
          <GlassButton href="https://docs.hungersmp.com" variant="ghost">
            <Icon name="book" size={16} />
            Docs
          </GlassButton>
        </div>
      </div>
    </div>
  )
}

