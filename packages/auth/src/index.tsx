import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createApiClient } from "@hungernet/api-client";
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

export function AuthProvider({ children, apiBaseUrl = "/api/v1" }: AuthProviderProps) {
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

      if (!session?.user) {
        setState({ status: "unauthenticated", user: null });
        return;
      }

      setState({ status: "authenticated", user: mapSessionToUser(session) });
    } catch {
      setState({ status: "unauthenticated", user: null });
    }
  };

  const signOut = async () => {
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
}: {
  apiBaseUrl?: string;
  returnPath?: string;
}) {
  const apiUrl = new URL(apiBaseUrl, window.location.origin).toString().replace(/\/+$/, "");
  const returnTo = new URL(returnPath, window.location.origin).toString();
  const [providers, setProviders] = useState<string[]>([]);
  const [mode, setMode] = useState<"signin" | "register" | "setup">("signin");
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
    const client = createApiClient({ baseUrl: apiBaseUrl });
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

  return (
    <div style={{ display: "grid", gap: "1.25rem", marginTop: "1rem", maxWidth: "28rem" }}>
      {setupSecret ? (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          <h3>Set up your authenticator</h3>
          <p>Add this key to an authenticator app, then enter its six-digit code.</p>
          <code>{setupSecret}</code>
          <label>
            Authenticator code
            <input autoComplete="one-time-code" inputMode="numeric" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <button className="glass-button glass-button--primary glass-button--md" disabled={busy} type="submit">Verify and continue</button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
            <h3>{mode === "register" ? "Create an account" : mode === "setup" ? "Set up your authenticator" : "Sign in with email"}</h3>
            {mode === "register" ? (
              <>
                <label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label>Username<input autoComplete="username" minLength={3} maxLength={48} required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
              </>
            ) : (
              <label>Email or username<input autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></label>
            )}
            <label>Password<input autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : undefined} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {mode === "signin" && <label>Authenticator code<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={(event) => setCode(event.target.value)} /></label>}
            <button className="glass-button glass-button--primary glass-button--md" disabled={busy} type="submit">{mode === "register" ? "Create account" : mode === "setup" ? "Continue" : "Sign in"}</button>
            {mode === "signin" && <button className="glass-button glass-button--md" onClick={() => { setError(""); setMode("setup"); }} type="button">Set up MFA</button>}
            {mode !== "signin" && <button className="glass-button glass-button--md" onClick={() => { setError(""); setMode("signin"); }} type="button">Back to sign in</button>}
          </form>
          {providers.length > 0 && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {providers.map((provider) => (
                <a
                  key={provider}
                  className="glass-button glass-button--md"
                  href={`${apiUrl}/auth/oauth/${provider}/start?redirect_to=${encodeURIComponent(returnTo)}`}
                >
                  Continue with {provider === "github" ? "GitHub" : provider[0].toUpperCase() + provider.slice(1)}
                </a>
              ))}
            </div>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
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