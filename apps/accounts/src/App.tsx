import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, GlassButton, GlassCard, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { OAuthSignIn, RequireAuth, useAuth } from "@hungernet/auth";
import { AuthorizationPage } from "./pages/AuthorizationPage";

import { ProfilePage } from "./pages/ProfilePage";
import { SecurityPage } from "./pages/SecurityPage";
import { DevicesPage } from "./pages/DevicesPage";

const navItems = [
  { to: "/profile", label: "Profile" },
  { to: "/security", label: "Security" },
  { to: "/devices", label: "Sessions" },
];

function AccountShell() {
  const { user, signOut } = useAuth();
  const displayName = user?.displayName ?? "Member";

  return (
    <>
      <Navbar
        brand="HungerNet Accounts"
        brandDotColor="#4ad9e6"
        navItems={navItems}
        rightSlot={<GlassButton size="sm" onClick={() => void signOut()}>Sign out</GlassButton>}
      />
      <ScrollToTop />
      <main className="container page">
        <header className="page-header">
          <div className="section-label">Account</div>
          <h1>My settings</h1>
          <p>Profile, security, and device access for {displayName}.</p>
        </header>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </main>
      <Footer brand="HungerNet Accounts" socials={[]} footerNote={`© ${new Date().getFullYear()} HungerNet`} />
    </>
  );
}

export function App() {
  const { status } = useAuth();
  const location = useLocation();

  if (location.pathname === "/authorize") return <AuthorizationPage />;

  if (status === "loading") {
    return (
      <main className="container page">
        <GlassCard style={{ maxWidth: "36rem", padding: "2rem", marginInline: "auto" }}>
          <p>Loading account session…</p>
        </GlassCard>
      </main>
    );
  }

  return (
    <RequireAuth
      fallback={
        <main className="private-auth-page account-auth-stage">
          <header className="private-auth-intro">
            <span className="private-auth-mark" aria-hidden="true">H</span>
            <div className="section-label">HungerNet Accounts</div>
            <h1>Your account, in one place.</h1>
            <p>Manage your profile, connected identities, and active sessions.</p>
          </header>
          <OAuthSignIn returnPath="/profile" />
          <p className="private-auth-note">Secure access to your HungerNet account.</p>
        </main>
      }
    >
      <AccountShell />
    </RequireAuth>
  );
}
