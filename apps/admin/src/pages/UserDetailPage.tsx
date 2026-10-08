import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createApiClient } from "@hungernet/api-client";
import { GlassButton as Button, GlassCard, InputBox } from "@hungernet/ui/components";
import { useAuth } from "@hungernet/auth";
import { AdminLayout } from "../components/AdminLayout";

interface AdminUserRecord {
  id: string;
  username: string;
  email: string | null;
  display_name: string;
  status: "active" | "disabled";
  roles: string[];
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: "public" | "private";
  is_superuser: boolean;
  totp_enabled: boolean;
  created_at: string;
  updated_at: string;
  identities: IdentityRecord[];
  sessions: SessionRecord[];
  permissions: string[];
  project_count: number;
  storage: {
    avatar_filename: string | null;
    avatar_exists: boolean;
    avatar_bytes: number;
  };
}

interface IdentityRecord {
  id: string;
  provider: string;
  provider_subject: string;
  provider_email: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface SessionRecord {
  id: string;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
}

interface RoleRecord {
  id: string;
  key: string;
  name: string;
  color: string;
  is_system: boolean;
}

const api = createApiClient({ clientId: "admin" });

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const canManageRoles = viewer?.permissions?.includes("platform.admin.roles.manage") ?? false;
  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [roleError, setRoleError] = useState("");
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      });
      setUser((current) => current && ({ ...current, status: updated.status }));
    } catch {
      setError("Could not update this user's status.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.patch<AdminUserRecord>(`/admin/users/${encodeURIComponent(user.id)}`, {
        username: user.username,
        email: user.email?.trim() || null,
        display_name: user.display_name,
        avatar_url: user.avatar_url?.trim() || null,
        bio: user.bio?.trim() || null,
        profile_visibility: user.profile_visibility,
        is_superuser: user.is_superuser,
      });
      setUser(updated);
    } catch {
      setError("Could not save account settings. Check the username and email for conflicts.");
    } finally {
      setSaving(false);
    }
  }

  async function resetMfa() {
    if (!user || !user.totp_enabled) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.patch<AdminUserRecord>(`/admin/users/${encodeURIComponent(user.id)}`, {
        totp_enabled: false,
      });
      setUser(updated);
    } catch {
      setError("Could not reset multi-factor authentication.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (!user || !window.confirm(`Permanently delete @${user.username}? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/admin/users/${encodeURIComponent(user.id)}`);
      navigate("/users", { replace: true });
    } catch {
      setError("Could not delete this account. The last active administrator cannot be deleted.");
      setDeleting(false);
    }
  }

  async function toggleRole(role: RoleRecord, assigned: boolean) {
    if (!user) return;
    setSavingRoleId(role.id);
    setRoleError("");
    const path = `/admin/users/${encodeURIComponent(user.id)}/roles/${encodeURIComponent(role.id)}`;
    try {
      if (assigned) {
        await api.request(path, { method: "DELETE" });
      } else {
        await api.post(path, {});
      }
      setUser((current) => current && ({
        ...current,
        roles: assigned
          ? current.roles.filter((name) => name !== role.name)
          : [...current.roles, role.name],
      }));
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
      title={user.display_name}
      actions={
        <Button variant="secondary" size="sm" onClick={() => void updateStatus()} disabled={saving}>
          {saving ? "Updating…" : user.status === "active" ? "Suspend user" : "Restore user"}
        </Button>
      }
    >
      {error && <p role="alert">{error}</p>}
      <div className="user-detail-grid" style={{ display: "grid", gap: "1rem" }}>
        <GlassCard style={{ padding: "1.25rem" }}>
          <div className="admin-card-heading">
            <div>
              <div className="section-label">Account settings</div>
              <h3>Edit profile and access</h3>
            </div>
            <Button variant="primary" size="sm" onClick={() => void saveSettings()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
          <div className="user-edit-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "1rem" }}>
            <div className="input-field">
              <label htmlFor="user-username">Username</label>
              <InputBox id="user-username" value={user.username} onChange={(value) => setUser({ ...user, username: value })} />
            </div>
            <div className="input-field">
              <label htmlFor="user-display-name">Display name</label>
              <InputBox id="user-display-name" value={user.display_name} onChange={(value) => setUser({ ...user, display_name: value })} />
            </div>
            <div className="input-field">
              <label htmlFor="user-email">Email</label>
              <InputBox id="user-email" type="email" value={user.email ?? ""} onChange={(value) => setUser({ ...user, email: value || null })} />
            </div>
            <div className="input-field">
              <label htmlFor="user-avatar">Avatar URL</label>
              <InputBox id="user-avatar" type="url" value={user.avatar_url ?? ""} onChange={(value) => setUser({ ...user, avatar_url: value || null })} />
            </div>
            <div className="input-field">
              <label htmlFor="user-visibility">Profile visibility</label>
              <select id="user-visibility" value={user.profile_visibility} onChange={(event) => setUser({ ...user, profile_visibility: event.target.value as "public" | "private" })}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="input-field">
              <label htmlFor="user-bio">Profile bio</label>
              <textarea
                id="user-bio"
                rows={4}
                value={user.bio ?? ""}
                onChange={(event) => setUser({ ...user, bio: event.target.value || null })}
              />
            </div>
          </div>
          <label className="admin-toggle">
            <input type="checkbox" checked={user.is_superuser} onChange={(event) => setUser({ ...user, is_superuser: event.target.checked })} />
            <span>Platform superuser</span>
          </label>
          <div className="admin-account-actions">
            <span className="muted">Multi-factor authentication: {user.totp_enabled ? "enabled" : "not enabled"}</span>
            {user.totp_enabled && <Button variant="secondary" size="sm" onClick={() => void resetMfa()} disabled={saving}>Reset MFA</Button>}
          </div>
        </GlassCard>

        {canManageRoles && (
          <GlassCard style={{ padding: "1.25rem" }}>
            <div className="admin-card-heading">
              <div>
                <div className="section-label">Access control</div>
                <h3>Role assignments</h3>
              </div>
              <span className="muted">Changes take effect on the next session refresh.</span>
            </div>
            {roleError && <p role="alert" className="role-error">{roleError}</p>}
            <div className="user-role-list">
              {roles.map((role) => {
                const assigned = user.roles.includes(role.name);
                return (
                  <div className="user-role-row" key={role.id}>
                    <span className="role-preview" style={{ "--role-color": role.color } as CSSProperties}>{role.name}</span>
                    <span className="muted">{assigned ? "Assigned" : "Not assigned"}</span>
                    <Button
                      variant={assigned ? "secondary" : "primary"}
                      size="sm"
                      disabled={savingRoleId !== null || (assigned && role.is_system && role.key !== "superuser")}
                      onClick={() => void toggleRole(role, assigned)}
                    >
                      {savingRoleId === role.id ? "Saving…" : assigned ? "Remove" : "Assign"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        <GlassCard style={{ padding: "1.25rem" }}>
          <div className="section-label">Account metadata</div>
          <dl className="admin-metadata-grid">
            <div><dt>UUID</dt><dd><code>{user.id}</code></dd></div>
            <div><dt>Status</dt><dd>{user.status}</dd></div>
            <div><dt>Created</dt><dd><time dateTime={user.created_at}>{new Date(user.created_at).toLocaleString()}</time></dd></div>
            <div><dt>Last updated</dt><dd><time dateTime={user.updated_at}>{new Date(user.updated_at).toLocaleString()}</time></dd></div>
            <div><dt>Linked identities</dt><dd>{user.identities.length}</dd></div>
            <div><dt>Projects</dt><dd>{user.project_count}</dd></div>
          </dl>
        </GlassCard>

        <GlassCard style={{ padding: "1.25rem" }}>
          <div className="section-label">Storage</div>
          <h3>Account files</h3>
          <p className="muted">Avatar file: {user.storage.avatar_filename ?? "No platform-stored avatar"}</p>
          <p className="muted">{user.storage.avatar_exists ? `${user.storage.avatar_bytes.toLocaleString()} bytes` : "No stored avatar file found"}</p>
        </GlassCard>

        <GlassCard style={{ padding: "1.25rem" }}>
          <div className="section-label">Authentication diagnostics</div>
          <h3>Linked identities</h3>
          {user.identities.length === 0 && <p className="muted">No linked identities.</p>}
          <div className="admin-record-list">
            {user.identities.map((identity) => (
              <div className="admin-record-row" key={identity.id}>
                <div><strong>{identity.provider}</strong><p className="muted">{identity.provider_email ?? "No provider email"}</p></div>
                <code>{identity.provider_subject}</code>
                <span className="muted">Last login {identity.last_login_at ? new Date(identity.last_login_at).toLocaleString() : "not recorded"}</span>
              </div>
            ))}
          </div>
          <h3 className="admin-subheading">Sessions</h3>
          {user.sessions.length === 0 && <p className="muted">No session records.</p>}
          <div className="admin-record-list">
            {user.sessions.map((session) => (
              <div className="admin-record-row" key={session.id}>
                <div><strong>{session.device_label || "Unlabeled device"}</strong><p className="muted"><code>{session.id}</code></p></div>
                <span className="muted">{session.revoked_at ? "Revoked" : `Expires ${new Date(session.expires_at).toLocaleString()}`}</span>
                <span className="muted">Last seen {new Date(session.last_seen_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard style={{ padding: "1.25rem" }}>
          <div className="section-label">Effective permissions</div>
          <div className="admin-permission-list">
            {user.permissions.map((permission) => <code key={permission}>{permission}</code>)}
            {user.permissions.length === 0 && <span className="muted">No effective permissions.</span>}
          </div>
        </GlassCard>

        <GlassCard className="admin-danger-zone" style={{ padding: "1.25rem" }}>
          <div>
            <div className="section-label">Danger zone</div>
            <h3>Delete account permanently</h3>
            <p className="muted">Deleting removes this account and its sessions. This is separate from suspending it.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void deleteAccount()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete user"}
          </Button>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
