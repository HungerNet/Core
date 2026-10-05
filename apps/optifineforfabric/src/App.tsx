import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "@hungernet/auth";
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
  return <>
    <header className="site-header hn-container">
      <Link className="site-brand" to="/">OptiFine for Fabric<span aria-hidden="true">.</span></Link>
      <nav className="site-nav" aria-label="Main navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>)}</nav>
      <a className="account-link" href="https://accounts.hungernet.dev/profile">{status === "authenticated" ? user?.displayName ?? "Account" : "Account"}</a>
    </header>
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
