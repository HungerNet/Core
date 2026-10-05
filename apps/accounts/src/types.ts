export interface AccountProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  publicProfileUrl: string;
}

export interface LinkedIdentity {
  provider: "google" | "github" | "discord";
  connected: boolean;
  username?: string;
  email?: string;
}

export interface SessionDevice {
  id: string;
  label: string;
  lastSeen: string;
  current: boolean;
}
