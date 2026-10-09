import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassButton, GlassCard } from "@hungernet/ui/components";
import { AdminLayout } from "../components/AdminLayout";

type Provider = "google" | "github" | "discord" | "microsoft";
interface ProviderConfig {
  provider: Provider;
  enabled: boolean;
  client_id: string | null;
  updated_at: string | null;
}

const providerNames: Record<Provider, string> = {
  google: "Google",
  github: "GitHub",
  discord: "Discord",
  microsoft: "Microsoft",
};
const api = createApiClient({ clientId: "admin" });

export function SSOSettingsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadProviders() {
    try {
      setProviders(await api.get<ProviderConfig[]>("/admin/sso/providers"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load SSO providers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProviders();
  }, []);

  function chooseProvider(provider: Provider) {
    const current = providers.find((item) => item.provider === provider);
    setSelected(provider);
    setClientId(current?.client_id ?? "");
    setClientSecret("");
    setVerified(false);
    setError("");
    setNotice("");
  }

  async function testCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.post("/admin/sso/providers/test", {
        provider: selected,
        client_id: clientId,
        client_secret: clientSecret,
      });
      setVerified(true);
      setNotice(`${providerNames[selected]} credentials passed the provider check.`);
    } catch (cause) {
      setVerified(false);
      setError(cause instanceof Error ? cause.message : "Provider verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    if (!selected || !verified) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/admin/sso/providers", {
        provider: selected,
        client_id: clientId,
        client_secret: clientSecret,
      });
      setNotice(`${providerNames[selected]} sign-in is enabled.`);
      setSelected(null);
      setClientSecret("");
      await loadProviders();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save provider settings.");
    } finally {
      setBusy(false);
    }
  }

  async function disableProvider(provider: Provider) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/sso/providers/${provider}`);
      setNotice(`${providerNames[provider]} sign-in was disabled.`);
      await loadProviders();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not disable this provider.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout title="SSO providers">
      <p className="muted">
        Configure optional identity providers. Credentials are tested before they are saved and client secrets are encrypted at rest.
      </p>
      {loading && <p role="status">Loading providers…</p>}
      {error && <p role="alert" className="site-error">{error}</p>}
      {notice && <p role="status" className="admin-notice">{notice}</p>}
      <div className="sso-provider-grid">
        {providers.map((provider) => (
          <GlassCard className="sso-provider-card" key={provider.provider}>
            <div className="admin-card-heading">
              <div>
                <h3>{providerNames[provider.provider]}</h3>
                <p className="muted">
                  {provider.enabled ? `Enabled · ${provider.client_id ?? "Environment-managed"}` : "Not configured"}
                </p>
              </div>
              <span className={`sso-status ${provider.enabled ? "is-enabled" : ""}`}>
                {provider.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="admin-account-actions">
              <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => chooseProvider(provider.provider)}>
                {provider.enabled ? "Update credentials" : "Configure"}
              </GlassButton>
              {provider.enabled && (
                <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => void disableProvider(provider.provider)}>
                  Disable
                </GlassButton>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {selected && (
        <GlassCard className="sso-editor">
          <div className="admin-card-heading">
            <div>
              <h3>Configure {providerNames[selected]}</h3>
              <p className="muted">Run the connection test, then save the verified credentials.</p>
            </div>
            <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => setSelected(null)}>
              Cancel
            </GlassButton>
          </div>
          <form className="sso-form" onSubmit={testCredentials}>
            <label>
              Client ID
              <input required autoComplete="off" value={clientId} onChange={(event) => { setClientId(event.target.value); setVerified(false); }} />
            </label>
            <label>
              Client secret
              <input required type="password" autoComplete="new-password" value={clientSecret} onChange={(event) => { setClientSecret(event.target.value); setVerified(false); }} />
            </label>
            <div className="admin-account-actions">
              <GlassButton variant="secondary" size="sm" type="submit" disabled={busy || !clientId || !clientSecret}>
                {busy ? "Checking…" : "Test credentials"}
              </GlassButton>
              <GlassButton variant="primary" size="sm" type="button" disabled={busy || !verified} onClick={() => void saveCredentials()}>
                Save provider
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      )}
    </AdminLayout>
  );
}
