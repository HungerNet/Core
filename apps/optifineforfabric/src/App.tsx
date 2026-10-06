import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "@hungernet/ui";
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
  const { status, user } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") return <HungerNetAuthCallback clientId="optifineforfabric" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  return <>
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
    <footer className="site-footer hn-container"><span>© {new Date().getFullYear()} OptiFine for Fabric. Not affiliated with Mojang or OptiFine.</span><div><a href="https://github.com/iFamishedX/optifine-for-fabric">GitHub</a><a href="https://modrinth.com/project/optifine-for-fabric">Modrinth</a><a href="https://discord.gg/aNUYADauTJ">Discord</a></div></footer>
  </>;
}
