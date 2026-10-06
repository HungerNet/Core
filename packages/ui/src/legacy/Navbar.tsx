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
  const underlineRef = useRef<HTMLSpanElement>(null)
  const location = useLocation()

  const toggleMenu = () => setOpen((v) => !v)
  const closeMenu = () => setOpen(false)

  // ---- Underline positioning logic (fixed) ----
  const updateUnderline = () => {
    const active = document.querySelector(".navbar-link.active")
    const underline = underlineRef.current

    if (!active || !underline || !active.parentElement?.parentElement) return

    const rect = active.getBoundingClientRect()
    const parentRect = active.parentElement.parentElement.getBoundingClientRect()

    underline.style.width = `${rect.width}px`
    underline.style.transform = `translateX(${rect.left - parentRect.left}px)`
    underline.style.opacity = "1"
  }

  useEffect(() => {
    // Wait for fonts + layout stabilization
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateUnderline()
        })
      })
    })
  }, [location.pathname])

  // Recalculate underline on resize (fixes DPI scaling + zoom)
  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateUnderline()
        })
      })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <nav className="navbar">
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
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className={`navbar-links ${open ? "open" : ""}`}>
          <span className="navbar-underline" ref={underlineRef} />

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
