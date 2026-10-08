import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, GlassButton, GlassCard, Navbar, ScrollToTop } from "@hungernet/ui/components";
import { HungerNetAuthButtons, HungerNetAuthCallback, RequirePermission } from "@hungernet/auth";
import { useAuth } from "@hungernet/auth";

import { UserListPage } from "./pages/UserListPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { RolesPage } from "./pages/RolesPage";
import { AuditPage } from "./pages/AuditPage";

const navItems = [
  { to: "/users", label: "Users" },
  { to: "/roles", label: "Roles" },
  { to: "/audit", label: "Audit" },
];

function AdminShell() {
  const { user, signOut } = useAuth();
  const displayName = user?.displayName ?? "Operator";

  return (
    <>
      <Navbar
        brand="HungerNet Admin"
        brandDotColor="#4ad9e6"
        navItems={navItems}
        rightSlot={<GlassButton size="sm" onClick={() => void signOut()}>Sign out</GlassButton>}
      />
      <ScrollToTop />
      <main className="container page">
        <header className="page-header">
          <div className="section-label">Admin</div>
          <h1>Account management</h1>
          <p>Signed in as {displayName}. Manage users, roles, and platform activity.</p>
        </header>
        <Routes>
          <Route path="/users" element={<UserListPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/users" replace />} />
        </Routes>
      </main>
      <Footer brand="HungerNet Admin" socials={[]} footerNote={`© ${new Date().getFullYear()} HungerNet`} />
    </>
  );
}

export function App() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (location.pathname === "/auth/callback") {
    return <HungerNetAuthCallback clientId="admin" />;
  }

  if (status === "loading") {
    return (
      <main className="private-auth-page">
        <GlassCard style={{ maxWidth: "36rem", padding: "2rem", marginInline: "auto" }}>
          <p>Loading admin session…</p>
        </GlassCard>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="private-auth-page admin-auth-stage">
        <GlassCard className="private-admin-card">
          <div className="private-auth-mark" aria-hidden="true">H</div>
          <div className="section-label">Restricted workspace</div>
          <h1>HungerNet Admin</h1>
          <p className="private-auth-description">Sign in with an authorized HungerNet account to manage platform access.</p>
          <HungerNetAuthButtons clientId="admin" appName="HungerNet Admin" />
          <p className="private-auth-note">Admin permissions are required to continue.</p>
        </GlassCard>
      </main>
    );
  }

  return (
    <RequirePermission
      permission="platform.admin.users.read"
      fallback={
        <main className="private-auth-page">
          <GlassCard style={{ maxWidth: "36rem", padding: "2rem", marginInline: "auto" }}>
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
