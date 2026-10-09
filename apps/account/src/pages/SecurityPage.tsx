import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassButton, GlassCard } from "@hungernet/ui/components";
import { SettingsLayout } from "../components/SettingsLayout";

type Provider = "google" | "github" | "discord" | "microsoft";
interface IdentityRecord {
  provider: Provider;
  linked_at: string;
  provider_email: string | null;
}
interface AccountSecurity {
  username: string;
  email: string | null;
  totp_enabled: boolean;
  mfa_required: boolean;
}

const providers: Provider[] = ["google", "github", "discord", "microsoft"];
const api = createApiClient();

export function SecurityPage() {
  const [identities, setIdentities] = useState<IdentityRecord[]>([]);
  const [account, setAccount] = useState<AccountSecurity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPassword, setMfaPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function loadSecurity() {
    try {
      const [linked, me] = await Promise.all([
        api.get<IdentityRecord[]>("/users/me/identities"),
        api.get<AccountSecurity>("/users/me"),
      ]);
      setIdentities(linked);
      setAccount(me);
      setError("");
    } catch {
      setError("Could not load your security settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSecurity();
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
      await loadSecurity();
    } catch {
      setError(`Could not disconnect ${provider}. Keep at least one sign-in identity linked.`);
    } finally {
      setBusyProvider(null);
    }
  }

  async function beginMfaSetup() {
    if (!account) return;
    setError("");
    setNotice("");
    try {
      const result = await api.post<{ setupSecret: string }>("/auth/mfa/setup", {
        identifier: account.email ?? account.username,
        password: mfaPassword,
      });
      setSetupSecret(result.setupSecret);
      setMfaCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start MFA enrollment.");
    }
  }

  async function confirmMfaSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    setError("");
    try {
      await api.post("/auth/mfa/verify", {
        identifier: account.email ?? account.username,
        password: mfaPassword,
        code: mfaCode,
      });
      setSetupSecret("");
      setMfaCode("");
      setMfaPassword("");
      setNotice("Authenticator-based MFA is enabled.");
      await loadSecurity();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authenticator code could not be verified.");
    }
  }

  async function disableMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/users/me/mfa/disable", {
        current_password: mfaPassword,
        code: mfaCode,
      });
      setMfaCode("");
      setMfaPassword("");
      setNotice("Authenticator-based MFA is disabled.");
      await loadSecurity();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "MFA could not be disabled.");
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    setError("");
    setNotice("");
    try {
      await api.post("/users/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setNotice("Your password was changed. Other active sessions have been revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password could not be changed.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <SettingsLayout title="Security">
      <div className="account-security-stack">
        {loading && <p role="status">Loading security settings…</p>}
        {error && <p role="alert" className="site-error">{error}</p>}
        {notice && <p role="status" className="account-security-notice">{notice}</p>}

        <GlassCard className="account-security-card">
          <div>
            <h2>Multi-factor authentication</h2>
            <p className="muted">
              {account?.totp_enabled
                ? "An authenticator app protects this account."
                : "Add an authenticator app for an additional sign-in check."}
            </p>
          </div>
          {!account?.totp_enabled && !setupSecret && (
            <div className="account-security-form">
              <label>
                Current password
                <input type="password" autoComplete="current-password" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} />
              </label>
              <GlassButton variant="primary" size="sm" disabled={!mfaPassword} onClick={() => void beginMfaSetup()}>
                Set up authenticator
              </GlassButton>
            </div>
          )}
          {setupSecret && (
            <form className="account-security-form" onSubmit={confirmMfaSetup}>
              <p>Save this key in your authenticator app:</p>
              <code className="account-mfa-secret">{setupSecret}</code>
              <label>
                Six-digit authenticator code
                <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} />
              </label>
              <GlassButton variant="primary" size="sm" type="submit">Confirm and enable MFA</GlassButton>
            </form>
          )}
          {account?.totp_enabled && (
            account.mfa_required ? (
              <p className="muted">Your role requires MFA, so it cannot be disabled.</p>
            ) : (
              <form className="account-security-form" onSubmit={disableMfa}>
                <label>
                  Current password
                  <input required type="password" autoComplete="current-password" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} />
                </label>
                <label>
                  Authenticator code
                  <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} />
                </label>
                <GlassButton variant="secondary" size="sm" type="submit">
                  Disable MFA
                </GlassButton>
              </form>
            )
          )}
        </GlassCard>

        <GlassCard className="account-security-card">
          <div>
            <h2>Change password</h2>
            <p className="muted">Use at least 12 characters and include a symbol.</p>
          </div>
          <form className="account-security-form" onSubmit={changePassword}>
            <label>
              Current password
              <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
            <label>
              New password
              <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <GlassButton variant="primary" size="sm" type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Update password"}
            </GlassButton>
          </form>
        </GlassCard>

        <section className="account-security-stack" aria-labelledby="linked-identities-heading">
          <div>
            <h2 id="linked-identities-heading">Linked identities</h2>
            <p className="muted">Connect providers for convenient sign-in. Keep at least one identity available.</p>
          </div>
          {providers.map((provider) => {
            const identity = identities.find((item) => item.provider === provider);
            return (
              <GlassCard key={provider} className="account-security-card">
                <div className="account-identity-row">
                  <div>
                    <h3>{provider[0].toUpperCase() + provider.slice(1)}</h3>
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
        </section>
      </div>
    </SettingsLayout>
  );
}
