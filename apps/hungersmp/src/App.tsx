import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "@hungernet/auth";
import { AnnouncementsPage, FAQPage, HomePage, InfoPage, ProjectsPage, RulesPage } from "./pages";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/info", label: "Info" },
  { to: "/faq", label: "FAQ" },
  { to: "/rules", label: "Rules" },
  { to: "/projects", label: "Projects" },
  { to: "/announcements", label: "Announcements" },
];

export function App() {
  const { status, user } = useAuth();
  return <>
    <header className="site-header hn-container">
      <Link className="site-brand" to="/">Hunger SMP<span aria-hidden="true">.</span></Link>
      <nav className="site-nav" aria-label="Main navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}</nav>
      <a className="account-link" href="https://accounts.hungernet.dev/profile">{status === "authenticated" ? user?.displayName ?? "Account" : "Account"}</a>
    </header>
    <main className="hn-container"><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/info" element={<InfoPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
    <footer className="site-footer hn-container"><span>© {new Date().getFullYear()} HungerNet. Not affiliated with Mojang.</span><a href="https://discord.gg/KQHZcWMFtf">Discord</a></footer>
  </>;
}
