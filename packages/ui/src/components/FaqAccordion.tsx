import { useState, useRef, useId, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { GlassCard } from "@hungernet/ui/components"
import { Icon } from "@hungernet/ui/components"

/**
 * FaqAccordion — animated accordion item.
 * The entire GlassCard is the click target.
 * Props: { q: string, a: string | ReactNode, defaultOpen?: bool }
 */
interface FaqAccordionProps {
  q: string
  a: ReactNode
  defaultOpen?: boolean
  style?: ComponentProps<typeof GlassCard>["style"]
}

export default function FaqAccordion({ q, a, defaultOpen = false, style }: FaqAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)

  return (
    <GlassCard
      className={`faq-accordion${open ? " faq-accordion--open" : ""}`}
      style={style}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-controls={bodyId}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setOpen((v) => !v)
        }
      }}
    >
      <div className="faq-header">
        <span className="faq-question">{q}</span>
        <span className="faq-chevron" aria-hidden="true">
          <Icon name="chevronDown" size={18} strokeWidth={2} />
        </span>
      </div>

      <div
        id={bodyId}
        ref={bodyRef}
        className="faq-body"
        style={{
          maxHeight: open ? (bodyRef.current?.scrollHeight ?? 500) + "px" : "0px",
        }}
        aria-hidden={!open}
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <p className="faq-answer">{a}</p>
      </div>
    </GlassCard>
  )
}
