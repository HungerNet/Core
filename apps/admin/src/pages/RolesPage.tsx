import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { Button, GlassCard, InputBox } from "@hungernet/ui";
import { AdminLayout } from "../components/AdminLayout";

interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
}

const api = createApiClient();

export function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

  async function createRole() {
    setSaving(true);
    setError("");
    try {
      const role = await api.post<RoleRecord>("/admin/roles", {
        key,
        name,
        description: description || null,
        permission_keys: selectedPermissions,
      });
      setRoles((current) => [...current, role].sort((left, right) => left.key.localeCompare(right.key)));
      setKey("");
      setName("");
      setDescription("");
      setSelectedPermissions([]);
      setShowForm(false);
    } catch {
      setError("Could not create role. Check the role key and your permissions.");
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
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm((visible) => !visible)} disabled={loading}>
          {showForm ? "Cancel" : "Add role"}
        </Button>
      }
    >
      {error && <p role="alert">{error}</p>}
      {showForm && <GlassCard style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="input-row">
          <div className="input-field"><label htmlFor="role-key">Role key</label><InputBox id="role-key" value={key} onChange={setKey} placeholder="platform.support" /></div>
          <div className="input-field"><label htmlFor="role-name">Role name</label><InputBox id="role-name" value={name} onChange={setName} placeholder="Support" /></div>
        </div>
        <div className="input-field" style={{ marginTop: "1rem" }}><label htmlFor="role-description">Description</label><InputBox id="role-description" value={description} onChange={setDescription} placeholder="Role description" /></div>
        <fieldset style={{ marginTop: "1rem" }}>
          <legend>Permissions</legend>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {availablePermissions.map((permission) => <label key={permission} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={selectedPermissions.includes(permission)} onChange={() => togglePermission(permission)} />
              {permission}
            </label>)}
          </div>
        </fieldset>
        <Button variant="primary" size="sm" onClick={() => void createRole()} disabled={saving || key.trim().length < 3 || !name.trim()}>{saving ? "Creating…" : "Create role"}</Button>
      </GlassCard>}
      {loading && <p role="status">Loading roles…</p>}
      {!loading && roles.length === 0 && <p>No roles found.</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {roles.map((role) => (
          <GlassCard key={role.id} style={{ padding: "1rem" }}>
            <h3>{role.name}</h3>
            <p className="muted">{role.key}</p>
            {role.is_system && <p className="muted">System role</p>}
            {role.description ? <p>{role.description}</p> : null}
            <ul style={{ marginTop: "0.75rem", paddingLeft: "1.25rem", color: "var(--color-muted)" }}>
              {role.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </AdminLayout>
  );
}
