import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { FloatingAuthButton, HungerNetAuthCallback } from "@hungernet/auth";
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
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="hungersmp" />;
  }

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return <>
    <Navbar brand="Hunger SMP" brandDotColor="#7ef9d2" navItems={navItems} />
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
    <FloatingAuthButton clientId="hungersmp" appName="Hunger SMP" returnTo={returnTo} />
  </>;
}
