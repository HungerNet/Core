import { useEffect, useState, type CSSProperties } from "react";
import { ApiClientError, createApiClient } from "@hungernet/api-client";
import { GlassButton as Button, GlassCard, InputBox } from "@hungernet/ui/components";
import { useAuth } from "@hungernet/auth";
import { AdminLayout } from "../components/AdminLayout";

interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  requires_mfa: boolean;
  permissions: string[];
}

const api = createApiClient({ clientId: "admin" });

export function RolesPage() {
  const { user } = useAuth();
  const canCreate = user?.permissions?.includes("roles.create") ?? false;
  const canManage = user?.permissions?.includes("platform.admin.roles.manage") ?? false;
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7ef9d2");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      api.get<RoleRecord[]>("/admin/roles"),
      api.get<{ items: string[] }>("/admin/permissions"),
    ])
      .then(([roleRecords, permissionResponse]) => {
        setRoles(roleRecords);
        setAvailablePermissions(permissionResponse.items);
      })
      .catch(() => setError("Could not load roles and permissions."))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setKey("");
    setName("");
    setDescription("");
    setColor("#7ef9d2");
    setRequiresMfa(false);
    setSelectedPermissions([]);
  }

  function editRole(role: RoleRecord) {
    setEditingId(role.id);
    setKey(role.key);
    setName(role.name);
    setDescription(role.description ?? "");
    setColor(role.color);
    setRequiresMfa(role.requires_mfa);
    setSelectedPermissions(role.permissions);
    setShowForm(true);
  }

  async function saveRole() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        requires_mfa: requiresMfa,
        permission_keys: selectedPermissions,
      };
      const role = editingId
        ? await api.patch<RoleRecord>(`/admin/roles/${encodeURIComponent(editingId)}`, payload)
        : await api.post<RoleRecord>("/admin/roles", { ...payload, key: key.trim() });
      setRoles((current) => {
        const updated = editingId
          ? current.map((item) => item.id === role.id ? role : item)
          : [...current, role];
        return updated.sort((left, right) => left.id.localeCompare(right.id));
      });
      resetForm();
    } catch (cause) {
      setError(cause instanceof ApiClientError
        ? cause.message
        : editingId ? "Could not update this role." : "Could not create this role.");
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  }

  return (
    <AdminLayout
      title="Roles and permissions"
      actions={canCreate && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          disabled={loading}
        >
          {showForm ? "Cancel" : "Create role"}
        </Button>
      )}
    >
      {error && <p role="alert" className="role-error">{error}</p>}

      {showForm && (
        <GlassCard className="role-editor" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
          <div className="role-editor-heading">
            <div>
              <h3>{editingId ? "Edit role" : "Create a role"}</h3>
              <p className="muted">Use a lowercase, alphanumeric ID that is easy to recognize.</p>
            </div>
            <span className="role-preview" style={{ "--role-color": color } as CSSProperties}>
              {name.trim() || "Role"}
            </span>
          </div>
          <div className="role-fields">
            {!editingId && (
              <div className="input-field">
                <label htmlFor="role-key">Role ID</label>
                <InputBox
                  id="role-key"
                  value={key}
                  onChange={(value) => setKey(value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  placeholder="moderator"
                  maxLength={80}
                />
              </div>
            )}
            <div className="input-field">
              <label htmlFor="role-name">Display name</label>
              <InputBox id="role-name" value={name} onChange={setName} placeholder="Moderator" />
            </div>
            <div className="input-field">
              <label htmlFor="role-color">Role color</label>
              <div className="role-color-input">
                <input
                  id="role-color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Choose a role color"
                />
                <code>{color.toUpperCase()}</code>
              </div>
            </div>
            <div className="input-field role-description-field">
              <label htmlFor="role-description">Description</label>
              <InputBox
                id="role-description"
                value={description}
                onChange={setDescription}
                placeholder="What this role is for"
              />
            </div>
          </div>
          <fieldset className="role-permissions">
            <legend>Permission nodes <span>{selectedPermissions.length} selected</span></legend>
            <div className="role-permission-grid">
              {availablePermissions.map((permission) => (
                <label key={permission} className="role-permission-option">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />
                  <code>{permission}</code>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={requiresMfa}
              onChange={(event) => setRequiresMfa(event.target.checked)}
            />
            <span>Require authenticator verification for this role</span>
          </label>
          <div className="role-editor-actions">
            <Button variant="secondary" size="sm" onClick={resetForm} disabled={saving}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void saveRole()}
              disabled={saving || !name.trim() || (!editingId && !key)}
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create role"}
            </Button>
          </div>
        </GlassCard>
      )}

      {loading && <p role="status">Loading roles…</p>}
      {!loading && !error && roles.length === 0 && <p>No roles found.</p>}
      <div className="role-grid">
        {roles.map((role) => (
          <GlassCard key={role.id} className="role-card" style={{ "--role-color": role.color }}>
            <div className="role-card-heading">
              <div className="role-identity">
                <span className="role-color-dot" aria-hidden="true" />
                <div>
                  <h3>{role.name}</h3>
                  <code className="role-id">{role.id}</code>
                </div>
              </div>
              {role.is_system
                ? <span className="role-system-tag">System</span>
                : canManage && (
                  <Button variant="secondary" size="sm" onClick={() => editRole(role)}>Edit</Button>
                )}
            </div>
            {role.description && <p className="role-description">{role.description}</p>}
            <p className="role-mfa-policy">
              {role.requires_mfa ? "MFA required" : "MFA optional"}
            </p>
            <div className="role-permission-summary">
              <span>{role.permissions.length === 0 ? "No permission nodes" : `${role.permissions.length} permission nodes`}</span>
              {role.permissions.length > 0 && (
                <div className="role-permission-list">
                  {role.permissions.map((permission) => <code key={permission}>{permission}</code>)}
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </AdminLayout>
  );
}
