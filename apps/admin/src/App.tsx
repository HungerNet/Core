import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Button, GlassCard } from "@hungernet/ui";
import { HungerNetAuthButtons, HungerNetAuthCallback, RequirePermission } from "@hungernet/auth";
import { useAuth } from "@hungernet/auth";

import { UserListPage } from "./pages/UserListPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { RolesPage } from "./pages/RolesPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { AuditPage } from "./pages/AuditPage";

const navItems = [
  { to: "/users", label: "Users" },
  { to: "/roles", label: "Roles" },
  { to: "/projects", label: "Projects" },
  { to: "/audit", label: "Audit" },
];

function AdminShell() {
  const { user, signOut } = useAuth();
  const displayName = user?.displayName ?? "Operator";

  return (
    <div className="app-shell">
      <div className="accent-grid accent-grid--warm" aria-hidden="true" />

      <div className="app-panel">
        <header className="top-bar glass-card">
          <div className="brand-block">
            <div className="section-label">Admin</div>
            <h1>HungerNet dashboard</h1>
          </div>

          <div className="top-actions">
            <span className="status-chip status-chip--warn">live</span>
            <span className="muted user-pill">{displayName}</span>
            <Button onClick={() => void signOut()}>Sign out</Button>
          </div>
        </header>

        <div className="hero-row">
          <div className="spotlight-card glass-card spotlight-card--warm">
            <div className="spotlight-kicker">Operations center</div>
            <h2>{displayName}</h2>
            <p>Monitor access, permissions, projects, and account health from one control surface.</p>

            <nav aria-label="Admin navigation" className="nav-cluster">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => ["nav-pill", isActive ? "nav-pill--active" : ""].join(" ")}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="stat-grid">
            <div className="stat-card glass-card">
              <span className="stat-label">Users</span>
              <strong>1,284</strong>
              <small>total</small>
            </div>
            <div className="stat-card glass-card">
              <span className="stat-label">Incidents</span>
              <strong>03</strong>
              <small>open</small>
            </div>
            <div className="stat-card glass-card">
              <span className="stat-label">Uptime</span>
              <strong>99.9%</strong>
              <small>healthy</small>
            </div>
          </div>
        </div>

        <div className="route-panel glass-card">
          <Routes>
            <Route path="/users" element={<UserListPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="*" element={<Navigate to="/users" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="admin" apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} />;
  }

  if (status === "loading") {
    return (
      <main className="app-shell page-loading-shell">
        <div className="accent-grid accent-grid--warm" aria-hidden="true" />
        <GlassCard className="loading-card">
          <div className="loading-orb" aria-hidden="true" />
          <p>Loading admin session…</p>
        </GlassCard>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell page-loading-shell">
        <div className="accent-grid accent-grid--warm" aria-hidden="true" />
        <GlassCard className="auth-landing-card">
          <div className="section-label">Authentication</div>
          <h2>Access the control room</h2>
          <HungerNetAuthButtons clientId="admin" appName="HungerNet Admin" accountsBaseUrl={import.meta.env.VITE_ACCOUNTS_URL} />
        </GlassCard>
      </main>
    );
  }

  return (
    <RequirePermission
      permission="platform.admin.users.read"
      fallback={
        <main className="app-shell page-loading-shell">
          <div className="accent-grid accent-grid--warm" aria-hidden="true" />
          <GlassCard className="auth-landing-card">
            <div className="section-label">Restricted</div>
            <h2>Admin access required</h2>
            <p className="muted">Your account does not have permission to open this dashboard.</p>
          </GlassCard>
        </main>
      }
    >
      <AdminShell />
    </RequirePermission>
  );
}
