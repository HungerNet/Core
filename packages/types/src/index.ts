export type IdentityProvider = "google" | "github" | "discord";

export type UserStatus = "active" | "disabled";

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
  permissions?: string[];
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  username?: string;
  bio?: string;
  profileVisibility?: "public" | "private";
}

export interface ProfileUpdate {
  displayName?: string;
  profileVisibility?: "public" | "private";
}

export interface LinkedIdentity {
  provider: IdentityProvider;
  linkedAt: string;
}

export interface AuthSession {
  user: PublicProfile;
  expiresAt: string;
}

export type PermissionNode = string;

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  color: string;
}

export interface EffectivePermissions {
  permissions: PermissionNode[];
}

export interface AdminAuditEvent {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
}

export interface ProjectSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  url?: string;
  status?: string;
  updatedAt?: string;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  body: string;
  status: "draft" | "published" | "archived" | string;
}

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  published_at: string;
  project_slug?: string;
}

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
}

export interface PageMetadata {
  limit: number;
  nextCursor: string | null;
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  version_number: string;
  name?: string;
  version_type?: string;
  date_published?: string;
  game_versions?: string[];
  changelog?: string | null;
  files?: Array<{ url?: string; filename?: string; size?: number }>;
}
