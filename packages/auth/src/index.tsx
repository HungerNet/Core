import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ApiClientError,
  createApiClient,
  getDomainConfig,
  resolveApiBaseUrl,
} from "@hungernet/api-client";
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

export function AuthProvider({ children, clientId }: AuthProviderProps) {
  const apiClientId = clientId === "accounts" ? undefined : clientId;
  const client = useMemo(
    () =>
      createApiClient({
        credentials: "include",
        clientId: apiClientId,
      }),
    [apiClientId],
  );

  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refresh = async () => {
    try {
      const session = await client
        .get<AuthSession>("/auth/session")
        .catch(() => null);

      if (session?.user) {
        setState({ status: "authenticated", user: mapSessionToUser(session) });
        return;
      }

      if (apiClientId) {
        const profile = await client
          .get<{
            id: string;
            display_name: string;
            avatar_url: string | null;
            permissions?: string[];
          }>("/auth/userinfo")
          .catch(() => null);
        if (profile) {
          setState({
            status: "authenticated",
            user: {
              id: profile.id,
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              status: "active",
              createdAt: new Date().toISOString(),
              permissions: profile.permissions ?? [],
            },
          });
          return;
        }
      }
      setState({ status: "unauthenticated", user: null });
    } catch {
      setState({ status: "unauthenticated", user: null });
    }
  };

  const signOut = async () => {
    if (apiClientId) client.clearAccessToken();
    try {
      await client.post("/auth/logout", {}).catch(() => undefined);
    } catch {
      // Ignore logout failures and clear UI state.
    }

    if (apiClientId) client.clearAccessToken();
    setState({ status: "unauthenticated", user: null });
  };

  useEffect(() => {
    void refresh();
  }, [client]);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3Z" />
        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H4.1v2.6A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9Z" />
        <path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 4 1.6l3-3A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6c.8-2.4 3-4.2 5.6-4.2Z" />
      </svg>
    );
  }
  if (provider === "microsoft") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#F25022" d="M2 2h9.4v9.4H2z" />
        <path fill="#7FBA00" d="M12.6 2H22v9.4h-9.4z" />
        <path fill="#00A4EF" d="M2 12.6h9.4V22H2z" />
        <path fill="#FFB900" d="M12.6 12.6H22V22h-9.4z" />
      </svg>
    );
  }
  if (provider === "github") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.3.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.8 2.4 3.8 1.7.1-.7.4-1.2.7-1.5-2.5-.3-5.2-1.2-5.2-5.5 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3 1.1a10.3 10.3 0 0 1 5.5 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.7 1.1 2.9 0 4.3-2.7 5.2-5.2 5.5.4.3.8 1 .8 2v2.9c0 .3.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M19.7 5.3a18 18 0 0 0-4.5-1.4l-.6 1.2a16.7 16.7 0 0 0-5.2 0l-.6-1.2a18 18 0 0 0-4.5 1.4C1.5 9.5.7 13.6 1.1 17.7a18 18 0 0 0 5.5 2.8l1.2-2a11.7 11.7 0 0 1-1.9-.9l.5-.4a12.8 12.8 0 0 0 11.2 0l.5.4-1.9.9 1.2 2a18 18 0 0 0 5.5-2.8c.5-4.7-.8-8.8-3.2-12.4ZM8.8 14.8c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}

