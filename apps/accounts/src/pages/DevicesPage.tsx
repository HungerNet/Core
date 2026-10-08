import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassButton, GlassCard } from "@hungernet/ui/components";
import { SettingsLayout } from "../components/SettingsLayout";

interface SessionRecord {
  id: string;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  current: boolean;
}

const api = createApiClient();

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DevicesPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadSessions() {
    try {
      setSessions(await api.get<SessionRecord[]>("/users/me/sessions"));
      setError("");
    } catch {
      setError("Could not load active sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function revoke(sessionId?: string) {
    setBusy(true);
    setError("");
    try {
      if (sessionId) await api.delete(`/users/me/sessions/${sessionId}`);
      else await api.delete("/users/me/sessions");
      await loadSessions();
    } catch {
      setError("Could not revoke the selected sessions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsLayout title="Active sessions" actions={<GlassButton variant="secondary" size="sm" onClick={() => void revoke()} disabled={loading || busy}>Sign out other sessions</GlassButton>}>
      <div style={{ display: "grid", gap: "1rem" }}>
        {loading && <p role="status">Loading active sessions…</p>}
        {error && <p role="alert" className="site-error">{error}</p>}
        {!loading && sessions.length === 0 && <p>No active sessions.</p>}
        {sessions.map((session) => (
          <GlassCard key={session.id} style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3>{session.device_label || "Unknown device"}</h3>
                <p className="muted">Last active: {formatDate(session.last_seen_at)}</p>
                <p className="muted">Signed in: {formatDate(session.created_at)} · Expires: {formatDate(session.expires_at)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {session.current && <span className="muted">Current</span>}
                <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => void revoke(session.id)}>Revoke</GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </SettingsLayout>
  );
}
