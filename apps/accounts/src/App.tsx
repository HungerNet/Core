import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Button, GlassCard } from "@hungernet/ui";
import { OAuthSignIn, RequireAuth, useAuth } from "@hungernet/auth";

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

  return (
    <div className="page" style={{ gap: "1.5rem" }}>
      <header className="glass-card" style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="section-label">Account</div>
          <h1 style={{ marginTop: "0.25rem", fontSize: "1.5rem" }}>My settings</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="muted">{user?.displayName ?? "User"}</span>
          <Button onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>

      <nav aria-label="Account navigation" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => ["glass-button", isActive ? "glass-button--primary" : "glass-button--secondary", "glass-button--md"].join(" ")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Routes>
    </div>
  );
}

export function App() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="hn-container page">
        <GlassCard style={{ padding: "2rem" }}>
          <p>Loading account session…</p>
        </GlassCard>
      </main>
    );
  }

  return (
    <RequireAuth fallback={<main className="hn-container page"><GlassCard style={{ padding: "2rem" }}><h2>Sign in required</h2><OAuthSignIn apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} returnPath="/profile" /></GlassCard></main>}>
      <AccountShell />
    </RequireAuth>
  );
}
