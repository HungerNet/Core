import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Button, GlassCard } from "@hungernet/ui";
import { OAuthSignIn, RequirePermission } from "@hungernet/auth";
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

  return (
    <div className="page" style={{ gap: "1.5rem" }}>
      <header className="glass-card" style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="section-label">Admin</div>
          <h1 style={{ fontSize: "1.5rem", marginTop: "0.25rem" }}>HungerNet Dashboard</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="muted">{user?.displayName ?? "Guest"}</span>
          <Button onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>

      <nav aria-label="Admin navigation" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
        <Route path="/users" element={<UserListPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/users" replace />} />
      </Routes>
    </div>
  );
}

export function App() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <main className="hn-container page">
        <GlassCard style={{ padding: "2rem" }}>
          <p>Loading admin session…</p>
        </GlassCard>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="hn-container page">
        <GlassCard style={{ padding: "2rem" }}>
          <h2>Authentication required</h2>
          <OAuthSignIn apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} returnPath="/" />
        </GlassCard>
      </main>
    );
  }

  return (
    <RequirePermission permission="platform.admin.users.read" fallback={<main className="hn-container page"><GlassCard style={{ padding: "2rem" }}><h2>Admin access required</h2><p className="muted">Your account does not have permission to open this dashboard.</p></GlassCard></main>}>
      <AdminShell />
    </RequirePermission>
  );
}
