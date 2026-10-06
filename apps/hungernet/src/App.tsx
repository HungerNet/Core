import { Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
import Home from "./pages/Home";
import Hosting from "./pages/Hosting";
import Projects from "./pages/Projects";
import Tools from "./pages/Tools";
import Email from "./pages/tools/Email";
import SRVGenerator from "./pages/tools/SRVGenerator";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/hosting", label: "Hosting" },
  { to: "/projects", label: "Projects" },
  { to: "/tools", label: "Tools" },
];

const socials = [{ label: "Discord", href: "https://discord.gg/KQHZcWMFtf" }];

export function App() {
  const { status, user, signOut } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="hungernet" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
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
    <HungerNetAuthButtons clientId="hungernet" appName="HungerNet" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} returnTo={returnTo} />
  );

  return <>
    <Navbar brand="HungerNet" brandDotColor="#38f8cf" navItems={navItems} rightSlot={rightSlot} />
    <ScrollToTop />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hosting" element={<Hosting />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/email" element={<Email />} />
        <Route path="/tools/srv-generator" element={<SRVGenerator />} />
      </Routes>
    </div>
    <Footer
      brand="HungerNet"
      socials={socials}
      footerNote={`© ${new Date().getFullYear()} HungerNet. All rights reserved.`}
    />
  </>;
}
