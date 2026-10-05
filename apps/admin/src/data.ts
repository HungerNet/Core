import type { AdminRole, AdminUser, AuditEntry, ProjectRecord } from "./types";

export const sampleUsers: AdminUser[] = [
  {
    id: "u-1",
    username: "admin",
    displayName: "Platform Admin",
    email: "admin@hungernet.dev",
    status: "active",
    roleNames: ["Platform Admin", "Moderator"],
  },
  {
    id: "u-2",
    username: "lucas",
    displayName: "Lucas Green",
    email: "lucas@hungernet.dev",
    status: "active",
    roleNames: ["Member"],
  },
  {
    id: "u-3",
    username: "maria",
    displayName: "Maria Stone",
    email: "maria@hungernet.dev",
    status: "disabled",
    roleNames: ["Member"],
  },
];

export const sampleRoles: AdminRole[] = [
  {
    id: "role-1",
    key: "platform.admin",
    name: "Platform Admin",
    description: "Owns administrative access to governance and platform tools.",
    permissionKeys: [
      "platform.admin.users.read",
      "platform.admin.users.update",
      "platform.admin.roles.manage",
      "platform.admin.audit.read",
      "platform.projects.create",
    ],
  },
  {
    id: "role-2",
    key: "platform.moderator",
    name: "Moderator",
    description: "Can review content and moderate platform actions.",
    permissionKeys: ["platform.admin.users.read", "platform.projects.create"],
  },
  {
    id: "role-3",
    key: "platform.member",
    name: "Member",
    description: "Base access for standard platform members.",
    permissionKeys: ["platform.profile.read", "platform.profile.update"],
  },
];

export const sampleAuditEntries: AuditEntry[] = [
  {
    id: "a-1",
    action: "role.assigned",
    actor: "System",
    target: "lucas",
    timestamp: "2026-10-05T10:42:00Z",
  },
  {
    id: "a-2",
    action: "user.disabled",
    actor: "Platform Admin",
    target: "maria",
    timestamp: "2026-10-05T09:18:00Z",
  },
  {
    id: "a-3",
    action: "project.published",
    actor: "lucas",
    target: "Minecraft hosting update",
    timestamp: "2026-10-05T08:00:00Z",
  },
];

export const sampleProjects: ProjectRecord[] = [
  {
    id: "p-1",
    title: "Minecraft hosting update",
    slug: "minecraft-hosting-update",
    status: "published",
    body: "We launched a new region and expanded the community support queue.",
  },
  {
    id: "p-2",
    title: "HungerNet release notes",
    slug: "hungernet-release-notes",
    status: "draft",
    body: "Draft release notes for the upcoming community release and features.",
  },
];