export function OAuthSignIn({
  returnPath = "/",
  initialMode = "signin",
}: {
  returnPath?: string;
  initialMode?: "signin" | "register";
}) {
  const apiUrl = resolveApiBaseUrl();
  const returnTo = new URL(returnPath, window.location.origin).toString();
  const [oauthChallenge] = useState(
    () => new URLSearchParams(window.location.search).get("mfa_challenge") ?? "",
  );
  const [oauthSetupRequired] = useState(
    () => new URLSearchParams(window.location.search).get("mfa_setup") === "1",
  );
  const [providers, setProviders] = useState<string[]>([]);
  const [mode, setMode] = useState<"signin" | "register" | "setup" | "mfa">(
    initialMode,
  );
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
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
          setProviders(
            payload.providers.filter((provider): provider is string =>
              ["google", "github", "discord", "microsoft"].includes(String(provider)),
            ),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [apiUrl]);

  useEffect(() => {
    if (!oauthChallenge) return;
    if (!oauthSetupRequired) {
      setMode("mfa");
      return;
    }
    const client = createApiClient({ credentials: "include" });
    void client
      .post<{ setupSecret: string }>("/auth/mfa/challenge/setup", {
        challenge: oauthChallenge,
      })
      .then((result) => setSetupSecret(result.setupSecret))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "MFA enrollment could not be started."),
      );
  }, [oauthChallenge, oauthSetupRequired]);

  const finishSignIn = () => window.location.assign(returnTo);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const client = createApiClient({ credentials: "include" });
    try {
      if (oauthChallenge) {
        await client.post("/auth/mfa/challenge/verify", {
          challenge: oauthChallenge,
          code,
        });
        finishSignIn();
        return;
      }
      if (setupSecret) {
        await client.post("/auth/mfa/verify", {
          identifier: pendingIdentifier,
          password,
          code,
        });
        finishSignIn();
        return;
      }
      if (mode === "mfa") {
        await client.post("/auth/mfa/verify", { identifier, password, code });
        finishSignIn();
        return;
      }
      if (mode === "register") {
        await client.post("/auth/register", {
          email,
          username,
          display_name: displayName,
          password,
        });
        finishSignIn();
        return;
      }
      if (mode === "setup") {
        const result = await client.post<{ setupSecret: string }>(
          "/auth/mfa/setup",
          {
            identifier,
            password,
          },
        );
        setPendingIdentifier(identifier);
        setSetupSecret(result.setupSecret);
        setCode("");
        return;
      }
      const result = await client.post<{
        authenticated: boolean;
        mfaRequired?: boolean;
        mfaSetupRequired?: boolean;
      }>("/auth/login", { identifier, password });
      if (result.authenticated) {
        finishSignIn();
      } else if (result.mfaSetupRequired) {
        const setup = await client.post<{ setupSecret: string }>("/auth/mfa/setup", {
          identifier,
          password,
        });
        setPendingIdentifier(identifier);
        setSetupSecret(setup.setupSecret);
        setCode("");
      } else if (result.mfaRequired) {
        setMode("mfa");
        setCode("");
      }
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Authentication failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const providerLabels: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    discord: "Discord",
    microsoft: "Microsoft",
  };

  const panelTitle = setupSecret
    ? "Set up your authenticator"
    : mode === "register"
      ? "Create your account"
      : mode === "setup"
        ? "Add MFA protection"
        : mode === "mfa"
          ? "Verify your identity"
        : "Welcome back";

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        {setupSecret || mode === "mfa" ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-header">
              <span className="auth-badge">Secure sign-in</span>
              <h3 className="auth-title">{panelTitle}</h3>
              <p className="auth-subtitle">
                {setupSecret
                  ? "Add this key to your authenticator app, then confirm the six-digit code below."
                  : "Your password is verified. Enter the current six-digit authenticator code to continue."}
              </p>
            </div>
            {setupSecret && <code className="auth-token">{setupSecret}</code>}
            <div className="auth-field">
              <label htmlFor="auth-code">Authenticator code</label>
              <input
                id="auth-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <button
              className="glass-button glass-button--primary glass-button--md"
              disabled={busy}
              type="submit"
            >
              Verify and continue
            </button>
            {!oauthChallenge && (
              <button
                className="glass-button glass-button--secondary glass-button--md"
                disabled={busy}
                type="button"
                onClick={() => {
                  setError("");
                  setMode("signin");
                  setSetupSecret("");
                  setCode("");
                }}
              >
                Back to sign in
              </button>
            )}
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
                    <input
                      id="auth-email"
                      autoComplete="email"
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="auth-display-name">Display name</label>
                    <input
                      id="auth-display-name"
                      autoComplete="name"
                      maxLength={120}
                      required
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="auth-username">Username</label>
                    <input
                      id="auth-username"
                      autoComplete="username"
                      minLength={1}
                      maxLength={64}
                      pattern="[a-z0-9_]+"
                      required
                      value={username}
                      onChange={(event) =>
                        setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                    />
                    <span className="auth-hint">Lowercase letters, numbers, and underscores. A number suffix is added if needed.</span>
                  </div>
                </>
              ) : (
                <div className="auth-field">
                  <label htmlFor="auth-identifier">Email or username</label>
                  <input
                    id="auth-identifier"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  minLength={mode === "register" ? 12 : undefined}
                  maxLength={128}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {mode === "register" && (
                  <span className="auth-hint">At least 12 characters and one symbol; no case or number rules.</span>
                )}
              </div>

              <div className="auth-actions">
                <button
                  className="glass-button glass-button--primary glass-button--md"
                  disabled={busy}
                  type="submit"
                >
                  {mode === "register"
                    ? "Create account"
                    : mode === "setup" ? "Continue" : "Sign in"}
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
                <div className={`auth-provider-list auth-provider-list--${providers.length === 1 ? "full" : providers.length > 3 ? "icon" : "hybrid"}`}>
                  {providers.map((provider) => (
                    <a
                      key={provider}
                      className="auth-provider-link"
                      aria-label={`Continue with ${providerLabels[provider] ?? provider}`}
                      title={providerLabels[provider] ?? provider}
                      href={`${apiUrl}/auth/oauth/${provider}/start?redirect_to=${encodeURIComponent(returnTo)}`}
                    >
                      <ProviderIcon provider={provider} />
                      <span>{providerLabels[provider] ?? provider}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
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

function requestKey(clientId: string) {
  return `hungernet.authorization_request:${clientId}`;
}

export function resolveAccountsBaseUrl(accountsBaseUrl?: string): string {
  return accountsBaseUrl ?? getDomainConfig().accounts;
}

function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomState() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

async function beginAuthorization(
  clientId: string,
  appName: string,
  accountsBaseUrl: string,
  returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`,
) {
  const verifier =
    encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))) +
    encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const challengeBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const codeChallenge = encodeBase64Url(new Uint8Array(challengeBytes));
  const state = randomState();
  const redirectUri = new URL(
    "/auth/callback",
    window.location.origin,
  ).toString();
  sessionStorage.setItem(
    requestKey(clientId),
    JSON.stringify({ state, verifier, returnTo }),
  );
  const authorizationUrl = new URL("/authorize", accountsBaseUrl);
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    scope: "profile",
    screen_hint: "signin",
    app_name: appName,
  }).toString();
  window.location.assign(authorizationUrl.toString());
}

export function HungerNetAuthButtons({
  clientId,
  appName,
  accountsBaseUrl,
  returnTo = `${window.location.pathname}${window.location.search}`,
}: {
  clientId: string;
  appName: string;
  accountsBaseUrl?: string;
  returnTo?: string;
}) {
  const [error, setError] = useState("");
  const resolvedAccountsBaseUrl = resolveAccountsBaseUrl(accountsBaseUrl);
  const startAuthorization = async () => {
    try {
      await beginAuthorization(
        clientId,
        appName,
        resolvedAccountsBaseUrl,
        returnTo,
      );
    } catch {
      setError("Secure sign-in could not be started in this browser.");
    }
  };

  return (
    <div className="auth-redirect-actions">
      <button
        className="glass-button glass-button--primary glass-button--md"
        onClick={() => void startAuthorization()}
        type="button"
      >
        Continue with HungerNet
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProfileButton({
  clientId,
  appName,
  returnTo,
  placement = "floating",
}: {
  clientId: string;
  appName: string;
  returnTo?: string;
  placement?: "floating" | "inline";
}) {
  const { status, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const controlRef = useRef<HTMLDivElement>(null);
  const accountsUrl = resolveAccountsBaseUrl();
  const resolvedReturnTo =
    returnTo ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node))
        setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [menuOpen]);

  const handleClick = () => {
    if (status !== "loading") setMenuOpen((open) => !open);
  };

  const startSignIn = () => {
    setError("");
    void beginAuthorization(clientId, appName, accountsUrl, resolvedReturnTo).catch(() => {
      setError("Secure sign-in could not be started in this browser.");
    });
  };

  return (
    <div
      className={`profile-control profile-control--${placement} ${menuOpen ? "is-open" : ""}`}
      ref={controlRef}
    >
      <button
        className="profile-control-trigger"
        type="button"
        aria-label={
          status === "authenticated"
            ? "Open profile menu"
            : status === "loading"
              ? "Checking account"
              : "Open sign-in options"
        }
        aria-haspopup={status !== "loading" ? "menu" : undefined}
        aria-expanded={status !== "loading" ? menuOpen : undefined}
        disabled={status === "loading"}
        onClick={handleClick}
        title={status === "authenticated" ? "Profile" : "Sign in"}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          </svg>
        )}
        <span className="profile-control-trigger-label">
          {status === "authenticated" ? user?.displayName || "Profile" : "Sign in"}
        </span>
      </button>
      {status !== "loading" && (
        <div
          className="profile-control-menu"
          role="menu"
          aria-label={status === "authenticated" ? "Profile options" : "Sign-in options"}
          aria-hidden={!menuOpen}
          inert={!menuOpen}
        >
          {status === "authenticated" ? (
            <>
              <span className="profile-control-name">{user?.displayName || "My account"}</span>
              <a role="menuitem" href={new URL("/profile", accountsUrl).toString()}>
                Profile
              </a>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button role="menuitem" type="button" onClick={startSignIn}>
              Sign in
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="floating-auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FloatingAuthButton(props: {
  clientId: string;
  appName: string;
  returnTo?: string;
}) {
  return <ProfileButton {...props} />;
}

export function HungerNetAuthCallback({ clientId }: { clientId: string }) {
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
        const request = JSON.parse(savedRequest) as {
          state: string;
          verifier: string;
          returnTo: string;
        };
        if (request.state !== returnedState)
          throw new Error("Authorization state did not match.");
        if (authorizationError) {
          sessionStorage.removeItem(requestKey(clientId));
          throw new Error("You cancelled the HungerNet authorization request.");
        }
        if (!code)
          throw new Error(
            "The HungerNet authorization response is incomplete.",
          );
        const apiUrl = resolveApiBaseUrl();
        const response = await fetch(`${apiUrl}/auth/token`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            redirect_uri: new URL(
              "/auth/callback",
              window.location.origin,
            ).toString(),
            code,
            code_verifier: request.verifier,
          }),
        });
        const payload = (await response.json()) as {
          access_token?: string;
          message?: string;
        };
        if (!response.ok || !payload.access_token)
          throw new Error(
            payload.message ?? "Could not exchange the authorization code.",
          );
        sessionStorage.removeItem(requestKey(clientId));
        const destination =
          request.returnTo.startsWith("/") && !request.returnTo.startsWith("//")
            ? request.returnTo
            : "/";
        window.location.replace(destination);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not complete HungerNet authorization.",
        );
      }
    };
    void completeAuthorization();
  }, [clientId]);

  return (
    <main className="auth-callback-shell">
      <div className="loading-orb" aria-hidden="true" />
      <h1>
        {error ? "Authorization needs attention" : "Connecting to HungerNet"}
      </h1>
      <p role={error ? "alert" : "status"}>
        {error || "Finishing your secure sign-in…"}
      </p>
    </main>
  );
}
