import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "@hungernet/auth";
import { HomePage, HostingPage, ProjectsPage, ToolsPage, EmailGuidePage, SrvGeneratorPage, PublicProfilePage } from "./pages";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/hosting", label: "Hosting" },
  { to: "/projects", label: "Projects" },
  { to: "/tools", label: "Tools" },
];

export function App() {
  const { status, user } = useAuth();
  return <>
    <header className="site-header hn-container">
      <Link className="site-brand" to="/">HungerNet<span aria-hidden="true">.</span></Link>
      <nav className="site-nav" aria-label="Main navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}</nav>
      <a className="account-link" href="https://accounts.hungernet.dev/profile">{status === "authenticated" ? user?.displayName ?? "Account" : "Account"}</a>
    </header>
    <main className="hn-container">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hosting" element={<HostingPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/email" element={<EmailGuidePage />} />
        <Route path="/tools/srv-generator" element={<SrvGeneratorPage />} />
        <Route path="/user/:username" element={<PublicProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    <footer className="site-footer hn-container"><span>© {new Date().getFullYear()} HungerNet. All rights reserved.</span><a href="https://discord.gg/KQHZcWMFtf">Discord</a></footer>
  </>;
}
