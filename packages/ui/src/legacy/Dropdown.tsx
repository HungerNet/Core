import { useState, useRef, useEffect, type CSSProperties, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"

const ANIMATION_DURATION = 150 // ms

interface DropdownProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

export default function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [mounted, setMounted] = useState(false) // portal exists
  const [open, setOpen] = useState(false)       // animation state
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [typed, setTyped] = useState("")
  const typedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  // -----------------------------
  // OPEN / CLOSE WITH ANIMATION
  // -----------------------------
  function openMenu() {
    if (!mounted) setMounted(true)
    requestAnimationFrame(() => setOpen(true))
  }

  function closeMenu() {
    setOpen(false)
    setTimeout(() => setMounted(false), ANIMATION_DURATION)
  }

  // -----------------------------
  // OUTSIDE CLICK CLOSE
  // -----------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        closeMenu()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // -----------------------------
  // POSITION DROPDOWN UNDER TRIGGER
  // -----------------------------
  useEffect(() => {
    if (!mounted || !triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()

    setMenuStyle({
      position: "absolute",
      top: rect.bottom + 6 + "px",
      left: rect.left + "px",
      width: "220px",
      zIndex: 999999999,
    })
  }, [mounted])

  // -----------------------------
  // FORMAT LABEL (for non-pack dropdowns)
  // -----------------------------
  function formatLabel(opt: string) {
    if (!opt) return "All"
    return opt.charAt(0).toUpperCase() + opt.slice(1)
  }

  // -----------------------------
  // TYPEAHEAD
  // -----------------------------
  function handleType(e: KeyboardEvent<HTMLButtonElement>) {
    const char = e.key.length === 1 ? e.key : null
    if (!char) return

    const next = (typed + char).toLowerCase()
    setTyped(next)

    if (typedTimeout.current) clearTimeout(typedTimeout.current)
    typedTimeout.current = setTimeout(() => setTyped(""), 1500)

    const lower = options.map(o => o.toLowerCase())

    // exact match first
    let idx = lower.findIndex(o => o === next)
    if (idx === -1) {
      // then prefix match
      idx = lower.findIndex(o => o.startsWith(next))
    }

    if (idx !== -1) {
      setHighlightedIndex(idx)
      onChange(options[idx])

      // smooth scroll
      menuRef.current?.children[idx]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      })
    }
  }

  // -----------------------------
  // ARROW KEY NAVIGATION
  // -----------------------------
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!mounted && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      openMenu()
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex(i => {
        const next = (i + 1) % options.length
        menuRef.current?.children[next]?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        })
        return next
      })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex(i => {
        const next = (i - 1 + options.length) % options.length
        menuRef.current?.children[next]?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        })
        return next
      })
    } else if (e.key === "Enter") {
      e.preventDefault()
      const opt = options[highlightedIndex]
      if (!opt) return
      onChange(opt)
      closeMenu()
    } else if (e.key === "Escape") {
      e.preventDefault()
      closeMenu()
    } else {
      handleType(e)
    }
  }

  // -----------------------------
  // HIGHLIGHT (for non-pack dropdowns)
  // -----------------------------
  function highlight(opt: string) {
    const formatted = formatLabel(opt)

    if (!typed) return formatted

    return formatted.replace(
      new RegExp(`^(${typed})`, "i"),
      `<strong style="color: var(--accent-1)">$1</strong>`
    )
  }

  return (
    <>
      <button
        className="dropdown-trigger"
        ref={triggerRef}
        onClick={() => {
          if (mounted && open) closeMenu()
          else openMenu()
          triggerRef.current?.focus()
        }}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <span>{label}:</span>

        {/* Pack Version bypass */}
        <span className="dropdown-trigger-value">
          {label === "Pack Version" ? value : formatLabel(value)}
        </span>

        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <div
            className={
              "dropdown-menu" + (open ? " dropdown-menu--open" : "")
            }
            ref={menuRef}
            style={menuStyle}
          >
            {options.map((opt, idx) => (
              <div
                key={opt}
                className={
                  "dropdown-item" +
                  (opt === value ? " active" : "") +
                  (idx === highlightedIndex ? " highlighted" : "")
                }
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  onChange(opt)
                  closeMenu()
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    label === "Pack Version"
                      ? opt
                      : highlight(opt)
                }}
              />
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
