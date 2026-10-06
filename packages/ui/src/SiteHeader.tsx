import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export interface SiteNavItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface SiteHeaderProps {
  brand: string;
  navItems: SiteNavItem[];
  accountAction: ReactNode;
}

export function SiteHeader({ brand, navItems, accountAction }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    let active = true;
    let firstFrame = 0;
    let secondFrame = 0;

    const updateIndicator = () => {
      const nav = navRef.current;
      const indicator = indicatorRef.current;
      const currentLink = nav?.querySelector<HTMLElement>("[aria-current='page']");
      if (!nav || !indicator || !currentLink) return;

      const navBounds = nav.getBoundingClientRect();
      const linkBounds = currentLink.getBoundingClientRect();
      indicator.style.width = `${linkBounds.width}px`;
      indicator.style.transform = `translateX(${linkBounds.left - navBounds.left}px)`;
      indicator.style.opacity = "1";
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(updateIndicator);
      });
    };

    void document.fonts?.ready.then(() => {
      if (active) scheduleUpdate();
    });
    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      active = false;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [location.pathname, menuOpen]);

  return (
    <header className={`site-header hn-container${menuOpen ? " is-open" : ""}`}>
      <Link className="site-brand" to="/" onClick={() => setMenuOpen(false)}>
        <span className="site-brand-dot" aria-hidden="true" />
        <span>{brand}</span>
      </Link>
      <button
        className={`site-nav-toggle${menuOpen ? " is-open" : ""}`}
        type="button"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls="site-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav
        ref={navRef}
        id="site-navigation"
        className={`site-nav${menuOpen ? " is-open" : ""}`}
        aria-label="Main navigation"
      >
        <span className="site-nav-indicator" ref={indicatorRef} aria-hidden="true" />
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="account-actions">{accountAction}</div>
    </header>
  );
}
