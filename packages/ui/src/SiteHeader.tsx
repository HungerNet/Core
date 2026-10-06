import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

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
  return (
    <header className="site-header hn-container">
      <Link className="site-brand" to="/">{brand}<span aria-hidden="true">.</span></Link>
      <nav className="site-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>
        ))}
      </nav>
      <div className="account-actions">{accountAction}</div>
    </header>
  );
}
