import { useEffect, useState } from "react";
import { Button, GlassCard } from "@hungernet/ui";
import { OAuthSignIn, useAuth } from "@hungernet/auth";
import { createApiClient } from "@hungernet/api-client";
import { useLocation, useSearchParams } from "react-router-dom";

interface AuthorizationDetails {
  app_name: string;
  scope: string;
}

export function AuthorizationPage() {
  const { status, user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const screenHint = searchParams.get("screen_hint");
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const apiUrl = new URL(import.meta.env.VITE_API_BASE_URL || "/api/v1", window.location.origin).toString().replace(/\/+$/, "");

  useEffect(() => {
    let active = true;
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
      setError("The authorization request is incomplete or invalid.");
      setLoading(false);
      return () => { active = false; };
    }
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: "profile" });
    fetch(`${apiUrl}/auth/authorize?${params}`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json() as AuthorizationDetails & { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "This application could not be verified.");
        if (!active) return;
        setDetails(payload);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "This application could not be verified.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiUrl, clientId, redirectUri]);

  const approve = async () => {
    setBusy(true);
    setError("");
    try {
      const client = createApiClient({ baseUrl: apiUrl, credentials: "include" });
      const payload = await client.post<{ redirect_to: string }>("/auth/authorize", {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
      });
      window.location.assign(payload.redirect_to);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not authorize this application.");
      setBusy(false);
    }
  };

  const cancel = () => {
    const destination = new URL(redirectUri);
    destination.searchParams.set("error", "access_denied");
    destination.searchParams.set("state", state);
    window.location.assign(destination.toString());
  };

  return (
    <main className="authorization-page">
      <div className="accent-grid" aria-hidden="true" />
      <GlassCard className="authorization-card">
        <div className="authorization-brand"><span className="authorization-mark">H</span><span>HungerNet</span></div>
        {loading || status === "loading" ? (
          <div className="authorization-progress" role="status"><div className="loading-orb" aria-hidden="true" /><p>Checking this app…</p></div>
        ) : !details ? (
          <div className="authorization-copy">
            <span className="section-label">Request blocked</span>
            <h1>We couldn’t verify this app</h1>
            <p>{error || "The authorization request is incomplete or expired."}</p>
          </div>
        ) : !user ? (
          <div className="authorization-login">
            <div className="authorization-copy">
              <span className="section-label">Continue with HungerNet</span>
              <h1>Sign in to continue</h1>
              <p>{details.app_name} is requesting access to your HungerNet profile. Sign in or create an account to review the request.</p>
            </div>
            <OAuthSignIn
              apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"}
              returnPath={`${location.pathname}${location.search}`}
              initialMode={screenHint === "signup" ? "register" : "signin"}
            />
          </div>
        ) : (
          <>
            <div className="authorization-copy">
              <span className="section-label">Permission request</span>
              <h1>Authorize this app to use HungerNet</h1>
              <p><strong>{details.app_name}</strong> would like permission to access your account.</p>
            </div>
            <div className="authorization-account">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>}
              <div><strong>{user.displayName}</strong><small>Signed in to HungerNet</small></div>
            </div>
            <div className="authorization-scope">
              <span className="scope-icon" aria-hidden="true">01</span>
              <div><strong>View your public profile</strong><p>Username, display name, and profile picture</p></div>
            </div>
            <p className="authorization-note">Your password and authenticator code are never shared with this app.</p>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <div className="authorization-actions">
              <Button onClick={cancel} disabled={busy} variant="secondary">Cancel</Button>
              <Button onClick={() => void approve()} disabled={busy} variant="primary">{busy ? "Authorizing…" : "Authorize app"}</Button>
            </div>
          </>
        )}
      </GlassCard>
    </main>
  );
}
