import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, SiteHeader } from "@hungernet/ui";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
import { DownloadPage, DownloadVersionPage, FeaturesPage, HelpPage, HomePage, InstallPage } from "./pages";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/download", label: "Download" },
  { to: "/features", label: "Features" },
  { to: "/install", label: "Install" },
  { to: "/help", label: "Help" },
];

export function App() {
  const { status } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") return <HungerNetAuthCallback clientId="optifineforfabric" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  return <div className="public-site-shell">
    <SiteHeader
      brand="OptiFine for Fabric"
      navItems={navItems}
      accountAction={status === "authenticated"
        ? <a className="account-link" href={`${import.meta.env.VITE_ACCOUNTS_URL || "https://accounts.hungernet.dev"}/profile`}>Manage account</a>
        : <HungerNetAuthButtons clientId="optifineforfabric" appName="OptiFine for Fabric" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} />}
    />
    <main className="hn-container"><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/install" element={<InstallPage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/download/:version" element={<DownloadVersionPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
    <Footer
      brand="OptiFine for Fabric"
      socials={[
        { label: "GitHub", href: "https://github.com/iFamishedX/optifine-for-fabric", icon: "github" },
        { label: "Modrinth", href: "https://modrinth.com/project/optifine-for-fabric", icon: "modrinth" },
        { label: "Discord", href: "https://discord.gg/aNUYADauTJ", icon: "discord" },
      ]}
      footerNote={`© ${new Date().getFullYear()} OptiFine for Fabric. Not affiliated with Mojang or OptiFine.`}
    />
  </div>;
}
