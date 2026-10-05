import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassButton, GlassCard } from "@hungernet/ui";
import { SettingsLayout } from "../components/SettingsLayout";

type Provider = "google" | "github" | "discord";
interface IdentityRecord {
  provider: Provider;
  linked_at: string;
  provider_email: string | null;
}

const providers: Provider[] = ["google", "github", "discord"];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const api = createApiClient({ baseUrl: apiBaseUrl });

export function SecurityPage() {
  const [identities, setIdentities] = useState<IdentityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function loadIdentities() {
    try {
      setIdentities(await api.get<IdentityRecord[]>("/users/me/identities"));
      setError("");
    } catch {
      setError("Could not load linked identities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIdentities();
  }, []);

  async function connect(provider: Provider) {
    setBusyProvider(provider);
    setError("");
    try {
      const result = await api.post<{ authorization_url: string }>(`/users/me/identities/${provider}/start`, {});
      window.location.assign(result.authorization_url);
    } catch {
      setError(`Could not start ${provider} linking.`);
      setBusyProvider(null);
    }
  }

  async function disconnect(provider: Provider) {
    setBusyProvider(provider);
    setError("");
    try {
      await api.delete(`/users/me/identities/${provider}`);
      await loadIdentities();
    } catch {
      setError(`Could not disconnect ${provider}. Keep at least one sign-in identity linked.`);
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <SettingsLayout title="Linked identities">
      <div style={{ display: "grid", gap: "1rem" }}>
        {loading && <p role="status">Loading linked identities…</p>}
        {error && <p role="alert" className="site-error">{error}</p>}
        {providers.map((provider) => {
          const identity = identities.find((item) => item.provider === provider);
          return (
            <GlassCard key={provider} style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <h3>{provider.toUpperCase()}</h3>
                  <p className="muted">{identity?.provider_email ?? (identity ? "Connected" : "Not connected")}</p>
                </div>
                <GlassButton
                  variant={identity ? "secondary" : "primary"}
                  size="sm"
                  disabled={loading || busyProvider !== null}
                  onClick={() => void (identity ? disconnect(provider) : connect(provider))}
                >
                  {busyProvider === provider ? "Working…" : identity ? "Disconnect" : "Connect"}
                </GlassButton>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </SettingsLayout>
  );
}
