import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, SiteHeader } from "@hungernet/ui";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
import { AboutPage, ContactPage, HomePage, ProjectsPage } from "./pages";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/contact", label: "Contact" },
];

export function App() {
  const { status } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") return <HungerNetAuthCallback clientId="ifamished" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;

  return (
    <div className="public-site-shell">
      <SiteHeader
        brand="iFamished"
        navItems={navItems}
        accountAction={status === "authenticated"
          ? <a className="account-link" href={`${import.meta.env.VITE_ACCOUNTS_URL || "https://accounts.hungernet.dev"}/profile`}>Manage account</a>
          : <HungerNetAuthButtons clientId="ifamished" appName="iFamished" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} />}
      />
      <main className="hn-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer
        brand="iFamished"
        socials={[
          { label: "GitHub", href: "https://github.com/iFamished", icon: "github" },
          { label: "Modrinth", href: "https://modrinth.com/user/iFamished", icon: "modrinth" },
          { label: "Discord", href: "https://discord.com/users/iFamished", icon: "discord" },
        ]}
        footerNote={`© ${new Date().getFullYear()} iFamished. All rights reserved.`}
      />
    </div>
  );
}
