import { useId, useState, type ReactNode } from "react";

export interface FaqAccordionProps {
  q: string;
  a: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function FaqAccordion({ q, a, defaultOpen = false, className = "" }: FaqAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={['faq-item', className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="faq-question"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{q}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      <div id={id} className="faq-answer" hidden={!open}>
        {a}
      </div>
    </div>
  );
}
