import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { HungerNetAuthButtons, HungerNetAuthCallback, useAuth } from "@hungernet/auth";
import Home from "./pages/Home";
import Info from "./pages/Info";
import FAQ from "./pages/FAQ";
import Rules from "./pages/Rules";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/info", label: "Info" },
  { to: "/faq", label: "FAQ" },
  { to: "/rules", label: "Rules" },
  { to: "/projects", label: "Projects" },
  { to: "/announcements", label: "Announcements" },
];

const socials = [{ label: "Discord", href: "https://discord.gg/KQHZcWMFtf" }];

export function App() {
  const { status, user, signOut } = useAuth();
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="hungersmp" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
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
    <HungerNetAuthButtons clientId="hungersmp" appName="Hunger SMP" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} returnTo={returnTo} />
  );

  return <>
    <Navbar brand="Hunger SMP" brandDotColor="#4f44ef" navItems={navItems} rightSlot={rightSlot} />
    <ScrollToTop />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/info" element={<Info />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    <Footer
      brand="Hunger SMP"
      socials={socials}
      footerNote={`© ${new Date().getFullYear()} HungerNet. Not affiliated with Mojang.`}
    />
  </>;
}
