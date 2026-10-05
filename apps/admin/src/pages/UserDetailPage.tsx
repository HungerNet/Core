import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createApiClient } from "@hungernet/api-client";
import { Button, GlassCard } from "@hungernet/ui";
import { InputBox } from "@hungernet/ui";
import { AdminLayout } from "../components/AdminLayout";

interface AdminUserRecord {
  id: string;
  username: string;
  display_name: string;
  status: "active" | "disabled";
  roles: string[];
}

const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" });

export function UserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    void api.get<AdminUserRecord>(`/admin/users/${encodeURIComponent(id)}`)
      .then(setUser)
      .catch(() => setError("Could not load this user."))
      .finally(() => setLoading(false));
  }, [id]);

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
      </div>
    </AdminLayout>
  );
}
