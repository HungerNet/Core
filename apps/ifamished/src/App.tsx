import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { FloatingAuthButton, HungerNetAuthCallback } from "@hungernet/auth";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import Projects from "./pages/Projects";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/contact", label: "Contact" },
];

const socials = [
  { label: "GitHub", href: "https://github.com/iFamished" },
  { label: "Modrinth", href: "https://modrinth.com/user/iFamished" },
  { label: "Discord", href: "https://discord.com/users/iFamished" },
];

export function App() {
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="ifamished" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  }

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return <>
    <Navbar brand="iFamished" brandDotColor="#22d3ee" navItems={navItems} />
    <FloatingAuthButton clientId="ifamished" appName="iFamished" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} returnTo={returnTo} />
    <ScrollToTop />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    <Footer
      brand="iFamished"
      socials={socials}
      footerNote={`© ${new Date().getFullYear()} iFamished. All rights reserved.`}
    />
  </>;
}
