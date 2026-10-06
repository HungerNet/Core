import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassCard } from "@hungernet/ui";
import { AdminLayout } from "../components/AdminLayout";

interface AuditRecord {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: string | null;
  created_at: string;
}

const api = createApiClient();

export function AuditPage() {
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<AuditRecord[]>("/admin/audit-events?limit=100")
      .then(setEvents)
      .catch(() => setError("Could not load audit events. Check your audit permissions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Audit log">
      {loading && <p role="status">Loading audit events…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && events.length === 0 && <p>No audit events recorded.</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {events.map((entry) => (
          <GlassCard key={entry.id} style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong>{entry.action}</strong>
                <div className="muted">Actor: {entry.actor_user_id ?? "System"}</div>
              </div>
              <time className="muted" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
            </div>
            <p style={{ marginTop: "0.5rem" }}>Target: {entry.target_type} / {entry.target_id}</p>
            {entry.details && <p className="muted">{entry.details}</p>}
          </GlassCard>
        ))}
      </div>
    </AdminLayout>
  );
}
