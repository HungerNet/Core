import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { createApiClient } from "@hungernet/api-client";
import { Button, GlassCard } from "@hungernet/ui";
import { InputBox } from "@hungernet/ui";
import { useAuth } from "@hungernet/auth";
import { AdminLayout } from "../components/AdminLayout";

interface AdminUserRecord {
  id: string;
  username: string;
  display_name: string;
  status: "active" | "disabled";
  roles: string[];
}

interface RoleRecord {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
}

const api = createApiClient();

export function UserDetailPage() {
  const { id } = useParams();
  const { user: viewer } = useAuth();
  const canManageRoles = viewer?.permissions?.includes("platform.admin.roles.manage") ?? false;
  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [reason, setReason] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [roleError, setRoleError] = useState("");
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    void api.get<AdminUserRecord>(`/admin/users/${encodeURIComponent(id)}`)
      .then(setUser)
      .catch(() => setError("Could not load this user."))
      .finally(() => setLoading(false));
    if (canManageRoles) {
      void api.get<RoleRecord[]>("/admin/roles")
        .then(setRoles)
        .catch(() => setRoleError("Could not load available roles."));
    }
  }, [id, canManageRoles]);

  async function updateStatus() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.patch<AdminUserRecord>(`/admin/users/${encodeURIComponent(user.id)}/status`, {
        active: user.status !== "active",
        reason,
      });
      setUser(updated);
      setReason("");
    } catch {
      setError("Could not update user status. Check your permissions and the reason provided.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(role: RoleRecord, assigned: boolean) {
    if (!user) return;
    setSavingRoleId(role.id);
    setRoleError("");
    const path = `/admin/users/${encodeURIComponent(user.id)}/roles/${encodeURIComponent(role.id)}`;
    try {
      if (assigned) {
        await api.request(path, {
          method: "DELETE",
          body: JSON.stringify({ reason: roleReason }),
        });
      } else {
        await api.post(path, { reason: roleReason });
      }
      setUser((current) => current && ({
        ...current,
        roles: assigned
          ? current.roles.filter((name) => name !== role.name)
          : [...current.roles, role.name],
      }));
      setRoleReason("");
    } catch {
      setRoleError(`Could not ${assigned ? "remove" : "assign"} the ${role.name} role.`);
    } finally {
      setSavingRoleId(null);
    }
  }

  if (loading) {
    return <AdminLayout title="User details"><p role="status">Loading user…</p></AdminLayout>;
  }

  if (!user) {
    return (
      <AdminLayout title="User not found">
        <p className="muted">No matching user record was found.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`User: ${user.display_name}`}
      actions={
        <Button variant="secondary" size="sm" onClick={() => void updateStatus()} disabled={saving || reason.trim().length < 3}>
          {saving ? "Updating…" : user.status === "active" ? "Suspend user" : "Restore user"}
        </Button>
      }
    >
      {error && <p role="alert">{error}</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        <GlassCard style={{ padding: "1rem" }}>
          <p><strong>Username:</strong> @{user.username}</p>
          <p><strong>Status:</strong> {user.status}</p>
          <p><strong>Roles:</strong> {user.roles.join(", ") || "None"}</p>
          <div className="input-field" style={{ marginTop: "1rem" }}>
            <label htmlFor="status-reason">Reason for status change</label>
            <InputBox id="status-reason" value={reason} onChange={setReason} placeholder="Explain this change" />
          </div>
        </GlassCard>
        {canManageRoles && (
          <GlassCard className="user-role-card" style={{ padding: "1rem" }}>
            <div>
              <h3>Role assignments</h3>
              <p className="muted">Changes take effect the next time the user refreshes their session.</p>
            </div>
            {roleError && <p role="alert" className="role-error">{roleError}</p>}
            <div className="user-role-list">
              {roles.map((role) => {
                const assigned = user.roles.includes(role.name);
                return (
                  <div className="user-role-row" key={role.id}>
                    <span className="role-preview" style={{ "--role-color": role.color } as CSSProperties}>
                      {role.name}
                    </span>
                    <span className="muted">{assigned ? "Assigned" : "Not assigned"}</span>
                    <Button
                      variant={assigned ? "secondary" : "primary"}
                      size="sm"
                      disabled={savingRoleId !== null || roleReason.trim().length < 3 || (assigned && role.is_system)}
                      onClick={() => void toggleRole(role, assigned)}
                    >
                      {savingRoleId === role.id ? "Saving…" : assigned ? "Remove" : "Assign"}
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="input-field">
              <label htmlFor="role-reason">Reason for role change</label>
              <InputBox id="role-reason" value={roleReason} onChange={setRoleReason} placeholder="Explain this change" />
            </div>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  );
}
