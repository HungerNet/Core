import { Navigate, Route, Routes } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/legacy";
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
  return <>
    <Navbar brand="OptiFine for Fabric" brandDotColor="#38bdf8" navItems={navItems} />
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
