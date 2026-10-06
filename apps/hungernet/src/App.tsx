import { Route, Routes } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "@hungernet/ui/legacy";
import Home from "./legacy/pages/Home";
import Hosting from "./legacy/pages/Hosting";
import Projects from "./legacy/pages/Projects";
import Tools from "./legacy/pages/Tools";
import Email from "./legacy/pages/tools/Email";
import SRVGenerator from "./legacy/pages/tools/SRVGenerator";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/hosting", label: "Hosting" },
  { to: "/projects", label: "Projects" },
  { to: "/tools", label: "Tools" },
];

const socials = [{ label: "Discord", href: "https://discord.gg/KQHZcWMFtf" }];

export function App() {
  return <>
    <Navbar brand="HungerNet" brandDotColor="#38f8cf" navItems={navItems} />
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
