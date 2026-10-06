import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/legacy";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
import Home from "./legacy/pages/Home";
import Download from "./legacy/pages/Download";
import DownloadVersion from "./legacy/pages/download/DownloadVersion";
import Features from "./legacy/pages/Features";
import Install from "./legacy/pages/Install";
import Help from "./legacy/pages/Help";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/download", label: "Download" },
  { to: "/features", label: "Features" },
  { to: "/install", label: "Install" },
  { to: "/help", label: "Help" },
];

const socials = [
  { label: "GitHub", href: "https://github.com/iFamishedX/optifine-for-fabric" },
  { label: "Modrinth", href: "https://modrinth.com/project/optifine-for-fabric" },
  { label: "Discord", href: "https://discord.gg/aNUYADauTJ" },
];

export function App() {
  const { status, user, signOut } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="optifineforfabric" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  }

  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const rightSlot = status === "authenticated" ? (
    <div className="navbar-authenticated">
      <a className="account-link" href={`${import.meta.env.VITE_ACCOUNTS_URL || "https://accounts.hungernet.dev"}/profile`}>
        {user?.displayName || "Manage account"}
      </a>
      <button className="glass-button glass-button--secondary glass-button--md" onClick={() => void signOut()} type="button">
        Sign out
      </button>
    </div>
  ) : status === "loading" ? (
    <span className="auth-status" role="status">Checking session…</span>
  ) : (
    <HungerNetAuthButtons clientId="optifineforfabric" appName="OptiFine for Fabric" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} returnTo={returnTo} />
  );

  return <>
    <Navbar brand="OptiFine for Fabric" brandDotColor="#38bdf8" navItems={navItems} rightSlot={rightSlot} />
    <ScrollToTop />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/install" element={<Install />} />
        <Route path="/download" element={<Download />} />
        <Route path="/download/:version" element={<DownloadVersion />} />
        <Route path="/features" element={<Features />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    <Footer
      brand="OptiFine for Fabric"
      socials={socials}
      footerNote={`© ${new Date().getFullYear()} OptiFine for Fabric. Not affiliated with Mojang or OptiFine.`}
    />
  </>;
}
