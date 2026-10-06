import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Button, GlassCard, SiteHeader } from "@hungernet/ui";
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
    <div className="app-shell">
      <div className="accent-grid" aria-hidden="true" />
      <SiteHeader
        className="platform-header"
        brand="HungerNet Accounts"
        navItems={navItems}
        accountAction={<Button onClick={() => void signOut()}>Sign out</Button>}
      />

      <div className="app-panel">
        <header className="top-bar glass-card">
          <div className="brand-block">
            <div className="section-label">Account</div>
            <h1>My settings</h1>
          </div>

          <div className="top-actions">
            <span className="status-chip">online</span>
            <span className="muted user-pill">{displayName}</span>
          </div>
        </header>

        <div className="hero-row">
          <div className="spotlight-card glass-card">
            <div className="spotlight-kicker">Welcome back</div>
            <h2>{displayName}</h2>
            <p>Keep your identity, security, and device access running smoothly across HungerNet.</p>

          </div>

          <div className="stat-grid">
            <div className="stat-card glass-card">
              <span className="stat-label">Profile</span>
              <strong>94%</strong>
              <small>complete</small>
            </div>
            <div className="stat-card glass-card">
              <span className="stat-label">Security</span>
              <strong>2FA</strong>
              <small>active</small>
            </div>
            <div className="stat-card glass-card">
              <span className="stat-label">Sessions</span>
              <strong>3</strong>
              <small>connected</small>
            </div>
          </div>
        </div>

        <div className="route-panel glass-card">
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const { status } = useAuth();
  const location = useLocation();

  if (location.pathname === "/authorize") return <AuthorizationPage />;

  if (status === "loading") {
    return (
      <main className="app-shell page-loading-shell">
        <div className="accent-grid" aria-hidden="true" />
        <GlassCard className="loading-card">
          <div className="loading-orb" aria-hidden="true" />
          <p>Loading account session…</p>
        </GlassCard>
      </main>
    );
  }

  return (
    <RequireAuth
      fallback={
        <main className="app-shell page-loading-shell">
          <div className="accent-grid" aria-hidden="true" />
          <GlassCard className="auth-landing-card">
            <div className="section-label">Sign in</div>
            <h2>Access your account</h2>
            <OAuthSignIn apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} returnPath="/profile" />
          </GlassCard>
        </main>
      }
    >
      <AccountShell />
    </RequireAuth>
  );
}
