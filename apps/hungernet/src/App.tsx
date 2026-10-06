import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "@hungernet/ui";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
import { HomePage, HostingPage, ProjectsPage, ToolsPage, EmailGuidePage, SrvGeneratorPage, PublicProfilePage } from "./pages";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/hosting", label: "Hosting" },
  { to: "/projects", label: "Projects" },
  { to: "/tools", label: "Tools" },
];

export function App() {
  const { status, user } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") return <HungerNetAuthCallback clientId="hungernet" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  return <>
    <SiteHeader
      brand="HungerNet"
      navItems={navItems}
      accountAction={status === "authenticated"
        ? <a className="account-link" href={`${import.meta.env.VITE_ACCOUNTS_URL || "https://accounts.hungernet.dev"}/profile`}>Manage account</a>
        : <HungerNetAuthButtons clientId="hungernet" appName="HungerNet" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} />}
    />
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
