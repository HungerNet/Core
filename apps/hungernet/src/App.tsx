import { Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { FloatingAuthButton, HungerNetAuthCallback } from "@hungernet/auth";
import Home from "./pages/Home";
import Hosting from "./pages/Hosting";
import Projects from "./pages/Projects";
import Tools from "./pages/Tools";
import Email from "./pages/tools/Email";
import SRVGenerator from "./pages/tools/SRVGenerator";
import UserProfile from "./pages/UserProfile";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/hosting", label: "Hosting" },
  { to: "/projects", label: "Projects" },
  { to: "/tools", label: "Tools" },
];

const socials = [{ label: "Discord", href: "https://discord.gg/KQHZcWMFtf" }];

export function App() {
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="hungernet" />;
  }

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return <>
    <Navbar brand="HungerNet" brandDotColor="#7ef9d2" navItems={navItems} />
    <ScrollToTop />
    <div className="container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hosting" element={<Hosting />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/email" element={<Email />} />
        <Route path="/tools/srv-generator" element={<SRVGenerator />} />
        <Route path="/user/:username" element={<UserProfile />} />
      </Routes>
    </div>
    <Footer
      brand="HungerNet"
      socials={socials}
      footerNote={`© ${new Date().getFullYear()} HungerNet. All rights reserved.`}
    />
    <FloatingAuthButton clientId="hungernet" appName="HungerNet" returnTo={returnTo} />
  </>;
}
