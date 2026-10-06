import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, SiteHeader } from "@hungernet/ui";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
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
  const { status } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") return <HungerNetAuthCallback clientId="hungersmp" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  return <div className="public-site-shell">
    <SiteHeader
      brand="Hunger SMP"
      navItems={navItems}
      accountAction={status === "authenticated"
        ? <a className="account-link" href={`${import.meta.env.VITE_ACCOUNTS_URL || "https://accounts.hungernet.dev"}/profile`}>Manage account</a>
        : <HungerNetAuthButtons clientId="hungersmp" appName="Hunger SMP" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} />}
    />
    <main className="hn-container"><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/info" element={<InfoPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
    <Footer
      brand="Hunger SMP"
      socials={[{ label: "Discord", href: "https://discord.gg/KQHZcWMFtf", icon: "discord" }]}
      footerNote={`© ${new Date().getFullYear()} Hunger SMP. Not affiliated with Mojang.`}
    />
  </div>;
}
