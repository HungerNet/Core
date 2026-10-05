import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "@hungernet/auth";
import { AboutPage, ContactPage, HomePage, ProjectsPage } from "./pages";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/contact", label: "Contact" },
];

export function App() {
  const { status, user } = useAuth();

  return (
    <>
      <header className="site-header hn-container">
        <Link className="site-brand" to="/">iFamished<span aria-hidden="true">.</span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}
        </nav>
        <a className="account-link" href="https://accounts.hungernet.dev/profile">
          {status === "authenticated" ? user?.displayName ?? "Account" : "Account"}
        </a>
      </header>
      <main className="hn-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer hn-container">
        <span>© {new Date().getFullYear()} iFamished. All rights reserved.</span>
        <div>{["GitHub", "Modrinth", "Discord"].map((label, index) => <a key={label} href={["https://github.com/iFamished", "https://modrinth.com/user/iFamished", "https://discord.com/users/iFamished"][index]}>{label}</a>)}</div>
      </footer>
    </>
  );
}
