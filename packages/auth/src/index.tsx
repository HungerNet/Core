import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createApiClient, resolveApiBaseUrl } from "@hungernet/api-client";
import type { AuthSession, PublicProfile, User } from "@hungernet/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
}

export interface AuthContextValue extends AuthState {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
  clientId?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSessionToUser(session: AuthSession | null): User | null {
  if (!session?.user) return null;

  const profile = session.user as PublicProfile & { permissions?: string[] };

  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
    status: "active",
    createdAt: new Date().toISOString(),
    permissions: profile.permissions ?? [],
  };
}

export function AuthProvider({ children, apiBaseUrl = "/api/v1", clientId }: AuthProviderProps) {
  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: apiBaseUrl,
        credentials: "include",
      }),
    [apiBaseUrl],
  );

  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const refresh = async () => {
    try {
      const session = await client.get<AuthSession>("/auth/session").catch(() => null);

      if (session?.user) {
        setState({ status: "authenticated", user: mapSessionToUser(session) });
        return;
      }

      const accessToken = clientId ? sessionStorage.getItem(accessTokenKey(clientId)) : null;
      if (clientId && accessToken) {
        const apiUrl = resolveApiBaseUrl(apiBaseUrl);
        const response = await fetch(`${apiUrl}/auth/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const profile = await response.json() as {
            id: string;
            display_name: string;
            avatar_url: string | null;
          };
          setState({
            status: "authenticated",
            user: {
              id: profile.id,
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              status: "active",
              createdAt: new Date().toISOString(),
              permissions: [],
            },
          });
          return;
        }
        sessionStorage.removeItem(accessTokenKey(clientId));
      }
      setState({ status: "unauthenticated", user: null });
    } catch {
      setState({ status: "unauthenticated", user: null });
    }
  };

  const signOut = async () => {
    if (clientId) sessionStorage.removeItem(accessTokenKey(clientId));
    try {
      await client.post("/auth/logout", {}).catch(() => undefined);
    } catch {
      // Ignore logout failures and clear UI state.
    }

    setState({ status: "unauthenticated", user: null });
  };

  useEffect(() => {
    void refresh();
  }, [client]);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function OAuthSignIn({
  apiBaseUrl = "/api/v1",
  returnPath = "/",
  initialMode = "signin",
}: {
  apiBaseUrl?: string;
  returnPath?: string;
  initialMode?: "signin" | "register";
}) {
  const apiUrl = resolveApiBaseUrl(apiBaseUrl);
  const returnTo = new URL(returnPath, window.location.origin).toString();
  const [providers, setProviders] = useState<string[]>([]);
  const [mode, setMode] = useState<"signin" | "register" | "setup">(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [pendingIdentifier, setPendingIdentifier] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/auth/providers`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { providers?: unknown } | null) => {
        if (active && Array.isArray(payload?.providers)) {
          setProviders(payload.providers.filter((provider): provider is string =>
            ["google", "github", "discord"].includes(String(provider)),
          ));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [apiUrl]);

  const finishSignIn = () => window.location.assign(returnTo);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const client = createApiClient({ baseUrl: apiBaseUrl, credentials: "include" });
    try {
      if (setupSecret) {
        await client.post("/auth/mfa/verify", {
          identifier: pendingIdentifier,
          password,
          code,
        });
        finishSignIn();
        return;
      }
      if (mode === "register") {
        const result = await client.post<{ setupSecret: string }>("/auth/register", {
          email,
          username,
          password,
        });
        setPendingIdentifier(email);
        setSetupSecret(result.setupSecret);
        setCode("");
        return;
      }
      if (mode === "setup") {
        const result = await client.post<{ setupSecret: string }>("/auth/mfa/setup", {
          identifier,
          password,
        });
        setPendingIdentifier(identifier);
        setSetupSecret(result.setupSecret);
        setCode("");
        return;
      }
      await client.post("/auth/login", { identifier, password, code });
      finishSignIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const providerLabels: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    discord: "Discord",
  };

  const panelTitle =
    setupSecret ? "Set up your authenticator" :
    mode === "register" ? "Create your account" :
    mode === "setup" ? "Add MFA protection" :
    "Welcome back";

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        {setupSecret ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-header">
              <span className="auth-badge">Secure sign-in</span>
              <h3 className="auth-title">{panelTitle}</h3>
            </div>
            <p className="auth-subtitle">Add this key to your authenticator app, then confirm the six-digit code below.</p>
            <code className="auth-token">{setupSecret}</code>
            <div className="auth-field">
              <label htmlFor="auth-code">Authenticator code</label>
              <input id="auth-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <button className="glass-button glass-button--primary glass-button--md" disabled={busy} type="submit">Verify and continue</button>
          </form>
        ) : (
          <>
            <div className="auth-header">
              <span className="auth-badge">HungerNet</span>
              <h3 className="auth-title">{panelTitle}</h3>
              <p className="auth-subtitle">
                {mode === "register"
                  ? "Create a first-party account and secure it with an authenticator app."
                  : mode === "setup"
                    ? "Verify your existing password and generate an MFA secret."
                    : "Use your email, username, or one of the supported sign-in providers."}
              </p>
            </div>

            <div className="auth-toggle-row" style={{ marginBottom: "1rem" }}>
              {[
                { value: "signin", label: "Sign in" },
                { value: "register", label: "Create account" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`auth-toggle ${mode === option.value ? "is-active" : ""}`}
                  onClick={() => {
                    setError("");
                    setMode(option.value as "signin" | "register");
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === "register" ? (
                <>
                  <div className="auth-field">
                    <label htmlFor="auth-email">Email</label>
                    <input id="auth-email" autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="auth-username">Username</label>
                    <input id="auth-username" autoComplete="username" minLength={3} maxLength={48} required value={username} onChange={(event) => setUsername(event.target.value)} />
                  </div>
                </>
              ) : (
                <div className="auth-field">
                  <label htmlFor="auth-identifier">Email or username</label>
                  <input id="auth-identifier" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={mode === "register" ? 12 : undefined}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {mode === "signin" && (
                <div className="auth-field">
                  <label htmlFor="auth-code">Authenticator code</label>
                  <input id="auth-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={(event) => setCode(event.target.value)} />
                </div>
              )}

              <div className="auth-actions">
                <button className="glass-button glass-button--primary glass-button--md" disabled={busy} type="submit">
                  {mode === "register" ? "Create account" : mode === "setup" ? "Continue" : "Sign in"}
                </button>
                {mode === "signin" && (
                  <button
                    className="glass-button glass-button--secondary glass-button--md"
                    onClick={() => {
                      setError("");
                      setMode("setup");
                    }}
                    type="button"
                  >
                    Set up MFA
                  </button>
                )}
                {mode !== "signin" && (
                  <button
                    className="glass-button glass-button--secondary glass-button--md"
                    onClick={() => {
                      setError("");
                      setMode("signin");
                    }}
                    type="button"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </form>

            {providers.length > 0 && (
              <>
                <div className="auth-divider">Or continue with</div>
                <div className="auth-provider-list">
                  {providers.map((provider) => (
                    <a
                      key={provider}
                      className="auth-provider-link"
                      href={`${apiUrl}/auth/oauth/${provider}/start?redirect_to=${encodeURIComponent(returnTo)}`}
                    >
                      {providerLabels[provider] ?? provider}
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

export function RequireAuth({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { status, user } = useAuth();

  if (status === "loading") return <>{fallback}</>;
  if (!user) return <>{fallback}</>;

  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];

  if (!permissions.includes(permission)) return <>{fallback}</>;

  return <>{children}</>;
}

function accessTokenKey(clientId: string) {
  return `hungernet.access_token:${clientId}`;
}

function requestKey(clientId: string) {
  return `hungernet.authorization_request:${clientId}`;
}

function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomState() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function HungerNetAuthButtons({
  clientId,
  appName,
  accountsBaseUrl = window.location.hostname === "localhost"
    ? "http://localhost:4174"
    : "https://accounts.hungernet.dev",
  returnTo = `${window.location.pathname}${window.location.search}`,
}: {
  clientId: string;
  appName: string;
  accountsBaseUrl?: string;
  returnTo?: string;
}) {
  const [error, setError] = useState("");
  const startAuthorization = async (screenHint: "signin" | "signup") => {
    try {
      const verifier = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))) + encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)));
      const challengeBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
      const codeChallenge = encodeBase64Url(new Uint8Array(challengeBytes));
      const state = randomState();
      const redirectUri = new URL("/auth/callback", window.location.origin).toString();
      sessionStorage.setItem(requestKey(clientId), JSON.stringify({ state, verifier, returnTo }));
      const authorizationUrl = new URL("/authorize", accountsBaseUrl);
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        scope: "profile",
        screen_hint: screenHint,
        app_name: appName,
      }).toString();
      window.location.assign(authorizationUrl.toString());
    } catch {
      setError("Secure sign-in could not be started in this browser.");
    }
  };

  return (
    <div className="auth-redirect-actions">
      <button className="glass-button glass-button--primary glass-button--md" onClick={() => void startAuthorization("signin")} type="button">
        Sign in with HungerNet
      </button>
      <button className="glass-button glass-button--secondary glass-button--md" onClick={() => void startAuthorization("signup")} type="button">
        Sign up with HungerNet
      </button>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}

export function HungerNetAuthCallback({
  clientId,
  apiBaseUrl = "/api/v1",
}: {
  clientId: string;
  apiBaseUrl?: string;
}) {
  const [error, setError] = useState("");

  useEffect(() => {
    const completeAuthorization = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const returnedState = params.get("state");
      const authorizationError = params.get("error");
      const savedRequest = sessionStorage.getItem(requestKey(clientId));
      if (!returnedState || !savedRequest) {
        setError("The HungerNet authorization response is incomplete.");
        return;
      }
      try {
        const request = JSON.parse(savedRequest) as { state: string; verifier: string; returnTo: string };
        if (request.state !== returnedState) throw new Error("Authorization state did not match.");
        if (authorizationError) {
          sessionStorage.removeItem(requestKey(clientId));
          throw new Error("You cancelled the HungerNet authorization request.");
        }
        if (!code) throw new Error("The HungerNet authorization response is incomplete.");
        const apiUrl = resolveApiBaseUrl(apiBaseUrl);
        const response = await fetch(`${apiUrl}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            redirect_uri: new URL("/auth/callback", window.location.origin).toString(),
            code,
            code_verifier: request.verifier,
          }),
        });
        const payload = await response.json() as { access_token?: string; message?: string };
        if (!response.ok || !payload.access_token) throw new Error(payload.message ?? "Could not exchange the authorization code.");
        sessionStorage.setItem(accessTokenKey(clientId), payload.access_token);
        sessionStorage.removeItem(requestKey(clientId));
        const destination = request.returnTo.startsWith("/") && !request.returnTo.startsWith("//") ? request.returnTo : "/";
        window.location.replace(destination);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not complete HungerNet authorization.");
      }
    };
    void completeAuthorization();
  }, [apiBaseUrl, clientId]);

  return (
    <main className="auth-callback-shell">
      <div className="loading-orb" aria-hidden="true" />
      <h1>{error ? "Authorization needs attention" : "Connecting to HungerNet"}</h1>
      <p role={error ? "alert" : "status"}>{error || "Finishing your secure sign-in…"}</p>
    </main>
  );
}