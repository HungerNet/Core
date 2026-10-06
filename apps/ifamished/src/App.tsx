import { Navigate, Route, Routes } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/legacy";
import About from "./legacy/pages/About";
import Contact from "./legacy/pages/Contact";
import Home from "./legacy/pages/Home";
import Projects from "./legacy/pages/Projects";

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
  return <>
    <Navbar brand="iFamished" brandDotColor="#22d3ee" navItems={navItems} />
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
