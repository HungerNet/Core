import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { FloatingAuthButton, HungerNetAuthCallback } from "@hungernet/auth";
import Home from "./pages/Home";
import Download from "./pages/Download";
import DownloadVersion from "./pages/download/DownloadVersion";
import Features from "./pages/Features";
import Install from "./pages/Install";
import Help from "./pages/Help";

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
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="optifineforfabric" />;
  }

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return <>
    <Navbar brand="OptiFine for Fabric" brandDotColor="#7ef9d2" navItems={navItems} />
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
    <FloatingAuthButton clientId="optifineforfabric" appName="OptiFine for Fabric" returnTo={returnTo} />
  </>;
}
