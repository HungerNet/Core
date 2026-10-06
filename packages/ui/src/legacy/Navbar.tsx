import { useState, useRef, useEffect, type ReactNode } from "react"
import { NavLink, Link, useLocation } from "react-router-dom"

interface NavbarProps {
  brand?: string
  brandDotColor?: string
  navItems?: { to: string; label: string; end?: boolean }[]
  rightSlot?: ReactNode
}

export default function Navbar({
  brand = "Site",
  brandDotColor = "#22d3ee",
  navItems = [],
  rightSlot,
}: NavbarProps) {
  const [open, setOpen] = useState(false)
  const navbarRef = useRef<HTMLElement>(null)
  const linksRef = useRef<HTMLUListElement>(null)
  const underlineRef = useRef<HTMLSpanElement>(null)
  const location = useLocation()

  const toggleMenu = () => setOpen((value) => !value)
  const closeMenu = () => setOpen(false)

  const updateUnderline = () => {
    const active = linksRef.current?.querySelector<HTMLElement>(".navbar-link.active")
    const links = linksRef.current
    const underline = underlineRef.current

    if (!active || !links || !underline) return

    const rect = active.getBoundingClientRect()
    const parentRect = links.getBoundingClientRect()

    underline.style.width = `${rect.width}px`
    underline.style.transform = `translateX(${rect.left - parentRect.left}px)`
    underline.style.opacity = "1"
  }

  useEffect(() => {
    let mounted = true
    let firstFrame = 0
    let secondFrame = 0
    const scheduleUpdate = () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(updateUnderline)
      })
    }

    void document.fonts.ready.then(() => {
      if (mounted) scheduleUpdate()
    })
    scheduleUpdate()
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      mounted = false
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!navbarRef.current?.contains(event.target as Node)) closeMenu()
    }

    window.addEventListener("keydown", handleKeyDown)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [])

  useEffect(() => {
    closeMenu()
  }, [location.pathname])

  return (
    <nav className="navbar" ref={navbarRef} aria-label="Main navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <span
            className="brand-dot"
            aria-hidden="true"
            style={{ backgroundColor: brandDotColor }}
          />
          {brand}
        </Link>

        <button
          type="button"
          className={`navbar-toggle ${open ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-controls="legacy-site-navigation"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        <ul
          id="legacy-site-navigation"
          className={`navbar-links ${open ? "open" : ""}`}
          ref={linksRef}
        >
          <li aria-hidden="true">
            <span className="navbar-underline" ref={underlineRef} />
          </li>

          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `navbar-link ${isActive ? "active" : ""}`
                }
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {rightSlot && <div className="navbar-actions">{rightSlot}</div>}
      </div>
    </nav>
  )
}
