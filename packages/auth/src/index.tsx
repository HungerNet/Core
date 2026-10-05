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
  const providers = ["google", "github", "discord"] as const;

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
      {providers.map((provider) => (
        <a
          key={provider}
          className="glass-button glass-button--primary glass-button--md"
          href={`${apiUrl}/auth/oauth/${provider}/start?redirect_to=${encodeURIComponent(returnTo)}`}
        >
          Continue with {provider === "github" ? "GitHub" : provider[0].toUpperCase() + provider.slice(1)}
        </a>
      ))}
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